# Noah Nvidia — estado y roadmap operativo

> Fuente de verdad operativa para continuar sin drift. Actualizado: 2026-09-05.

## Baseline congelado

- Repositorio: `Akunimal/noah-nvidia`
- Rama: `main`
- Commit de aplicación verificado en API: `9a2d6d8`; frontend desplegado desde
  `9b6dbdd`.
- Despliegue: manual; Vercel queda fuera del flujo.
- Backend live: `https://noah-nvidia-api.onrender.com` (Render Web Service, plan Free).
- Frontend live: `https://noah-nvidia-web.onrender.com` (Render Static Site, plan Free).
- Runtime del backend: Python `3.12.10` configurado en Render.
- Persistencia actual: memoria/in-memory para demo y smoke local.
- Efectos externos: desactivados (`NOAH_ENABLE_EXTERNAL_EFFECTS=false`).
- Supabase: opcional y diferido; no es requisito del siguiente gate.

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
demo autorizado y `NOAH_ALLOW_FREE_SYNTHETIC=true`. Esa vía es sintética,
opt-in y no debe recibir datos privados. No existe fallback a un modelo ajeno
a NVIDIA.

## Estado comprobado

| Área | Estado | Evidencia |
|---|---|---|
| API determinista | OK | 27 tests Python pasan en `services/api/.venv` |
| Frontend | OK | typecheck, lint, Vitest y build pasan |
| Smoke local | OK | Atlas Services, run succeeded, receipt generado |
| Aislamiento, aprobaciones e idempotencia | OK en tests | `services/api/test_main.py` |
| Router Nebius/OpenCode2API | Nebius live OK; OpenCode2API contrato local OK | OpenCode2API live sigue pendiente; evidencia en `evidence/gate-3-opencode2api.md` |
| Nebius real | OK | Gate 1 probado con `nvidia/nemotron-3-super-120b-a12b` |
| Demo manual live | OK | Gate 2 probado desde frontend Render; evidencia en `evidence/gate-2-render.md` |
| OpenCode2API free | Contrato local OK; live pendiente | Prueba HTTP efímera en `127.0.0.1`; nunca se usó una URL/clave real |
| Google OAuth | Pendiente | Requiere cliente y cuenta de prueba |
| Supabase | Diferido | No bloquear el MVP/demo actual |
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
- Efectos externos apagados; persistencia continúa in-memory.
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

Estado: **posterior**.

- Usar cuenta de prueba.
- Leer/sincronizar primero; crear borrador después.
- Revisar payload exacto antes de aprobar.
- Mantener efectos externos apagados hasta que exista evidencia de recibo y
  reconciliación.

### Gate 5 — Persistencia durable

Estado: **diferido**.

- Solo abrirlo si la demo necesita sobrevivir reinicios.
- Si se activa, usar un proyecto Supabase nuevo, migración base, RLS y Storage
  privado; nunca exponer la service key al frontend.

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
- Antes de activar una integración, comparar este archivo con `.env.example`,
  `render.yaml`, `provider-manifest.md` y `runbook.md`.

## Próximo paso exacto

Gate 3 de contrato está cerrado. El siguiente paso recomendado es preparar
Google OAuth en modo Testing con una cuenta de prueba y scopes mínimos, sin
activar todavía efectos externos. El Gate 3 live solo se completa si se decide
operar un gateway OpenCode2API real y se cargan su URL y clave de forma privada.
No activar Supabase, Vercel ni efectos externos por inferencia.
