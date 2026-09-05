# Noah Nvidia — estado y roadmap operativo

> Fuente de verdad operativa para continuar sin drift. Actualizado: 2026-09-05.

## Baseline congelado

- Repositorio: `Akunimal/noah-nvidia`
- Rama: `main`
- Código funcional live verificado: `5e01dc8`; documentación/estado actual en
  `201541d`; deploy manual del API `dep-dae6npm1egvs73b5eqp0` y del frontend
  `dep-dae5p42d0e5s73f8v70g`.
- Despliegue: manual; Auto-Deploy está en `Off` en API y frontend; Vercel queda
  fuera del flujo.
- Backend live: `https://noah-nvidia-api.onrender.com` (Render Web Service, plan Free).
- Frontend live: `https://noah-nvidia-web.onrender.com` (Render Static Site, plan Free).
- Runtime del backend: Python `3.12.10` configurado en Render.
- Persistencia primaria actual: Neon Free, proyecto `Noah Nvidia Admin`
  (`damp-bonus-89686151`), rama `production`, base `neondb`, región AWS
  US West 2 (Oregon). El plan Free muestra 0.5 GB, 100 CU-horas mensuales y
  5 GB de transferencia; no se habilitó ningún plan pago.
- Persistencia legacy: Render PostgreSQL Free `noah-nvidia-db` en Oregon,
  1 GB, servicio `dpg-dae5lgf40ujc73dtvm9g-a`; queda fuera de la ruta activa
  y expira el 5 de octubre de 2026. No se actualizará a un plan pago.
- `NOAH_DATABASE_URL` está configurada solo en el API, enmascarada en Render;
  el frontend nunca recibe la URL ni las credenciales.
- Efectos externos: desactivados (`NOAH_ENABLE_EXTERNAL_EFFECTS=false`).
- Persistencia durable: Gate 5 cerrado en Neon Free; el esquema se creó de
  forma idempotente, `tenant-demo` quedó guardado y la lectura sobrevivió un
  reinicio del API. Render queda solo como recurso legacy temporal.

## Onboarding workstream

El workstream activo es el onboarding simple descrito en
[`onboarding-roadmap.md`](onboarding-roadmap.md). La **fase 0 está cerrada**:
el contrato `onboarding.v1`, la separación demo/playground, la política de
proveedores y los criterios de skip quedaron versionados. No hay endpoints ni
componentes live de onboarding todavía; las siguientes fases son de código.

- Datos del usuario: solo Nebius/NVIDIA; OpenCode2API no recibe texto privado.
- `ProviderResult`: sobre de procedencia, separado del JSON de negocio; ver
  `contracts/provider-result.schema.json`.
- Demo: `tenant-demo` puede usar Atlas sintético para el video.
- Playground: tenant nuevo vacío; confirmar aplica el borrador; skip siembra
  Atlas sintético con un warning explícito y sin efectos externos.
- Contrato JSON: `contracts/onboarding.v1.schema.json`.
- Evidencia: `evidence/phase-0-onboarding.md`.

## Qué significa `ProviderResult`

`ProviderResult` no es un proveedor ni demuestra que OpenCode2API esté siendo
usado. Es el contrato común que normaliza el resultado de cualquier ruta de
texto:

1. `OpenCode2ApiProvider.complete()` devuelve `ProviderResult`.
2. `NebiusProvider.complete()` devuelve `ProviderResult`.
3. `NvidiaRouter.complete()` devuelve el mismo tipo al endpoint de mensajes.
4. `main.py` guarda `provider`, `model`, `provider_error` y la procedencia del
   mensaje en el run y en la respuesta API.

La prioridad runtime es:

```text
Nebius configurado
  -> NebiusProvider
Nebius no configurado + tenant demo + free sandbox permitido
  -> OpenCode2ApiProvider
En cualquier otro caso
  -> deterministic-demo / NO_NVIDIA_PROVIDER_CONFIGURED
```

OpenCode2API solo entra si tiene `NOAH_OPENCODE2API_BASE_URL`, el tenant es el
demo autorizado, `NOAH_ALLOW_FREE_SYNTHETIC=true` y el modelo configurado
pertenece a la familia NVIDIA Nemotron. También se rechaza una respuesta cuyo
campo `model` declare una familia ajena. Esa vía es sintética, opt-in y no debe
recibir datos privados. No existe fallback a un modelo ajeno a NVIDIA.

