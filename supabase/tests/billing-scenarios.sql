-- Reloj simulado (SOLO para pruebas; no forma parte de la migración)
create table test_clock(d date);
insert into test_clock values ('2026-10-01');
create or replace function billing_now() returns timestamp language sql stable as $$ select (select d from test_clock)::timestamp + time '10:00' $$;
create or replace function setclock(p date) returns void language sql as $$ update test_clock set d = p $$;

create or replace function ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond then raise notice 'PASS  %', msg; else raise exception 'FAIL  %', msg; end if; end $$;

insert into plans (id,name,duration_days,price,type) values
 ('aaaaaaaa-0000-0000-0000-000000000001','Mensual 20',30,20,'Mensual'),
 ('aaaaaaaa-0000-0000-0000-000000000002','Trimestral 50',90,50,'Trimestral'),
 ('aaaaaaaa-0000-0000-0000-000000000003','Mensual 30',30,30,'Mensual'),
 ('aaaaaaaa-0000-0000-0000-000000000004','Visita',1,5,'Visita');

-- Datos de usuarios de prueba
insert into users (id,member_number,name,email,status) values
 ('bbbbbbbb-0000-0000-0000-00000000000a','T-A','Ana','a@x','Activo'),
 ('bbbbbbbb-0000-0000-0000-00000000000b','T-B','Beto','b@x','Activo'),
 ('bbbbbbbb-0000-0000-0000-00000000000c','T-C','Carla','c@x','Activo'),
 ('bbbbbbbb-0000-0000-0000-00000000000d','T-D','Dario','d@x','Activo'),
 ('bbbbbbbb-0000-0000-0000-00000000000e','T-E','Eva (gratis)','e@x','Activo'),
 ('bbbbbbbb-0000-0000-0000-00000000000f','T-F','Fede','f@x','Inactivo'),
 ('bbbbbbbb-0000-0000-0000-000000000010','T-G','Gina','g@x','Activo');
update users set is_free_user=true where name like 'Eva%';

