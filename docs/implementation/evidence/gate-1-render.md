# Gate 1 — evidencia de Render

Fecha: 2026-09-05  
Commit de aplicación probado: `9a2d6d8`  
Servicio: `noah-nvidia-api`  
URL: https://noah-nvidia-api.onrender.com

## Resultado

- `/health`: HTTP 200.
- `/api/v1/bootstrap`: HTTP 200 con Bearer; tenant `tenant-demo`.
- `/api/v1/providers/health`: HTTP 200.
- Mensaje controlado: HTTP 200, `provider=nebius`, modelo
  `nvidia/nemotron-3-super-120b-a12b`, `provider_error=null`, run `ready`.
- Presupuesto de modelo: límite 1, consumo 1.
- Efectos externos: desactivados.
- Persistencia: `in-memory-demo`; Supabase no se usó.
- OpenCode2API: sandbox free configurado como `false`; no participó en la
  prueba.

## Seguridad operativa

- La clave de Nebius y el token de demo se cargaron solo en variables privadas
  de Render y no se guardaron en el repositorio.
- El token se usó desde el navegador y el portapapeles de sesión fue limpiado.
- No se importó ni desplegó ningún proyecto en Vercel.
