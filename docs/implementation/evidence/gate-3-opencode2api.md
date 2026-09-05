# Gate 3 — OpenCode2API sandbox

Fecha: 2026-09-05  
Estado: **contrato local cerrado; gateway live pendiente**

## Alcance

Este gate valida solamente la ruta free sintética y su procedencia. Nebius
continúa siendo la ruta primaria de Render. No se cambiaron variables de Render,
no se utilizó Supabase/Vercel y los efectos externos siguen apagados.

## Validación ejecutada

La prueba `services/api/test_providers.py::test_opencode2api_http_contract_preserves_provider_result_provenance`
levanta un servidor HTTP efímero en `127.0.0.1` y devuelve una respuesta
OpenAI-compatible sintética. El adaptador realiza el POST a
`/v1/chat/completions` y la prueba confirma:

- `ProviderResult.provider == "opencode2api"`.
- `ProviderResult.model == "nemotron-3-ultra-free"`.
- El texto y `error=None` se conservan.
- La URL, el modelo y los dos mensajes enviados son los esperados.
- El bearer usado es una cadena ficticia exclusiva del test; no es una clave
  operativa.
- La ruta solo se habilita con `NOAH_ALLOW_FREE_SYNTHETIC=true` y
  `allow_free_synthetic=true`, sin fallback silencioso.

Comandos y resultados:

```text
services/api/.venv/Scripts/python.exe -m pytest -q
27 passed, 1 warning

npm test
3 passed

npm run typecheck
passed

npm run lint
passed

npm run build
passed
```

## Límite honesto del gate

No existe en el repo ni en la configuración actual una URL/clave de un gateway
OpenCode2API real. Por eso esta evidencia no afirma una llamada live al modelo
free: prueba el contrato HTTP y la procedencia sin enviar datos fuera de la
máquina. Para cerrar la variante live hace falta que el operador despliegue o
elija un gateway y cargue sus variables únicamente en el backend.

Mientras tanto, Render conserva:

```text
NOAH_ALLOW_FREE_SYNTHETIC=false
NOAH_ENABLE_EXTERNAL_EFFECTS=false
```

