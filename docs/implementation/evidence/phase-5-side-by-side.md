# Fase 5 — prueba lado a lado

Fecha: 2026-09-05 — actualización live: 2026-09-06
Estado: **cerrada para demo pública; smoke privado Neon pendiente**

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
services/api: 52 passed, 1 warning
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

## Verificación live pública

- El API se publicó manualmente desde `3d9d784` como
  `dep-daeddkmq1p3s738t49sg`; el frontend se publicó desde el mismo commit como
  `dep-daede96q1p3s738t6kv0`. Ambos terminaron `Deploy succeeded | Live`.
- El API respondió `200` en `/health`, `/api/v1/bootstrap` y `/openapi.json`.
  El bootstrap público declaró `public_demo=true` y CORS permitió únicamente
  el origen del Static Site.
- En una pestaña nueva de `https://noah-nvidia-web.onrender.com/` la UI cargó
  `NVIDIA API · sandbox`, `Playground · empty` y el wizard. El skip mostró la
  advertencia, terminó en `Skip entendido.` y luego cargó `Atlas Services`,
  `Playground · synthetic Atlas`, tres aprobaciones y las métricas del fixture.
- Desde `Assistant` se envió una consulta de prueba y la respuesta visible
  llegó con procedencia `deterministic-demo`, sin activar Nebius, OpenCode2API
  ni efectos externos.
- El Static Site mantiene únicamente `VITE_API_BASE_URL`; no se abrió ni copió
  ningún secreto de Render y el bundle publicado no contiene el bearer anterior.

## Verificación live del guard NVIDIA

- La configuración no secreta de Render dejó `NOAH_PUBLIC_AI_MODE=scheduled`,
  apertura `2026-10-27T17:00:00Z`, cierre `2026-10-30T17:00:00Z`, límite
  server-side `20` y límite BYOK `5`.
- `bootstrap.public_ai` respondió `mode=scheduled`,
  `effective_mode=synthetic`, `remaining_calls=20`,
  `reviewer_byok_allowed=true` y `server_configured=true`.
- Una carga limpia del Static Site mostró `Demo sintética programada`, la fecha
  de apertura y `Usar clave temporal`. No se ingresó ninguna clave ni se
  adelantó el reloj; la verificación no consumió crédito.

## Límite deliberado de la demo pública

La ruta pública permanece acotada: su tenant se deriva de un identificador
efímero del navegador, no se persiste en Neon, no llama a Nebius ni a
OpenCode2API, rechaza extracción de texto de modelo y bloquea OAuth, mutaciones
privadas y rutas fuera de la superficie sintética. `NOAH_REQUIRE_AUTH` sigue
intacto para el flujo autenticado. La verificación durable de Neon y el
aislamiento live contra `tenant-demo` siguen pendientes de un bearer válido para
un tenant playground privado; no se considera sustituida por esta prueba.
