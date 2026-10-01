-- Roles de Supabase y stub de pg_cron
do $$ begin
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
exception when duplicate_object then null; end $$;
create schema if not exists cron;
create table cron.job (jobid serial primary key, jobname text unique, schedule text, command text);
create function cron.schedule(p_name text, p_sched text, p_cmd text) returns bigint language sql as
 $$ insert into cron.job(jobname,schedule,command) values (p_name,p_sched,p_cmd) on conflict (jobname) do update set schedule=excluded.schedule, command=excluded.command returning jobid::bigint $$;
create function cron.unschedule(p_name text) returns boolean language plpgsql as
 $$ begin delete from cron.job where jobname=p_name; if not found then raise exception 'could not find valid entry for job %', p_name; end if; return true; end $$;
select cron.schedule('check-overdue-users','0 0 * * *','SELECT check_overdue_users();');
select cron.schedule('generate-daily-invoices','5 0 * * *','SELECT generate_daily_invoices();');

-- === Funciones/ triggers desplegados HOY en producción ===
CREATE OR REPLACE FUNCTION public.create_initial_invoice(p_user_id uuid, p_plan_id uuid) RETURNS void LANGUAGE plpgsql AS $f$
DECLARE p RECORD; next_num INT; due_date DATE;
BEGIN
  SELECT * INTO p FROM plans WHERE id = p_plan_id;
  IF p IS NULL OR p.price IS NULL OR p.price <= 0 THEN RETURN; END IF;
  due_date := date_trunc('month', CURRENT_DATE)::date;
  SELECT COALESCE(MAX((substring(invoice_number FROM 'FAC-\d{4}-(\d+)'))::int), 0) + 1 INTO next_num FROM invoices WHERE invoice_number LIKE 'FAC-' || to_char(CURRENT_DATE, 'YYYY') || '-%';
  INSERT INTO invoices (user_id, plan_id, invoice_number, concept, amount, due_date, status)
  VALUES (p_user_id, p_plan_id, 'FAC-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(next_num::text, 4, '0'), p.name || ' - ' || to_char(due_date, 'Month YYYY'), p.price, due_date, 'Pendiente') ON CONFLICT DO NOTHING;
  UPDATE users SET next_payment = (date_trunc('month', CURRENT_DATE)::date + interval '1 month'), paid_until = NULL WHERE id = p_user_id;
END; $f$;
CREATE OR REPLACE FUNCTION public.generate_daily_invoices() RETURNS void LANGUAGE plpgsql AS $f$ BEGIN NULL; END; $f$;
CREATE OR REPLACE FUNCTION public.check_overdue_users() RETURNS void LANGUAGE plpgsql AS $f$ BEGIN NULL; END; $f$;
CREATE OR REPLACE FUNCTION public.pay_advance_months(p_user_id uuid, p_months integer, p_method text, p_reference text) RETURNS void LANGUAGE plpgsql AS $f$ BEGIN NULL; END; $f$;
CREATE OR REPLACE FUNCTION public.auto_create_plan_invoice() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $f$
DECLARE v_plan plans%ROWTYPE; v_existing_id UUID;
BEGIN
  IF NEW.plan_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.plan_id IS NOT DISTINCT FROM NEW.plan_id THEN RETURN NEW; END IF;
  SELECT * INTO v_plan FROM plans WHERE id = NEW.plan_id; IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT id INTO v_existing_id FROM invoices WHERE user_id = NEW.id AND plan_id = NEW.plan_id AND status = 'Pendiente' LIMIT 1;
  IF v_existing_id IS NOT NULL THEN RETURN NEW; END IF;
  INSERT INTO invoices (user_id, plan_id, invoice_number, amount, due_date, status, concept) VALUES (NEW.id, NEW.plan_id, generate_invoice_number(), v_plan.price, COALESCE(NEW.next_payment, NOW()), 'Pendiente', v_plan.name);
  RETURN NEW;
END; $f$;
CREATE OR REPLACE FUNCTION public.trigger_create_initial_invoice() RETURNS trigger LANGUAGE plpgsql AS $f$
BEGIN IF NEW.plan_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.plan_id IS NULL OR OLD.plan_id != NEW.plan_id) THEN PERFORM create_initial_invoice(NEW.id, NEW.plan_id); END IF; RETURN NEW; END; $f$;
CREATE OR REPLACE FUNCTION public.reset_user_billing(p_user_id uuid) RETURNS void LANGUAGE plpgsql AS $f$ BEGIN NULL; END; $f$;
CREATE OR REPLACE FUNCTION public.trigger_reset_billing_on_reactivate() RETURNS trigger LANGUAGE plpgsql AS $f$
BEGIN IF OLD.status = 'Inactivo' AND NEW.status = 'Activo' THEN PERFORM reset_user_billing(NEW.id); END IF; RETURN NEW; END; $f$;
CREATE OR REPLACE FUNCTION public.trigger_stop_billing_on_plan_deactivate() RETURNS trigger LANGUAGE plpgsql AS $f$
BEGIN IF OLD.is_active = true AND NEW.is_active = false THEN DELETE FROM invoices WHERE plan_id = NEW.id AND status = 'Pendiente'; END IF; RETURN NEW; END; $f$;
CREATE TRIGGER trg_auto_create_plan_invoice AFTER INSERT OR UPDATE ON users FOR EACH ROW EXECUTE FUNCTION auto_create_plan_invoice();
CREATE TRIGGER trigger_user_plan_change AFTER UPDATE OF plan_id ON users FOR EACH ROW EXECUTE FUNCTION trigger_create_initial_invoice();
CREATE TRIGGER trigger_user_plan_change_insert AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION trigger_create_initial_invoice();
CREATE TRIGGER trigger_user_reactivate_billing AFTER UPDATE OF status ON users FOR EACH ROW EXECUTE FUNCTION trigger_reset_billing_on_reactivate();
CREATE TRIGGER trigger_plan_deactivate_billing AFTER UPDATE OF is_active ON plans FOR EACH ROW EXECUTE FUNCTION trigger_stop_billing_on_plan_deactivate();

-- === Estado actual del usuario de prueba (copiado de producción) ===
insert into plans (id,name,duration_days,price,type,description) values ('ed323c13-a3e7-47c1-99dd-42d011986d6d','Premium Plus',30,20,'Mensual','PLAN UNICO MENSUAL');
alter table users disable trigger user;  -- no disparar triggers al sembrar
insert into users (id,member_number,name,email,status,plan_id,is_free_user,next_payment,paid_until,start_date) values ('21d4d918-76a2-44ea-a1fd-d19b81d0bb52','GYM-001','Johan Brito','j@x.com','Activo','ed323c13-a3e7-47c1-99dd-42d011986d6d',true,'2026-10-01','2026-11-01','2026-07-18');
insert into invoices (invoice_number,user_id,plan_id,amount,due_date,status,concept) values
 ('FAC-2026-0050','21d4d918-76a2-44ea-a1fd-d19b81d0bb52','ed323c13-a3e7-47c1-99dd-42d011986d6d',20,'2026-10-01','Pendiente','Premium Plus - October   2026'),
 ('FAC-2026-0051','21d4d918-76a2-44ea-a1fd-d19b81d0bb52','ed323c13-a3e7-47c1-99dd-42d011986d6d',20,'2026-10-31','Pendiente','Premium Plus - October   2026');
alter table users enable trigger user;
select setval('invoice_number_seq', 50);