-- T1: alta con plan => UNA sola factura (antes: 2-3 duplicadas), concepto en español, sin espacios extra
update users set plan_id='aaaaaaaa-0000-0000-0000-000000000001' where name='Ana';
select ok((select count(*) from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000a')=1, 'T1 alta con plan genera 1 sola factura');
select ok((select concept from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000a')='Mensual 20 - Octubre 2026', 'T1 concepto en español sin relleno');
select ok((select due_date from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000a')='2026-10-01', 'T1 vence el día 1');
select ok((select next_payment from users where name='Ana')='2026-10-01', 'T1 next_payment = vencimiento de la factura impaga');

-- T2: pago => payment enlazado, next_payment = 1-nov, paid_until = 1-oct
select pay_invoice((select id from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000a'), 'Pago Móvil', 'REF1');
select ok((select count(*) from payments where user_id='bbbbbbbb-0000-0000-0000-00000000000a')=1, 'T2 pago con "Pago Móvil" registrado en payments (antes fallaba en silencio)');
select ok((select payment_id is not null from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000a'), 'T2 factura enlazada a su pago');
select ok((select next_payment from users where name='Ana')='2026-11-01', 'T2 next_payment = 1-nov (no 31-oct)');
select ok((select paid_until from users where name='Ana')='2026-10-01', 'T2 paid_until = último periodo pagado');

-- T3: doble click / doble pago => error, sin pago duplicado
do $$ begin
  begin perform pay_invoice((select id from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000a'),'Efectivo'); raise exception 'no debió pagar';
  exception when others then if sqlerrm like '%ya está pagada%' then raise notice 'PASS  T3 segundo pago rechazado'; else raise; end if; end;
end $$;
select ok((select count(*) from payments where user_id='bbbbbbbb-0000-0000-0000-00000000000a')=1, 'T3 sigue habiendo 1 solo pago');

-- T4: el mismo día corre el cron: no se genera nada nuevo ni se pierde next_payment (bug: quedaba NULL)
select run_daily_billing();
select ok((select count(*) from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000a')=1, 'T4 cron el mismo día no duplica');
select ok((select next_payment from users where name='Ana') is not null, 'T4 next_payment NO queda NULL tras pagar');

-- T5: llega noviembre => la facturación recurrente CONTINÚA tras haber pagado
select setclock('2026-11-01'); select run_daily_billing();
select ok((select count(*) from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000a')=2, 'T5 el 1-nov se genera la factura de noviembre');
select ok((select max(due_date) from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000a')='2026-11-01', 'T5 vence 1-nov (sin desfase de 30 días)');
select ok((select status from users where name='Ana')='Activo', 'T5 sigue Activo (pagó octubre)');
select run_daily_billing();
select ok((select count(*) from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000a')=2, 'T5 idempotente: correr el cron 2 veces no duplica');

-- T6: no paga noviembre => 3-dic: Vencida (UNA sola, sin copia), suspendido, sin factura de diciembre
select setclock('2026-11-02'); select run_daily_billing();
select ok((select count(*) filter (where status='Vencida') from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000a')=1, 'T6 Pendiente pasa a Vencida (no se inserta copia)');
select ok((select count(*) from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000a' and due_date='2026-11-01')=1, 'T6 una sola factura para noviembre');
select ok((select status from users where name='Ana')='Suspendido', 'T6 usuario suspendido');
select setclock('2026-12-03'); select run_daily_billing();
select ok((select count(*) from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000a')=2, 'T6 suspendido no acumula facturas nuevas');

-- T7: paga la vencida => se reactiva y se factura el mes actual (diciembre)
select pay_invoice((select id from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000a' and status='Vencida'), 'Efectivo');
select ok((select status from users where name='Ana')='Activo', 'T7 se reactiva al saldar lo vencido');
select ok((select count(*) from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000a' and due_date='2026-12-01' and status='Pendiente')=1, 'T7 se factura diciembre (no se cobra el periodo suspendido)');
select ok((select next_payment from users where name='Ana')='2026-12-01', 'T7 next_payment = 1-dic');

-- T8: pago adelantado de 3 meses con UNA sola pendiente => paga 1 existente y CREA 2 (antes pagaba 1 y avisaba "3")
select setclock('2026-10-01');
update users set plan_id='aaaaaaaa-0000-0000-0000-000000000001' where name='Beto';
select ok((select count(*) from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000b')=1, 'T8 Beto parte con 1 pendiente');
select ok((select (pay_advance_months('bbbbbbbb-0000-0000-0000-00000000000b',3,'Transferencia','TR-99'))->>'paid')::int=3, 'T8 pago adelantado devuelve paid=3');
select ok((select count(*) from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000b' and status='Pagada')=3, 'T8 3 facturas Pagadas');
select ok((select array_agg(to_char(due_date,'YYYY-MM-DD') order by due_date) from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000b')=array['2026-10-01','2026-11-01','2026-12-01'], 'T8 octubre, noviembre y diciembre (3 meses calendario distintos)');
select ok((select count(*) from payments where user_id='bbbbbbbb-0000-0000-0000-00000000000b')=3, 'T8 3 pagos en payments (ahora cuentan en estadísticas)');
select ok((select paid_until from users where name='Beto')='2026-12-01', 'T8 paid_until = 1-dic');
select ok((select next_payment from users where name='Beto')='2027-01-01', 'T8 next_payment = 1-ene (no NULL)');
-- y el cron NO factura periodos ya pagados
select setclock('2026-11-15'); select run_daily_billing();
select setclock('2026-12-20'); select run_daily_billing();
select ok((select count(*) from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000b')=3, 'T8 cron no re-factura el periodo prepagado');
select setclock('2027-01-01'); select run_daily_billing();
select ok((select count(*) from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000b' and due_date='2027-01-01' and status='Pendiente')=1, 'T8 al terminar el adelanto, aparece enero');
select ok((select status from users where name='Beto')='Activo', 'T8 sigue Activo durante el adelanto');

-- T9: plan trimestral = 3 meses calendario
select setclock('2026-10-01');
update users set plan_id='aaaaaaaa-0000-0000-0000-000000000002' where name='Carla';
select pay_invoice((select id from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000c'),'Tarjeta');
select ok((select next_payment from users where name='Carla')='2027-01-01', 'T9 trimestral: siguiente vencimiento 1-ene');

-- T10: cambio de plan a mitad de mes => reemplaza la pendiente, una sola factura del mes
update users set plan_id='aaaaaaaa-0000-0000-0000-000000000001' where name='Dario';
update users set plan_id='aaaaaaaa-0000-0000-0000-000000000003' where name='Dario';
select ok((select count(*) from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000d')=1, 'T10 cambio de plan: una sola factura del mes');
select ok((select amount from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000d')=30, 'T10 la factura es del plan nuevo');
-- si el mes ya estaba pagado con el plan anterior, el cambio no cobra dos veces
update users set plan_id='aaaaaaaa-0000-0000-0000-000000000001' where name='Gina';
select pay_invoice((select id from invoices where user_id='bbbbbbbb-0000-0000-0000-000000000010'),'Efectivo');
update users set plan_id='aaaaaaaa-0000-0000-0000-000000000003' where name='Gina';
select ok((select count(*) from invoices where user_id='bbbbbbbb-0000-0000-0000-000000000010' and due_date='2026-10-01')=1, 'T10 mes ya pagado: el cambio de plan no cobra otra vez');

-- T11: usuario gratuito => sin facturas ni suspensión
update users set plan_id='aaaaaaaa-0000-0000-0000-000000000001' where name like 'Eva%';
select setclock('2026-12-10'); select run_daily_billing();
select ok((select count(*) from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000e')=0, 'T11 usuario gratuito: 0 facturas');
select ok((select status from users where name like 'Eva%')='Activo', 'T11 usuario gratuito no se suspende');

-- T12: reactivación Inactivo -> Activo: se resetea y se factura el mes actual
select setclock('2026-10-01');
update users set plan_id='aaaaaaaa-0000-0000-0000-000000000001' where name='Fede';   -- inactivo: no factura
select ok((select count(*) from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000f')=0, 'T12 usuario Inactivo no se factura');
update users set status='Activo' where name='Fede';
select ok((select count(*) from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000f' and status='Pendiente')=1, 'T12 al reactivar se factura el mes actual');

-- T13: borrar una factura pagada => se borra su pago y se recalculan las fechas (antes: pagos huérfanos y fechas falsas)
select setclock('2026-10-01');
delete from invoices where user_id='bbbbbbbb-0000-0000-0000-000000000010' and status='Pagada';
select ok((select count(*) from payments where user_id='bbbbbbbb-0000-0000-0000-000000000010')=0, 'T13 borrar factura pagada elimina su pago (no quedan huérfanos)');
select ok((select paid_until from users where name='Gina') is null, 'T13 paid_until recalculado tras borrar');

-- T14: pago con fecha pasada (UserDetail) y método inválido
select pay_invoice((select id from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000f'),'Efectivo',null,null,'2026-09-28 15:00');
select ok((select date::date from payments where user_id='bbbbbbbb-0000-0000-0000-00000000000f')='2026-09-28', 'T14 pago con fecha personalizada');
do $$ begin
  begin perform pay_invoice((select id from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000d'),'Bitcoin'); raise exception 'no debió aceptar';
  exception when check_violation then raise notice 'PASS  T14 método inválido rechazado y revertido'; end;
end $$;
select ok((select status from invoices where user_id='bbbbbbbb-0000-0000-0000-00000000000d')<>'Pagada' and (select count(*) from payments where user_id='bbbbbbbb-0000-0000-0000-00000000000d')=0, 'T14 tras el error la factura NO quedó pagada y no hay pago (transaccional)');

-- T15: numeración sin colisiones (secuencia única)
select ok((select count(distinct invoice_number)=count(*) from invoices), 'T15 todos los números de factura son únicos');
select ok(generate_invoice_number() <> all (select invoice_number from invoices), 'T15 el siguiente número no choca con uno existente');

-- T16: plan "Visita" = una sola factura
update users set plan_id='aaaaaaaa-0000-0000-0000-000000000004' where name='Gina';
select setclock('2026-11-20'); select run_daily_billing();
select ok((select count(*) from invoices where user_id='bbbbbbbb-0000-0000-0000-000000000010' and plan_id='aaaaaaaa-0000-0000-0000-000000000004')=1, 'T16 plan Visita no es recurrente');
