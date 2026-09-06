# Fase 4 — confirmación y skip persistentes

Fecha: 2026-09-05  
Estado: **cerrada en local; deploy manual de Render pendiente**

## Alcance

El wizard dejó de ser una transición local. La revisión ahora puede terminar
en una mutación explícita sobre el tenant autenticado:

- `GET /api/v1/onboarding` devuelve estado y workspace sanitizados.
- `POST /api/v1/onboarding/complete` valida `onboarding.v1`, exige nombre,
  actividad, confirmación y `Idempotency-Key`, y persiste business/inventory.
- `POST /api/v1/onboarding/skip` exige confirmación, no llama a ningún modelo y
  copia el fixture sintético Atlas a un snapshot playground aislado.
- `bootstrap` comunica `empty`, `onboarding` o `synthetic-fixture` para que el
  navegador no vuelva a abrir el wizard después de una decisión.

## Verificación automatizada

Ejecutada desde `C:\Noe\noah-nvidia`:

```text
uv run --python 3.12 --with-requirements services/api/requirements-dev.txt python -m pytest -q
48 passed, 1 warning

apps/web: npm run test
2 files / 6 tests passed

apps/web: npm run typecheck
OK

apps/web: npm run lint
OK

apps/web: npm run build
OK

git diff --check
OK
```

Las pruebas nuevas cubren estado vacío, confirmación idempotente, payload
reutilizado con la misma clave, bloqueo de una segunda finalización, skip sin
proveedor, copia tenant-safe del fixture y aislamiento del demo. También se
comprueba que un payload incompleto no escribe business ni inventory.

## Seguridad y persistencia

- La copia del fixture se construye en un snapshot temporal y remapea cada
  `tenant_id`; nunca se inserta ese snapshot temporal en `TENANTS`.
- El `Idempotency-Key` queda dentro del snapshot del mismo tenant y permite
  repetir una respuesta sin duplicar servicios, acciones o inventario.
- La auditoría guarda solo decisión, fuente, versión y cantidad de items; no
  guarda el texto libre, prompts, claves ni respuestas privadas del modelo.
- Neon sigue siendo el único almacenamiento durable activo; no se agregó
  Supabase ni se mezcló la base Render legacy.
- Gmail, Calendar, pagos y demás efectos externos siguen desactivados.

## Pendiente para cerrar live

1. Commit/push de esta fase.
2. Deploy manual de API y frontend en Render con las mismas variables privadas.
3. Prueba lado a lado con un bearer playground válido: skip y confirmación,
   refresh/reinicio y aislamiento respecto de `tenant-demo`.
