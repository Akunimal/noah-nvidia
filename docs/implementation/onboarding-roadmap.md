# Onboarding simple de Noah Nvidia

> Contrato y roadmap del workstream de onboarding. Fases 0, 1, 2 y 3 cerradas
> en local; fase 4 cerrada en local y publicada en Render el 2026-09-05. La
> fase 5 cerró la demo pública live sobre Render; el smoke privado de Neon queda
> separado. La fuente operativa general sigue siendo `STATE.md`.

## Objetivo

Agregar un wizard corto para que una persona describa su empresa en lenguaje
natural y revise un JSON estructurado antes de que Noah lo aplique al tenant.
El inventario es opcional; no se inventan datos faltantes.

La demo de video y el espacio de prueba son dos modos separados. La demo puede
abrir con el fixture sintético de Atlas Services. Un tenant de prueba empieza
vacío y queda libre para recorrer el flujo completo. Ninguna pantalla debe
hacer pasar datos ficticios por datos reales.

## Decisiones congeladas para evitar drift

1. **Inferencia:** Nebius Token Factory es la ruta conectada y NVIDIA/Nemotron
   es la familia permitida. PostgreSQL/Neon solo persiste estado; no infiere.
2. **OpenCode2API:** queda como transporte gratuito, opt-in y sintético para
   la demo autorizada. No recibe texto privado de onboarding ni se usa como
   fallback para un tenant de prueba.
3. **`ProviderResult`:** es el sobre técnico común (`provider`, `model`, `text`,
   `error`) que conserva procedencia. No es un tercer proveedor y no reemplaza
   el JSON de negocio. Su contrato está en
   `contracts/provider-result.schema.json`.
4. **Persistencia:** Neon Free es la fuente durable actual. No se agrega
   Supabase ni se mezcla con la base Render legacy.
5. **Hosting:** Render manual es el flujo activo. Vercel permanece fuera de
   alcance y no debe aparecer como destino de deploy.
6. **Demo:** `tenant-demo` puede contener únicamente el fixture sintético de
   Atlas Services. No se usa para probar datos reales del operador.
7. **Playground:** cada tenant de prueba debe iniciar sin inventario ni datos
   de Atlas. El onboarding escribe únicamente después de la confirmación
   explícita del usuario.
8. **Efectos:** Gmail, Calendar, pagos y cualquier mutación externa siguen
   apagados durante este workstream.
9. **Secretos:** claves, prompts completos, tokens y respuestas privadas no se
   guardan en el repo, Graphify, logs ni frontend.

## Modos de uso

| Modo | Tenant | Datos iniciales | Ruta de modelo | Propósito |
|---|---|---|---|---|
| Demo | `tenant-demo` | Fixture sintético Atlas, visible como sandbox | Nebius si está configurado; OpenCode2API solo si la demo sintética lo permite | Video y revisión rápida |
| Playground | Tenant aislado por autenticación | Vacío | Nebius para texto del usuario; fallback manual si no está disponible | Test libre de punta a punta |

El modo no se decide por una bandera enviada desde el navegador. El backend lo
deriva del tenant autenticado y de su estado persistido. El frontend solo
presenta el estado devuelto por `bootstrap`.

## Implementación de fase 1

`GET /api/v1/bootstrap` devuelve un bloque `workspace` derivado del tenant
autenticado. La forma observable es:

```json
{
  "mode": "playground",
  "data_source": "empty",
  "fixture_id": null,
  "synthetic": false
}
```

La misma respuesta para `tenant-demo` declara
`mode=demo`, `data_source=synthetic-fixture`, `fixture_id=atlas-v1` y
`synthetic=true`.

- Solo `tenant-demo` puede sembrar `fixtures/atlas.json`; `seed_demo` rechaza
  cualquier otro tenant antes de tocar datos.
- Un tenant autenticado distinto de `tenant-demo` se crea con negocio,
  conexiones, mensajes, calendario, finanzas y documentos vacíos.
- Los snapshots cargados desde persistencia reciben metadata compatible sin
  cambiar de tenant ni copiar registros entre tenants.
