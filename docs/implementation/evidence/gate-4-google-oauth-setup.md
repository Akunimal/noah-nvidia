# Gate 4 — Google OAuth preflight

Fecha: 2026-09-05  
Estado: **proyecto, consentimiento, APIs, cliente, test user y deploy configurados; integración pendiente**

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
`NOAH_CONNECTION_ENCRYPTION_KEY` generada para AES-GCM. No se guardó ningún
token ni se pidió todavía acceso efectivo a datos de Gmail o Calendar.

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

## Próximos pasos de integración

1. Completar consentimiento y probar sync de lectura; mantener borradores y envíos detrás de aprobación y
   con efectos externos apagados.
