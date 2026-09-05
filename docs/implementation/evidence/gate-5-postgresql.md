# Gate 5 — evidencia de PostgreSQL durable

Fecha: 2026-09-05  
Commit fuente: `d371955`  
Deploy manual del API: `dep-dae5eve1egvs73b233v0`  
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
- `NOAH_DATABASE_URL` permanece vacío en Render. Por eso esta evidencia cierra
  código y deploy, pero no reclama todavía persistencia durable live ni una
  prueba de recuperación tras reinicio.

## Seguridad y límites

- La URL de PostgreSQL, claves OAuth, clave Nebius y sobres AES-GCM son solo
  variables privadas del backend; no se imprimen ni llegan al frontend.
- No se provisionó una base ni se inició billing en este gate.
- Nebius continúa como ruta de inferencia primaria; OpenCode2API permanece
  desactivado y Nemotron-only.
- `NOAH_ENABLE_EXTERNAL_EFFECTS=false` sigue vigente.

## Próximo paso exacto

Si se decide habilitar persistencia durable, conectar una base PostgreSQL
administrada por Render (o una alternativa elegida por el operador), cargar
`NOAH_DATABASE_URL` solo en el API, hacer un deploy manual y verificar que un
tenant y un estado OAuth sobrevivan al reinicio. Ese paso requiere una decisión
separada sobre proveedor y costo.
