# Pruebas de la migración de facturación (34)

Se ejecutan en un PostgreSQL **local** (no en Supabase), con un reloj simulado:

```bash
createdb gymtest
psql -v ON_ERROR_STOP=1 -d gymtest -f supabase/tests/00-mirror-schema.sql      # tablas (sin RLS)
psql -v ON_ERROR_STOP=1 -d gymtest -f supabase/tests/01-legacy-prod-state.sql  # funciones/triggers y datos desplegados antes de la migración + stub de pg_cron
psql -v ON_ERROR_STOP=1 -d gymtest -f supabase/migrations/34-billing-fixes.sql
psql -d gymtest -f supabase/tests/billing-scenarios.sql                        # 49 comprobaciones; imprime PASS/FAIL
psql -d gymtest -f supabase/tests/billing-privileges.sql                       # 9 comprobaciones con los roles authenticated / anon (ejecutar después)
```

`billing-scenarios.sql` sobrescribe `billing_now()` solo en la base de pruebas para recorrer meses.
No es re-ejecutable sobre la misma base: recrearla con `dropdb/createdb`.
