# Onboarding simple de Noah Nvidia

> Contrato y roadmap del workstream de onboarding. Fase 0 cerrada el
> 2026-09-05. La fuente operativa general sigue siendo `STATE.md`.

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

Estos nombres describen la siguiente implementación; en fase 0 no se declaran
como rutas live ni se simula que ya existen:

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
  snapshot del mismo tenant, con validación `state.tenant_id == tenant_id`.
- `skip` es idempotente: un refresh no duplica servicios, documentos, acciones
  ni inventario sintético.
- La auditoría registra la decisión (`completed` o `skipped`) y la fuente, no
  secretos ni contenido sensible.
- El tour es posterior: no puede marcarse como visto ni iniciar antes de que el
  estado sea `completed` o `skipped`.

## Roadmap por fases

| Fase | Entrega | Criterio de salida | Estado |
|---|---|---|---|
| 0 | Contrato, modos, límites de proveedor, skip y criterios anti-drift | Schema versionado, rutas reservadas, copia exacta del warning y reglas alineadas con `STATE.md` | **Cerrada** |
| 1 | Aislamiento demo/playground | Demo conserva Atlas; tenant nuevo queda vacío; Neon conserva ambos sin cruces | Pendiente |
| 2 | Shell del wizard | Estados bienvenida, texto, carga, revisión y salida; sin llamada de modelo todavía | Pendiente |
| 3 | Extracción Nebius | Prompt estructurado, parseo estricto, errores visibles, sin escritura automática | Pendiente |
| 4 | Confirmación y skip | Aplicación idempotente, auditoría, fixture sintético y warning verificable | Pendiente |
| 5 | Prueba de lado a lado | Navegador limpio: demo, onboarding, edición, confirmación, skip y aislamiento; evidencia guardada | Pendiente |
| 6 | Tour guiado | Anchors declarativos, teclado/reduced motion y persistencia posterior a onboarding | Pendiente |
| 7 | Entrega | Render manual, Graphify actualizado, README/demo script y checklist reproducible | Pendiente |

El orden deja el tour para el final y permite testear el flujo completo antes
de invertir tiempo en pulido de presentación. La estimación vigente es de
10–12 días de trabajo más buffer antes de la deadline del 2026-10-05.

## Criterios de aceptación del workstream

- [ ] Un texto de usuario produce un borrador `onboarding.v1` con procedencia
      Nebius y sin mutar el tenant.
- [ ] Un JSON inválido, incompleto o con campos extra queda en revisión y
      muestra un error corregible.
- [ ] Confirmar dos veces no duplica ni pisa otro tenant.
- [ ] Skip muestra el warning, no llama al modelo y siembra solo datos
      sintéticos de Atlas.
- [ ] OpenCode2API nunca recibe el texto privado del playground.
- [ ] Reiniciar el API conserva el estado en Neon y respeta el tenant.
- [ ] El tour no aparece antes de completar o saltear explícitamente.
- [ ] Ninguna clave o token aparece en UI, logs, Graphify, contratos o commits.

## Fuera de fase 0

Fase 0 no agrega endpoints, componentes React, migraciones ni despliegues. No
se afirma que el onboarding esté disponible todavía; deja el contrato cerrado
para que las fases de código puedan avanzar sin reinterpretar el producto.
