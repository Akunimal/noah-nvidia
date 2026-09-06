# Fase 5 — prueba lado a lado

Fecha: 2026-09-05  
Estado: **en publicación; recorrido local cerrado, smoke live público pendiente**

## Alcance probado

Se abrieron dos tenants sintéticos en pestañas separadas del navegador local:

- un tenant para `skip` y fixture sintético;
- un tenant para confirmación de un borrador revisable.

El API local se ejecutó con `NOAH_ENABLE_EXTERNAL_EFFECTS=false`, sin clave de
modelo y con CORS limitado a los dos orígenes loopback. No se usaron cuentas,
claves ni datos reales.

## Recorrido `skip`

1. La bienvenida mostró el wizard de playground y el botón `Saltar y explorar`.
2. El warning explicó que se cargarían datos ficticios y que no habría efectos
   externos.
3. La confirmación explícita terminó en la pantalla `Skip entendido.`.
4. El workspace pasó a `Playground · synthetic Atlas`, mostró `Atlas Services`,
   tres aprobaciones y la actividad/métricas del fixture.
5. Una pestaña nueva leyó el mismo estado sin volver a mostrar el wizard.

## Recorrido de confirmación

1. Se cargó una descripción natural de prueba.
2. La extracción mostró el error visible `Nebius todavía no está configurado`
   y ofreció `Completar manualmente`, sin intentar OpenCode2API.
3. La revisión permitió completar nombre y actividad y mostró el JSON
   `onboarding.v1` antes de guardar.
4. La confirmación terminó en `Playground configurado` con `Taller Norte`.
5. Una pestaña nueva conservó el estado configurado y no reabrió el wizard.

## Corrección encontrada durante la prueba

El recorrido detectó que la respuesta de `skip` no actualizaba el nombre de
empresa ni el modo de fixture en la vista inmediata, aunque el backend sí había
guardado la decisión. La UI ahora consume el business devuelto por la mutación,
activa el modo de fixture para el Overview y carga la actividad sintética.

## Verificaciones automatizadas

```text
services/api: 46 passed, 1 warning
apps/web: typecheck OK
apps/web: lint OK
apps/web: Vitest 2 files / 6 tests passed
apps/web: build OK
git diff --check OK
```

## Corrección de entrega pública

El frontend no vuelve a enviar un bearer `VITE_*`: Render tenía un token
configurado para compilar la web, pero cualquier variable `VITE_*` es visible
en el bundle. Se retiró ese token del Static Site y se añadió un modo
`NOAH_PUBLIC_DEMO` explícito en el API. Cuando está habilitado, el API asigna
únicamente un tenant sintético derivado de un identificador efímero del
navegador, permite las lecturas sintéticas y el circuito
de onboarding/propuesta supervisada, y bloquea conexiones OAuth, mutaciones
privadas y rutas fuera de la lista pública. El tenant no se guarda en Neon y
los mensajes públicos devuelven `deterministic-demo` sin llamar a Nebius,
OpenCode2API ni consumir crédito.

La prueba local del mismo circuito confirmó `Playground · empty`, wizard,
warning de skip, `Skip entendido.`, `Playground · synthetic Atlas`, tres
aprobaciones y actividad del fixture. La variable no secreta
`NOAH_PUBLIC_DEMO=true` quedó cargada manualmente en el API Render y el
frontend conserva sólo `VITE_API_BASE_URL`.

## Límite live

Render respondió `200` en `/health`, en el frontend y en `/openapi.json`. La
verificación live final del frontend/API queda pendiente de completar el
redeploy manual del API con el código de esta corrección. Antes de ella, las
lecturas con el identificador sintético `demo-owner` respondían
`401 AUTH_REQUIRED`: ese identificador no era un bearer de playground y
`NOAH_REQUIRE_AUTH` quedó intacto. No se abrió ni copió ningún secreto de
Render.

Por lo tanto, la confirmación de Neon tras reinicio y el aislamiento live contra
`tenant-demo` siguen pendientes de un bearer válido para un tenant playground.
El entorno local comprueba el flujo de navegador y la API, pero no sustituye la
prueba durable live.
