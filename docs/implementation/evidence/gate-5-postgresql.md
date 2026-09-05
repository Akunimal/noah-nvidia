# Gate 5 — evidencia de PostgreSQL durable

Fecha: 2026-09-05
Commit fuente funcional: `5e01dc8`
Commit de estado: `201541d`
Deploy manual del API con persistencia Neon: `dep-dae6npm1egvs73b5eqp0`
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
- Se creó manualmente una base primaria en Neon Free: proyecto
  `Noah Nvidia Admin` (`damp-bonus-89686151`), rama `production`, base
  `neondb`, PostgreSQL 18, región AWS US West 2 (Oregon). Solo se habilitó
  PostgreSQL, sin servicios adicionales ni upgrade.
- `NOAH_DATABASE_URL` quedó reemplazada solo en el API mediante el panel de
  Render y permanece enmascarada. El frontend no recibe esa URL.
- El deploy `dep-dae6npm1egvs73b5eqp0` terminó en `Deploy succeeded | Live`.
  La API creó las dos tablas del esquema y guardó `tenant-demo`; una consulta
  live confirmó una fila con versión 16.
- Se reinició el servicio API desde Render y el frontend volvió a responder;
  la lectura del snapshot continuó funcionando desde Neon. Gate 5 queda
  cerrado para persistencia durable live.
- `noah-nvidia-db` de Render queda como legacy temporal y expira el 5 de
  octubre de 2026. No es la fuente de verdad y no se actualizará a un plan
  pago.

## Seguridad y límites

- La URL de PostgreSQL, claves OAuth, clave Nebius y sobres AES-GCM son solo
  variables privadas del backend; no se imprimen ni llegan al frontend.
- No se inició billing ni se seleccionó un plan pago. Neon muestra el plan
  Free con límites de uso; Render legacy conserva su vencimiento explícito.
- Nebius continúa como ruta de inferencia primaria; OpenCode2API permanece
  desactivado y Nemotron-only.
- `NOAH_ENABLE_EXTERNAL_EFFECTS=false` sigue vigente.

## Próximo paso exacto

Observar los límites de Neon Free, confirmar que no quedan datos pendientes en
Render legacy y retirar esa base antes de su vencimiento, sin actualizar ningún
plan. Mientras tanto, mantener `NOAH_DATABASE_URL` solo en el API y conservar
los efectos externos desactivados.
