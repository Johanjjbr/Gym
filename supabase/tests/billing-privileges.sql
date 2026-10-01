-- Permisos con los roles reales de Supabase (ejecutar DESPUÉS de billing-scenarios.sql).
-- Reproduce lo que hace el frontend: staff = rol authenticated; el rol anon no debe poder nada.
grant usage on schema public to authenticated, anon;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant execute on function generate_invoice_number() to authenticated, anon;

create or replace function ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond then raise notice 'PASS  %', msg; else raise exception 'FAIL  %', msg; end if; end $$;

select setclock('2026-10-01');
insert into users (id,member_number,name,email,status,plan_id) values
 ('cccccccc-0000-0000-0000-000000000001','P-1','Priv Uno','p1@x','Inactivo','aaaaaaaa-0000-0000-0000-000000000001');

set role authenticated;
-- reactivar un socio (dispara trigger_reset_billing_on_reactivate -> reset_user_billing)
update users set status='Activo' where name='Priv Uno';
select ok((select count(*) from invoices where user_id='cccccccc-0000-0000-0000-000000000001' and status='Pendiente')=1, 'PRIV staff puede reactivar un socio (antes: permission denied)');
-- insertar factura sin invoice_number (default de la base)
insert into invoices (user_id, plan_id, amount, due_date, concept) values ('cccccccc-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',20,'2026-09-01','manual');
select ok((select invoice_number from invoices where concept='manual') like 'FAC-%', 'PRIV staff inserta factura y la base asigna el número');
select pay_invoice((select id from invoices where concept='manual'),'Pago Móvil');
select ok((select status from invoices where concept='manual')='Pagada', 'PRIV staff paga factura');
select ok((pay_advance_months('cccccccc-0000-0000-0000-000000000001',2,'Efectivo')->>'paid')::int=2, 'PRIV staff hace pago adelantado');
select ok((run_daily_billing()->>'generated_invoices') is not null, 'PRIV staff ejecuta facturación manual');
delete from invoices where concept='manual';
select ok(not exists (select 1 from invoices where concept='manual'), 'PRIV staff borra factura');
reset role;

set role anon;
do $$ begin
  begin perform run_daily_billing(); raise exception 'anon pudo ejecutar run_daily_billing';
  exception when insufficient_privilege then raise notice 'PASS  PRIV anon NO puede ejecutar run_daily_billing'; end;
  begin perform pay_invoice(gen_random_uuid(),'Efectivo'); raise exception 'anon pudo ejecutar pay_invoice';
  exception when insufficient_privilege then raise notice 'PASS  PRIV anon NO puede ejecutar pay_invoice'; end;
  begin perform pay_advance_months(gen_random_uuid(),1,'Efectivo'); raise exception 'anon pudo ejecutar pay_advance_months';
  exception when insufficient_privilege then raise notice 'PASS  PRIV anon NO puede ejecutar pay_advance_months'; end;
end $$;
reset role;