- Las conexiones demo ya no aparecen como fallback para un playground.
- La UI arranca en estado neutral y muestra una banda visible de `Demo sandbox`
  o `Playground vacío` solo después de leer `bootstrap`; nunca pinta Atlas
  mientras todavía desconoce el modo.

La verificación de esta fase es local y está registrada en
[`evidence/phase-1-playground.md`](evidence/phase-1-playground.md). El deploy
manual que actualizará Render queda separado de esta fase para no confundir
una prueba local con evidencia live.

## Implementación de fase 2

El playground ahora abre un `OnboardingWizard` después de recibir
`bootstrap.workspace.mode=playground`. El shell cubre los estados de producto
sin afirmar que la extracción real ya esté conectada:

- bienvenida con propósito, alcance del playground y acceso al skip;
- descripción libre con ejemplo y validación mínima de entrada;
- estado de preparación claramente marcado como local;
- revisión editable del shape `onboarding.v1`, JSON visible y
  `missing_fields` recalculado;
- salida de preview para confirmar o saltear sin escribir en el backend.

El helper local solo conserva texto que el usuario proporcionó y deja en
`null` zona horaria, moneda y locale si no fueron indicados. Esto permite
probar la interacción sin convertir un parser de UI en sustituto de Nebius.
La fase 3 reemplazó esa transición local por extracción NVIDIA/Nebius; la fase
4 conectó confirmación, skip e idempotencia.

## Implementación de fase 3

El paso de extracción ya está conectado al backend, pero sigue siendo una
operación de borrador: no llama `ensure_tenant`, no guarda el prompt ni muta
`business` o `inventory`.

- `POST /api/v1/onboarding/extract` acepta solo texto acotado y un tenant de
  playground; el tenant demo recibe `ONBOARDING_DEMO_FORBIDDEN`.
- La ruta fuerza `NvidiaRouter.complete(..., allow_free_synthetic=false)` y
  valida que la ruta efectiva sea Nebius con un modelo NVIDIA Nemotron. No
  existe fallback a OpenCode2API para texto privado.
- `services/api/onboarding.py` valida respuesta estricta JSON contra el shape
  `onboarding.v1`, rechaza campos extra y exige que `missing_fields` coincida
  con los valores nulos y el inventario vacío.
- `ProviderResult` conserva `provider`, `model`, `text` y `error`; en errores
  de parseo el API no devuelve el texto inválido al navegador.
- El wizard muestra la procedencia/modelo en la revisión y conserva el texto
  si Nebius no está configurado, ofreciendo reintento o edición manual.
- OpenCode2API continúa limitado al sandbox sintético de la demo autorizada.

La cobertura de la fase está en
[`evidence/phase-3-nebius-extraction.md`](evidence/phase-3-nebius-extraction.md).

## Implementación de fase 4

La confirmación y el skip ahora son mutaciones explícitas, tenant-safe y
persistibles en el snapshot JSONB de Neon. El frontend conserva el mismo
reintento idempotente durante la sesión y no recibe ninguna clave de proveedor
ni de base de datos.

- `GET /api/v1/onboarding` devuelve el estado sanitizado y el modo derivado
  del tenant autenticado.
- `POST /api/v1/onboarding/complete` exige `confirmation=confirm`, un
  `Idempotency-Key`, `business.name` y `business.description`; aplica solo los
  campos revisados, reemplaza el inventario de onboarding de forma
  determinista, registra auditoría y guarda `source=user_input`.
- `POST /api/v1/onboarding/skip` exige `confirmation=skip`,
  `source=synthetic_fixture` e idempotencia; no llama ningún proveedor y copia
  el fixture Atlas desde un snapshot temporal, remapeando todos los
  `tenant_id` al playground sin mutar `tenant-demo`.
- Un tenant ya finalizado o un playground con datos no se pisa. Un reintento
  con la misma clave devuelve la respuesta guardada; una clave reutilizada con
  otro payload se rechaza.
- `bootstrap.workspace` distingue `empty`, `onboarding` y
  `synthetic-fixture`, y la UI deja de mostrar el wizard después de una
  decisión persistida.
