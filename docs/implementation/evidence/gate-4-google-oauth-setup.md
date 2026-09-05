# Gate 4 — Google OAuth preflight

Fecha: 2026-09-05  
Estado: **proyecto y consentimiento configurados; cliente OAuth pendiente**

## Proyecto aislado

- Cuenta operadora verificada: `gesecseguridad@gmail.com`.
- Proyecto Google Cloud: `Noah Nvidia OAuth Test` (`noah-nvidia-oauth-test-507713`).
- Audiencia: externa, en modo Testing.
- Aplicación: `Noah Nvidia`.
- Gmail API: habilitación solicitada; falta verificar que finalice.
- Google Calendar API: habilitación solicitada; falta verificar que finalice.
- Callback web preparado: `https://noah-nvidia-api.onrender.com/api/v1/connections/google/callback`.

## Seguridad y costo

Todavía no se creó ni se copió ningún `client secret`, no se guardó ningún
token y todavía no se pidió acceso a datos de Gmail o Calendar. La configuración
queda detenida justo antes de guardar la aplicación OAuth/client.

No se inició la prueba gratuita de Google Cloud, no se creó ni modificó una
cuenta de facturación y no se habilitaron servicios de cómputo o almacenamiento.
La cuenta muestra una invitación a la prueba de crédito, que no fue aceptada.
Las cuotas y políticas de facturación de APIs pueden cambiar; no se promete
costo cero absoluto.

## Contrato OAuth del repo

El backend ya implementa Authorization Code + PKCE, estado de un solo uso,
intercambio server-side y cifrado AES-GCM. Las credenciales previstas son
server-only:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
NOAH_CONNECTION_ENCRYPTION_KEY
```

Los scopes que hoy solicita el código son los mínimos funcionales para el slice
actual: Gmail readonly/compose/send y Calendar events.owned/freebusy/
calendarlist.readonly. Deben revisarse en Google Auth Platform antes de crear
el cliente; no se agregó Drive ni ningún scope adicional.

## Próximo paso bloqueado por confirmación

1. Verificar que Gmail API y Google Calendar API terminen de habilitarse.
2. Crear el cliente OAuth web con el callback exacto.
3. Guardar el ID y el secret únicamente en Render.
4. Agregar solo la cuenta del operador como test user y completar consentimiento.
5. Probar sync de lectura; mantener borradores y envíos detrás de aprobación y
   con efectos externos apagados.
