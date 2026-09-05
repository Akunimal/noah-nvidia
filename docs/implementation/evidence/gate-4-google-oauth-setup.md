# Gate 4 — Google OAuth preflight

Fecha: 2026-09-05  
Estado: **preparación iniciada; cliente OAuth y consentimiento pendientes**

## Proyecto aislado

- Proyecto Google Cloud: `noah-nvidia-oauth-test`.
- Audiencia: externa, en modo Testing.
- Aplicación: `Noah Nvidia`.
- Gmail API: habilitada.
- Google Calendar API: habilitada.
- Callback web preparado: `https://noah-nvidia-api.onrender.com/api/v1/connections/google/callback`.

## Seguridad y costo

La configuración se detuvo antes de crear el cliente OAuth. No se creó ni se
copió ningún `client secret`, no se guardó ningún token y todavía no se pidió
acceso a datos de Gmail o Calendar.

La consola muestra que el proyecto quedó asociado a una cuenta de facturación
existente. No se creó ni modificó una cuenta de facturación y no se habilitaron
servicios adicionales de cómputo o almacenamiento. La documentación oficial
indica que el uso estándar de Gmail y Calendar está disponible sin costo
adicional, aunque las cuotas y sus políticas de facturación pueden cambiar;
por eso la decisión de costo cero absoluto queda pendiente de desvincular la
cuenta o aceptar explícitamente esa condición.

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

1. Decidir si se usa el proyecto con la cuenta de facturación vinculada o se la
   desvincula primero.
2. Crear el cliente OAuth web con el callback exacto.
3. Guardar el ID y el secret únicamente en Render.
4. Agregar solo la cuenta del operador como test user y completar consentimiento.
5. Probar sync de lectura; mantener borradores y envíos detrás de aprobación y
   con efectos externos apagados.

