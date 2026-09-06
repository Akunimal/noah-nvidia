# Onboarding simple de Noah Nvidia

> Contrato y roadmap del workstream de onboarding. Las fases 0 a 5 están
> cerradas; las fases 6 a 9 quedan como trabajo de entrega. La demo pública
> live corre sobre Render y la política de apertura NVIDIA/Nemotron queda
> gobernada por backend y fecha. El smoke privado de Neon queda separado. La
> fuente operativa general sigue siendo `STATE.md`.

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
10. **Apertura pública:** la demo Render permanece sintética hasta la ventana
    configurada en backend. Luego solo puede usar Nebius/NVIDIA Nemotron con un
    límite global en memoria; un error de crédito vuelve a modo sintético.
11. **BYOK de reviewer:** como último recurso, una clave NVIDIA NIM o Nebius se
    acepta solo por headers de una sesión, con destino fijo, modelo Nemotron y
    cuota separada. Nunca se persiste ni se expone la clave.
12. **Evaluación de proveedor:** Promptfoo evalúa el mismo conjunto de casos,
    instrucciones y contrato JSON que usará la ruta Nebius. El harness local
    determinista ya está cerrado sin gastar crédito; la evaluación conectada
    queda separada y usa endpoint/clave solo por variables privadas.
    OpenCode2API solo participa como sandbox sintético, con endpoint y clave
    por variables de entorno. No se afirma paridad de pesos hasta verificar
    que el gateway expone exactamente `nvidia/nemotron-3-super-120b-a12b`.
13. **Cambio público:** el 2026-10-27 se conserva la URL pública y se verifica
    el cambio efectivo a Nebius/NVIDIA; OpenCode2API permanece desactivado en
    Render. Cambiar de proveedor no significa cerrar la demo ni crear una ruta
    de fallback pública distinta de la ya documentada.

## Modos de uso

| Modo | Tenant | Datos iniciales | Ruta de modelo | Propósito |
|---|---|---|---|---|
| Demo | `tenant-demo` | Fixture sintético Atlas, visible como sandbox | Nebius si está configurado; OpenCode2API solo si la demo sintética lo permite | Video y revisión rápida |
| Demo pública | Tenant efímero por navegador | Vacío hasta skip explícito | Sintético programado; Nebius/Nemotron solo en ventana; BYOK allowlisted opcional | URL pública y evaluación |
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

- `POST /api/v1/onboarding/extract` acepta solo texto acotado. El tenant demo
  de video sigue recibiendo `ONBOARDING_DEMO_FORBIDDEN`; el playground privado
  usa Nebius y la demo pública puede usar únicamente la ventana server-side o
  el BYOK allowlisted del reviewer.
- La ruta privada fuerza `NvidiaRouter.complete(..., allow_free_synthetic=false)`
  y valida Nebius con un modelo NVIDIA Nemotron. La ruta pública nunca usa
  OpenCode2API y, si no hay ventana, crédito o clave válida, ofrece el camino
  manual sin afirmar una extracción real.
- `services/api/onboarding.py` valida respuesta estricta JSON contra el shape
  `onboarding.v1`, rechaza campos extra y exige que `missing_fields` coincida
  con los valores nulos y el inventario vacío.
- `ProviderResult` conserva `provider`, `model`, `text` y `error`; en errores
  de parseo el API no devuelve el texto inválido al navegador.
- El wizard muestra la procedencia/modelo en la revisión y conserva el texto
  si la ruta NVIDIA no está disponible, ofreciendo reintento, BYOK temporal o
  edición manual.
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
3. **Extracción:** el API envía el texto del usuario únicamente a Nebius o a
   NVIDIA NIM allowlisted y recibe un `ProviderResult`. En la demo pública la
   ruta server-side solo se abre dentro de la ventana programada; BYOK es
   opcional y siempre temporal. La extracción es un borrador y no muta el
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
| `POST /api/v1/onboarding/extract` | Ninguno | Texto acotado; Nebius privado o ventana/BYOK público disponible |
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
NvidiaRouter -> NebiusProvider / ReviewerProvider -> ProviderResult
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
rechaza. Para la demo pública, `ReviewerProvider` solo acepta NVIDIA NIM o
Nebius, fija el destino en el servidor y limita el número de llamadas. Si no
hay ruta disponible, la UI ofrece completar manualmente o reintentar, nunca
reenvía el texto a una familia ajena a NVIDIA.

## Evaluación Promptfoo y cambio público

Promptfoo será un arnés de evaluación y no una ruta nueva del producto. Debe
probar el mismo flujo de extracción, las mismas instrucciones y el mismo
contrato `onboarding.v1` que se usará con Nebius/Nemotron.

### Gate de paridad honesta

- El modelo canónico de producción es
  `nvidia/nemotron-3-super-120b-a12b`.
- Antes de ejecutar la evaluación se debe verificar el identificador real que
  admite OpenCode2API. El alias sintético actual
  `nemotron-3-ultra-free` no demuestra que sean los mismos pesos.
- Si el gateway admite el modelo canónico, Promptfoo lo configura con ese
  identificador y el resultado se registra como comparación del mismo modelo
  por dos transportes.
- Si no lo admite, se conservan los mismos casos, prompt, schema y assertions,
  pero se reportan `provider` y `model` por separado como evaluación de
  contrato/guardrails. No se llama “paridad de modelo” ni se cambia Nebius por
  el alias gratuito.