## Estado comprobado

| Área | Estado | Evidencia |
|---|---|---|
| API determinista | OK | 36 tests Python pasan en `services/api/.venv` |
| Frontend | OK | typecheck, lint, Vitest y build pasan |
| Smoke local | OK | Atlas Services, run succeeded, receipt generado |
| Aislamiento, aprobaciones e idempotencia | OK en tests | `services/api/test_main.py` |
| Router Nebius/OpenCode2API | Nebius live OK; OpenCode2API contrato local OK | OpenCode2API live sigue pendiente; evidencia en `evidence/gate-3-opencode2api.md` |
| Nebius real | OK | Gate 1 probado con `nvidia/nemotron-3-super-120b-a12b` |
| Demo manual live | OK | Gate 2 probado desde frontend Render; evidencia en `evidence/gate-2-render.md` |
| Build Render del API | OK tras fijar Python 3.12.10 | El primer deploy de `8af42c3` falló por Python 3.14; evidencia en `evidence/render-build-incident-2026-09-05.md` |
| Política de deploy | OK | Auto-Deploy desactivado en ambos servicios; los próximos releases se disparan manualmente |
| OpenCode2API free | Contrato local OK; Nemotron-only enforced; live pendiente | Prueba HTTP efímera en `127.0.0.1`; nunca se usó una URL/clave real |
| Google OAuth | OK — lectura verificada | Consentimiento real, callback, token cifrado y sync de lectura verificados con `gesecseguridad@gmail.com`; efectos externos siguen apagados |
| PostgreSQL durable | OK live en Neon Free; Render legacy expira 2026-10-05 | `NOAH_DATABASE_URL` privado, `postgres-jsonb Configured`, esquema Neon con 2 tablas y `tenant-demo` persistido tras reinicio; evidencia en `evidence/gate-5-postgresql.md` |
| Vercel | Fuera de alcance | No importar ni desplegar proyectos |

## Roadmap por gates

### Gate 0 — Fuente única de verdad

Estado: **cerrado**.

- Mantener este archivo junto con `provider-manifest.md` y `runbook.md`.
- Actualizar la tabla después de cada integración real.
- No avanzar de gate si la evidencia no está guardada.

### Gate 1 — Nebius conectado

Estado: **cerrado — aprobado**.

- Configurar solo en el entorno del backend:
  - `NOAH_NEBIUS_API_KEY`
  - `NOAH_NEBIUS_BASE_URL`
  - `NOAH_NEBIUS_MODEL`
  - `NOAH_MODEL_USAGE_LIMIT` con límite conservador
- Mantener `NOAH_ENABLE_EXTERNAL_EFFECTS=false`.
- Verificados en Render: `/health` 200, `/api/v1/bootstrap` autenticado 200,
  `/api/v1/providers/health` 200 y un único mensaje controlado 200.
- Confirmados `provider=nebius`, modelo `nvidia/nemotron-3-super-120b-a12b`,
  `provider_error=null`, límite 1 y consumo 1.
- Efectos externos apagados; la persistencia durable se habilitó después en Gate 5.
- Evidencia: `docs/implementation/evidence/gate-1-render.md`.

### Gate 2 — Demo manual reproducible

Estado: **cerrado — aprobado**.

- Frontend creado manualmente como Static Site `noah-nvidia-web` en Render.
- Build verificado con `npm ci && npm run build` y publicación `apps/web/dist`.
- `VITE_API_BASE_URL` apunta a `https://noah-nvidia-api.onrender.com`.
- `NOAH_CORS_ORIGINS` contiene `https://noah-nvidia-web.onrender.com`.
- Desde un tab Chrome sin estado previo del frontend se verificaron bootstrap,
  un mensaje controlado a Nebius, una aprobación y el recibo de ejecución.
- Efectos externos permanecieron apagados; no se envió correo ni se modificó
  Calendar, dinero o documentos.
- Evidencia: `docs/implementation/evidence/gate-2-render.md`.

### Gate 3 — OpenCode2API sandbox (opcional)