- No se agregó migración específica: Neon guarda el estado extendido en el
  mismo snapshot tenant-scoped que ya valida `state.tenant_id`.

La evidencia automatizada está en
[`evidence/phase-4-onboarding-persistence.md`](evidence/phase-4-onboarding-persistence.md).

## Contrato JSON v1

El schema machine-readable es
[`contracts/onboarding.v1.schema.json`](../../contracts/onboarding.v1.schema.json).
La extracción debe producir exactamente este shape, aunque algunos valores
sean `null` mientras el usuario los completa:

```json
{
  "schema_version": "onboarding.v1",
  "business": {
    "name": "Taller Norte",
    "description": "Mantenimiento de equipos industriales",
    "category": "Servicios técnicos",
    "timezone": "America/Argentina/Buenos_Aires",
    "currency": "ARS",
    "locale": "es-AR"
  },
  "inventory": [],
  "missing_fields": ["inventory"]
}
```

Reglas de interpretación:

- `business.name` y `business.description` deben estar completos para
  confirmar; el resto puede completarse después.
- `inventory` vacío significa “no informado”, no “inventario confirmado en
  cero”. Por eso el modelo agrega `inventory` a `missing_fields`.
- `missing_fields` obliga a declarar la incertidumbre. El modelo no debe
  rellenar nombres, cantidades, moneda o zona horaria por intuición.
- Cada item de inventario conserva solo `name`, `sku`, `quantity` y `unit`.
  No se agregan precios ni efectos de stock en esta primera versión.

## Flujo del wizard

1. **Bienvenida:** explicar que se configurará un tenant de prueba y ofrecer
   “Comenzar” o “Saltar y explorar con datos ficticios”.
2. **Descripción libre:** una caja de texto con un ejemplo corto; el usuario
   puede mencionar nombre, actividad e inventario si lo tiene.
3. **Extracción:** el API envía el texto del usuario únicamente a Nebius y
   recibe un `ProviderResult`. La extracción es un borrador y no muta el
   negocio.
4. **Revisión:** mostrar el JSON como campos editables, `missing_fields` y la
   procedencia/modelo sin revelar claves. El usuario puede corregir todo.
5. **Confirmación:** solo “Confirmar configuración” aplica el JSON validado al
   tenant. La operación debe ser idempotente y auditable.
6. **Salida:** mostrar el resumen configurado y habilitar el tour cuando ese
   workstream esté implementado.

El botón de skip debe mostrar exactamente esta intención antes de actuar:

> Si salteás el onboarding, no se usarán tus datos. Se cargarán datos ficticios
> de Atlas Services para que puedas explorar la aplicación. No son datos reales
> y no se ejecutará ninguna acción externa.

El skip no llama al modelo: aplica una copia del fixture sintético de Atlas una
sola vez al tenant de playground y guarda `onboarding.source=synthetic_fixture`.

## Contrato de API reservado

Estas son las rutas implementadas en la fase 4:

| Operación | Efecto permitido | Requisito |
|---|---|---|
| `GET /api/v1/onboarding` | Lectura | Devuelve estado, modo y draft sanitizado |
| `POST /api/v1/onboarding/extract` | Ninguno | Texto, tenant no demo, Nebius disponible |
| `POST /api/v1/onboarding/complete` | Escribe business/inventory | JSON validado y confirmación explícita |
| `POST /api/v1/onboarding/skip` | Siembra fixture sintético | Confirmación explícita e idempotency key |

Separar `extract` de `complete` evita que una respuesta del modelo se convierta
en configuración sin revisión. El backend debe rechazar payloads con tenant
distinto al autenticado, schema incorrecto, campos desconocidos o repetición de
un skip con una fuente diferente.

## Frontera de proveedores

```text
texto privado del usuario
        |
        v
POST onboarding/extract (sin escribir)
        |
        v
NvidiaRouter -> NebiusProvider -> ProviderResult
        |
        v
parseo estricto + onboarding.v1.schema.json
        |
        v
revisión humana -> complete -> snapshot Neon tenant-safe
```