- La configuración de Promptfoo no contiene claves. El endpoint y el token
  llegan únicamente por variables privadas del entorno; los casos usan datos
  sintéticos de `tests/evals/cases.json`, nunca texto privado de onboarding.

### Criterios de salida de la evaluación

La evidencia debe conservar solo resultados redactados y metadatos seguros:
proveedor, modelo, latencia, uso aproximado, pass/fail y errores de validación.
Como mínimo se verifican:

- El harness local ejecuta 15/15 casos sintéticos, valida el prompt canónico y
  `onboarding.v1`, y demuestra cero llamadas de modelo y cero efectos externos.
- La ejecución conectada reutiliza los mismos casos y assertions; su provider,
  modelo, costo/uso y resultado se registran por separado.

- JSON válido y estricto contra `onboarding.v1`;
- `missing_fields` correcto, campos desconocidos rechazados y no invención de
  inventario;
- resistencia a prompt injection y ausencia de acciones externas;
- procedencia visible mediante `ProviderResult`;
- fallback determinístico honesto cuando no hay crédito o ruta disponible.

### Checklist del cutover del 2026-10-27

1. Mantener `https://noah-nvidia-web.onrender.com/` accesible y gratuita.
2. Confirmar desde `bootstrap.public_ai` que el modo efectivo sea Nebius,
   que el proveedor sea `nebius` y que el modelo sea el canónico.
3. Confirmar `NOAH_ALLOW_FREE_SYNTHETIC=false` y que OpenCode2API no tenga una
   URL o clave operativa en Render.
4. Ejecutar desde un navegador limpio: bootstrap, extracción, revisión,
   confirmación, skip, aislamiento y fallback por cuota; guardar evidencia
   sin tokens ni prompts privados.
5. Si el crédito lo permite, extender la ventana server-side de Nebius para
   que el evaluador pueda usar el flujo real durante el período de judging.
   Si no lo permite, mantener el flujo sintético completo, gratuito y
   claramente rotulado; nunca simular que fue una respuesta NVIDIA real.

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
| 5 | Prueba de lado a lado | Navegador limpio: demo, onboarding, edición, confirmación, skip y aislamiento; evidencia guardada | **Cerrada · Render público verificado** |
| 6 | Tour guiado | Anchors declarativos, teclado/reduced motion y persistencia posterior a onboarding | Pendiente |
| 7 | Evaluación de proveedor | Harness local Promptfoo 15/15 cerrado; modelo canónico conectado verificado o diferencia documentada; evidencia redactada | **Local cerrado · conexión pendiente** |
| 8 | Cutover y hardening del reviewer | URL abierta, Nebius efectivo desde el 2026-10-27, OpenCode2API desactivado, cuotas/fallback/CORS/cold start verificados | Pendiente |
| 9 | Entrega y freeze | README, Devpost, video público menor a 3 minutos, licencia, instrucciones de prueba, Graphify y release reproducible | Pendiente |

El orden deja el tour para el final y permite testear el flujo completo antes
de invertir tiempo en pulido de presentación. La deadline oficial es el
2026-10-30 a las 10:00 PDT (14:00 ART); el 2026-10-05 solo vence el recurso
Render PostgreSQL legacy y no es la deadline del hackathon.

### Calendario operativo

- **2026-09-06 a 2026-09-20:** Promptfoo, verificación de modelo y evidencia
  conectada de Nebius.
- **2026-09-21 a 2026-10-10:** tour guiado, hardening del reviewer y nueva
  prueba de navegador limpio; retirar referencias obsoletas al 5 de octubre.
- **2026-10-11 a 2026-10-20:** README/Devpost en inglés, video, instrucciones
  de evaluación y ensayo de entrega; congelar el alcance al terminar.
- **2026-10-21 a 2026-10-26:** revisión final de créditos, secretos, CORS,
  límites, rollback y deploy manual reproducible.
- **2026-10-27:** cutover público a Nebius/Nemotron y smoke live de reviewer.
- **2026-10-30 10:00 PDT:** enviar antes de la deadline y dejar la URL
  disponible durante el judging, sin paywall ni claves expuestas.

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
- [x] Promptfoo local ejecuta los mismos casos, prompt y schema con provider
      sintético determinista: 15/15, sin llamadas de modelo ni efectos externos.
- [ ] La evaluación conectada reutiliza los mismos casos y assertions; la
      paridad de modelo se confirma o se etiqueta honestamente como comparación
      de contrato.
- [ ] El 2026-10-27 `bootstrap.public_ai` y una extracción real muestran
      Nebius/Nemotron, mientras OpenCode2API permanece desactivado.
- [ ] El reviewer puede completar el flujo sin costo durante el judging; si el
      crédito Nebius no alcanza, el fallback sintético queda visible y completo.
- [ ] README, repositorio público con licencia, video en inglés, URL live y
      pasos reproducibles cumplen el paquete de entrega.
- [ ] Ninguna clave o token aparece en UI, logs, Graphify, contratos o commits.

## Límites acumulados

Fase 0 no agrega endpoints, componentes React, migraciones ni despliegues. Fase
1 no agrega el wizard ni llama a un modelo: solo hace visible y verificable el
aislamiento de los dos modos. Fase 2 agrega únicamente el shell y su preview
local; no agrega endpoints, llamadas de proveedor ni escritura durable. Fase
4 no agrega el tour guiado ni activa efectos Gmail/Calendar, pagos o cualquier
otra mutación externa.