Estado: **contrato local cerrado; gateway live pendiente**.

- La prueba levanta un servidor HTTP efímero en `127.0.0.1`, devuelve una
  respuesta OpenAI-compatible sintética y recorre el POST real del adaptador.
- Se verifican `provider=opencode2api`, el modelo, el `Authorization` ficticio,
  el payload de mensajes y la ausencia de `error` en `ProviderResult`.
- La prueba fuerza `NOAH_ALLOW_FREE_SYNTHETIC=true` y
  `allow_free_synthetic=true`; no usa Nebius, datos privados ni efectos.
- Render permanece seguro: `NOAH_ALLOW_FREE_SYNTHETIC=false` y
  `NOAH_ENABLE_EXTERNAL_EFFECTS=false`.
- La validación live queda pendiente de una URL de gateway OpenCode2API y su
  clave proporcionadas por el operador mediante configuración privada. No se
  inventa un endpoint público ni se modifica la ruta primaria.
- Evidencia: `docs/implementation/evidence/gate-3-opencode2api.md`.

### Gate 4 — Google OAuth y efectos externos

Estado: **cerrado — consentimiento, callback y sync de lectura aprobados; efectos externos apagados**.

- Cuenta operadora verificada: `gesecseguridad@gmail.com`.
- Proyecto de pruebas: `Noah Nvidia OAuth Test`
  (`noah-nvidia-oauth-test-507713`).
- Google Auth Platform quedó configurado como aplicación externa en modo
  Testing, con `Noah Nvidia` y `gesecseguridad@gmail.com` como contacto.
- Gmail API y Google Calendar API están habilitadas y verificadas en el proyecto.
- Cliente web creado: `Noah Nvidia Render Web`, con callback
  `https://noah-nvidia-api.onrender.com/api/v1/connections/google/callback`.
- No se inició la prueba gratuita, no se creó ni modificó una cuenta de
  facturación y no se habilitaron servicios de cómputo o almacenamiento. No se
  promete costo cero absoluto porque cuotas y políticas pueden cambiar.
- El `client_id`, el `client_secret` y `NOAH_CONNECTION_ENCRYPTION_KEY` están
  guardados solo como variables privadas del API en Render; ningún secreto ni
  token se guardó en el repo. El secreto anterior quedó deshabilitado después
  de verificar el nuevo flujo.
- La cuenta de prueba `gesecseguridad@gmail.com` concedió únicamente estos
  scopes: `gmail.readonly`, `calendar.calendarlist.readonly`,
  `calendar.freebusy` y `calendar.events.readonly`.
- Callback real verificado en Render: respuesta 200, conexión `google=connected`
  y cuatro scopes. La sincronización de lectura devolvió 20 mensajes y 0
  eventos desde `google-api`; no envió, creó ni modificó datos.
- Deploy manual del API completado y servicio `Live` en Render desde `cd2f858`
  (`dep-dae45vfqj5pc73a6r2k0`).
- `NOAH_ENABLE_EXTERNAL_EFFECTS` continúa en `false`; los borradores y envíos
  siguen detrás de aprobación y no forman parte de este consentimiento.
- Evidencia: `docs/implementation/evidence/gate-4-google-oauth-setup.md`.

### Gate 5 — Persistencia durable

Estado: **cerrado — Neon Free live aprobado; Render legacy expira el 2026-10-05**.

- `PostgresTenantRepository` guarda un snapshot JSONB completo por tenant y
  aplica la validación `state.tenant_id == tenant_id` antes de escribir.
- `noah_oauth_state` conserva el estado PKCE de un solo uso para que el
  callback sobreviva un reinicio; los tokens siguen dentro de sobres AES-GCM.
- El middleware copia y persiste únicamente los tenants tocados por cada
  request. Si `NOAH_DATABASE_URL` está vacío, el fallback in-memory no cambia.
- La API crea ambas tablas de forma idempotente; el SQL revisable está en
  `services/api/storage_schema.sql`.
- La base primaria se creó manualmente en Neon Free: proyecto
  `damp-bonus-89686151`, rama `production`, base `neondb`, PostgreSQL 18,
  región AWS US West 2 (Oregon). Solo se habilitó PostgreSQL; Object Storage,
  Functions, AI Gateway y Neon Auth quedaron apagados.
