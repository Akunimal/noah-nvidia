# Gate 2 — evidencia de demo manual en Render

Fecha: 2026-09-05  
Rama: `main`  
Frontend probado desde: `9b6dbdd`  
API con código conectado: `9a2d6d8`

## Despliegue manual

- Static Site: `noah-nvidia-web`
- URL: `https://noah-nvidia-web.onrender.com`
- API: `https://noah-nvidia-api.onrender.com`
- Repositorio: `Akunimal/noah-nvidia`, rama `main`
- Build: `npm ci && npm run build`
- Publish Directory: `apps/web/dist`
- Variables de frontend: `VITE_API_BASE_URL` y bearer de demo configurados
  manualmente en Render; sus valores no se guardaron en el repositorio ni se
  imprimieron en esta evidencia.
- CORS del backend: `NOAH_CORS_ORIGINS` incluye el origen exacto del Static
  Site.
- El primer artefacto tuvo un 404 transitorio de caché para el JS. Se ejecutó
  un redeploy manual con `Clear build cache & deploy`; después HTML, JS y CSS
  respondieron 200.

## Recorrido verificado

1. La consola live cargó en un tab Chrome sin estado previo del frontend y
   mostró `Atlas Services`, `All systems nominal` y `NVIDIA runtime online`.
2. El runtime visible fue `Nemotron 3 Super · Nebius`, demostrando que el
   frontend autenticado alcanzó bootstrap y la configuración primaria de la
   API.
3. Se envió un único mensaje sintético supervisado. La API registró
   `provider=nebius`, modelo `nvidia/nemotron-3-super-120b-a12b` y
   `provider_error=null`; el run quedó con una propuesta de `Gmail draft`.
4. Se aprobó únicamente la propuesta recién creada. La auditoría registró
   `action.approved` y la cola visual volvió de 4 a 3 pendientes.
5. La ejecución registró `run.advanced` con resultado `blocked` y un recibo de
   efecto con `status=failed`, `code=EXTERNAL_EFFECTS_DISABLED` y
   `execution=sandbox-no-external-effect`. `external_id=null`: no hubo envío
   real ni otro efecto externo.

## Seguridad y límites

- `NOAH_NEBIUS_API_KEY` permaneció únicamente en el Environment privado del
  backend Render.
- Efectos externos: `false`.
- Persistencia: in-memory demo; `NOAH_DATABASE_URL` no estaba configurada.
- OpenCode2API: desactivado; no participó en la prueba.
- Vercel: no se importó ni se desplegó ningún proyecto.
- El navegador embebido IAB bloqueó el dominio con `ERR_BLOCKED_BY_CLIENT`; la
  validación se completó en un tab Chrome limpio y el bloqueo quedó aislado
  como limitación del navegador, no del deploy.
