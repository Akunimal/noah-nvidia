# Gate 4 — Google OAuth preflight

Fecha: 2026-09-05  
Estado: **cerrado — consentimiento, callback y sync de lectura verificados; efectos externos apagados**

## Proyecto aislado

- Cuenta operadora verificada: `gesecseguridad@gmail.com`.
- Proyecto Google Cloud: `Noah Nvidia OAuth Test` (`noah-nvidia-oauth-test-507713`).
- Audiencia: externa, en modo Testing.
- Aplicación: `Noah Nvidia`.
- Gmail API: habilitada y verificada.
- Google Calendar API: habilitada y verificada.
- Cliente web creado: `Noah Nvidia Render Web`.
- Callback web: `https://noah-nvidia-api.onrender.com/api/v1/connections/google/callback`.
- Usuario de prueba agregado: `gesecseguridad@gmail.com` (modo Testing).
- API desplegada manualmente en Render desde `317b7bf`; deploy
  `dep-dae352ou01pc73ctla0g` figura `Live`.

## Seguridad y costo

El `client secret` fue creado y guardado únicamente en las variables privadas de
Render junto con `GOOGLE_CLIENT_ID`, `GOOGLE_REDIRECT_URI` y una clave
`NOAH_CONNECTION_ENCRYPTION_KEY` generada para AES-GCM. El secreto anterior fue
deshabilitado después de verificar el secreto nuevo. El token de Google se
intercambió server-side y se almacenó cifrado en memoria del proceso; no se
guardó ningún token en el repo.

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

Los scopes que solicita el código son los mínimos funcionales para el slice de
lectura actual: `gmail.readonly`, `calendar.calendarlist.readonly`,
`calendar.freebusy` y `calendar.events.readonly`. No se solicitaron scopes de
compose, send, escritura de eventos ni Drive.

## Próximos pasos de integración

1. Consentimiento real completado con `gesecseguridad@gmail.com`; el callback
   respondió 200 y registró la conexión como `connected` con cuatro scopes.
2. Sync de lectura verificado: 20 mensajes, 0 eventos, fuente `google-api`;
   no hubo efectos externos.
3. La persistencia sigue siendo in-memory: cada deploy exige reconectar hasta
   configurar `NOAH_DATABASE_URL` y verificar la recuperación durable.