OpenCode2API queda fuera de ese camino. Solo puede aparecer en la demo
sintética ya autorizada y siempre debe devolver `provider=opencode2api` dentro
de `ProviderResult`; si el gateway declara un modelo que no es Nemotron, se
rechaza. Si Nebius no está configurado para un playground, la UI debe ofrecer
completar manualmente o reintentar, nunca reenviar el texto a otra ruta.

## Persistencia y auditoría

- `extract` no guarda el prompt crudo ni el texto privado; como máximo guarda
  estado de borrador sanitizado, proveedor, modelo, error y hash de trazabilidad.
- `complete` persiste business, inventario y estado de onboarding en el
  snapshot del mismo tenant, con validación `state.tenant_id == tenant_id` y
  `Idempotency-Key` obligatorio.
- `skip` es idempotente: un refresh no duplica servicios, documentos, acciones
  ni inventario sintético, y no borra datos que el playground ya tenía.
- La auditoría registra la decisión (`completed` o `skipped`) y la fuente, no
  secretos ni contenido sensible.
- El tour es posterior: no puede marcarse como visto ni iniciar antes de que el
  estado sea `completed` o `skipped`.

## Roadmap por fases

| Fase | Entrega | Criterio de salida | Estado |
|---|---|---|---|
| 0 | Contrato, modos, límites de proveedor, skip y criterios anti-drift | Schema versionado, rutas reservadas, copia exacta del warning y reglas alineadas con `STATE.md` | **Cerrada** |
| 1 | Aislamiento demo/playground | Demo conserva Atlas; tenant nuevo queda vacío; snapshots tenant-safe no cruzan datos | **Cerrada en local** |
| 2 | Shell del wizard | Estados bienvenida, texto, carga, revisión y salida; sin llamada de modelo todavía | **Cerrada en local** |
| 3 | Extracción Nebius | Prompt estructurado, parseo estricto, errores visibles, sin escritura automática | **Cerrada · Render publicado** |
| 4 | Confirmación y skip | Aplicación idempotente, auditoría, fixture sintético y warning verificable | **Cerrada · Render publicado** |
| 5 | Prueba de lado a lado | Navegador limpio: demo, onboarding, edición, confirmación, skip y aislamiento; evidencia guardada | **En publicación · local verificada; smoke público pendiente** |
| 6 | Tour guiado | Anchors declarativos, teclado/reduced motion y persistencia posterior a onboarding | Pendiente |
| 7 | Entrega | Render manual, Graphify actualizado, README/demo script y checklist reproducible | Pendiente |

El orden deja el tour para el final y permite testear el flujo completo antes
de invertir tiempo en pulido de presentación. La estimación vigente es de
10–12 días de trabajo más buffer antes de la deadline del 2026-10-05.

## Criterios de aceptación del workstream

- [x] Un texto de usuario produce un borrador `onboarding.v1` con procedencia
      Nebius y sin mutar el tenant.
- [x] Un JSON inválido, incompleto o con campos extra queda en revisión y
      muestra un error corregible.
- [x] OpenCode2API nunca recibe el texto privado del playground.
- [x] Confirmar dos veces no duplica ni pisa otro tenant.
- [x] Skip muestra el warning, no llama al modelo y siembra solo datos
      sintéticos de Atlas.
- [ ] Reiniciar el API conserva el estado en Neon y respeta el tenant (pendiente
      de smoke live con un tenant playground de producción).
- [ ] El tour no aparece antes de completar o saltear explícitamente.
- [ ] Ninguna clave o token aparece en UI, logs, Graphify, contratos o commits.

## Límites acumulados

Fase 0 no agrega endpoints, componentes React, migraciones ni despliegues. Fase
1 no agrega el wizard ni llama a un modelo: solo hace visible y verificable el
aislamiento de los dos modos. Fase 2 agrega únicamente el shell y su preview
local; no agrega endpoints, llamadas de proveedor ni escritura durable. Fase
4 no agrega el tour guiado ni activa efectos Gmail/Calendar, pagos o cualquier
otra mutación externa.