- `NOAH_DATABASE_URL` se reemplazó únicamente en el API mediante el panel de
  Render y quedó enmascarada. El deploy manual `dep-dae6npm1egvs73b5eqp0`
  terminó en `Deploy succeeded | Live`.
- La API creó idempotentemente las tablas `noah_oauth_state` y
  `noah_tenant_state`. La consulta live mostró un snapshot `tenant-demo`
  (versión 16) en Neon; después se reinició el API y el frontend volvió a
  responder con el mismo estado. Esto verifica persistencia fuera del
  proceso, no solo configuración de la variable.
- La base Render `noah-nvidia-db` queda como legacy temporal durante la
  transición y no es la fuente de verdad. No se mezclan datos con Supabase.
- Nebius sigue siendo el proveedor de inferencia. PostgreSQL solo persiste
  estado; Vercel queda fuera del flujo.

## Reglas anti-drift

- Nebius es la ruta conectada primaria; OpenCode2API es sandbox sintético.
- `ProviderResult` es contrato de transporte, no una tercera ruta.
- Toda ruta nueva debe actualizar `providers.py`, `provider-manifest.md`, una
  prueba en `services/api/test_providers.py` y esta tabla.
- Ninguna clave de proveedor, OAuth, persistencia o cifrado va al repo, al
  frontend, al graphify o a este archivo. `VITE_NOAH_AUTH_TOKEN` es únicamente
  el bearer de demo del Static Site; no debe reutilizarse como credencial de
  producción y debe rotarse si el demo deja de ser privado.
- Ningún efecto externo se considera exitoso sin recibo verificable.
- Si cambia el commit base, actualizar el baseline y repetir las verificaciones.
- El backend debe conservar Python `3.12.10` tanto en `.python-version` como en
  la configuración de Render; no depender del default cambiante del runtime.
- Antes de activar una integración, comparar este archivo con `.env.example`,
  `render.yaml`, `provider-manifest.md` y `runbook.md`.
- Toda implementación de onboarding debe validar contra
  `contracts/onboarding.v1.schema.json` y actualizar este roadmap, OpenAPI y
  las pruebas en el mismo cambio.
- `extract` nunca escribe business/inventory; solo `complete`, después de
  revisión y confirmación, puede hacerlo.
- `skip` solo puede aplicar el fixture sintético versionado y debe ser
  idempotente; no puede llamar a Nebius ni a OpenCode2API.

## Definición de entregable

### Demo controlada — alcanzada

- `main` sincronizada con GitHub; API y frontend están live en Render Free con
  deploys manuales. La persistencia primaria está en Neon Free.
- Nebius es la ruta primaria y el modelo está limitado al Nemotron declarado.
- OpenCode2API solo existe como sandbox Nemotron-only; en Render permanece
  desactivado (`NOAH_ALLOW_FREE_SYNTHETIC=false`).
- Frontend, `/health` y `/openapi.json` responden 200.
- Efectos Gmail/Calendar, pagos y demás mutaciones externas permanecen
  desactivados.
- Pruebas locales: 36 Python, Vitest, typecheck, lint y build pasan.

### Producción — todavía no declarar

1. Mantener Neon Free dentro de sus límites y retirar la base Render legacy
   cuando se confirme que no hay datos pendientes; no actualizarla a un plan
   pago.
2. Nebius resuelve inferencia y PostgreSQL persistencia; ninguna clave llega al
   navegador.
3. Rotar el token de demo, revisar dominios/CORS y agregar monitoreo/alertas.
4. Mantener `NOAH_ENABLE_EXTERNAL_EFFECTS=false` hasta completar pruebas de
   borrador, aprobación, recibo y reversión con datos de prueba.

## Próximo paso exacto

La demo es entregable con Neon Free server-only y el slice OAuth de lectura
está verificado. La fase 0 del onboarding también está cerrada como contrato.
El siguiente paso exacto es ejecutar la fase 1 del
[`onboarding-roadmap.md`](onboarding-roadmap.md): separar y verificar el modo
playground vacío del `tenant-demo`, sin habilitar planes pagos, Supabase,
Vercel ni efectos externos.
