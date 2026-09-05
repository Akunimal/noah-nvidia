# Gate 5 — evidencia de PostgreSQL durable

Fecha: 2026-09-05
Commit fuente: `5e01dc8`
Deploy manual del API con persistencia: `dep-dae5sm9t0dsc738v34s0`
Servicio: `noah-nvidia-api`  
URL: https://noah-nvidia-api.onrender.com

## Resultado

- El repositorio `PostgresTenantRepository` queda integrado al ciclo de cada
  request y conserva el fallback in-memory cuando `NOAH_DATABASE_URL` está
  vacío.
- El build de Render terminó con `Deploy succeeded | Live` y agregó
  `psycopg==3.2.10`/`psycopg-binary==3.2.10` al runtime.
- `noah_tenant_state` guarda un snapshot JSONB por tenant con una restricción
  que impide cruzar `tenant_id`; `noah_oauth_state` conserva el PKCE de un solo
  uso durante diez minutos.
- La suite local cubre round-trip de estado, aislamiento del tenant y consumo
  único de OAuth; 36 pruebas Python pasan.
- Se creó manualmente `noah-nvidia-db` en Render PostgreSQL Free, región
  Oregon, 1 GB, servicio `dpg-dae5lgf40ujc73dtvm9g-a`. Render informa que el
  recurso expira y será eliminado el 5 de octubre de 2026 si no se actualiza
  a un plan pago.
- `NOAH_DATABASE_URL` quedó configurada solo en el API mediante el panel de
  Render y permanece enmascarada. El frontend no recibe esa URL.
- La consola live mostró `postgres-jsonb Configured`; después de reiniciar el
  servicio Free, la consola recuperó el mismo estado. Gate 5 queda cerrado
  para validación durable live, con la limitación temporal indicada.

## Seguridad y límites

- La URL de PostgreSQL, claves OAuth, clave Nebius y sobres AES-GCM son solo
  variables privadas del backend; no se imprimen ni llegan al frontend.
- No se inició billing ni se seleccionó un plan pago. La base utilizada es el
  plan Free de prueba con vencimiento explícito.
- Nebius continúa como ruta de inferencia primaria; OpenCode2API permanece
  desactivado y Nemotron-only.
- `NOAH_ENABLE_EXTERNAL_EFFECTS=false` sigue vigente.

## Próximo paso exacto

Antes del 5 de octubre de 2026, decidir una base PostgreSQL no-expirante y su
costo, o migrar el snapshot a una alternativa compatible. No actualizar el
plan automáticamente. Mientras tanto, mantener `NOAH_DATABASE_URL` solo en el
API, observar el límite de 1 GB y conservar los efectos externos desactivados.
