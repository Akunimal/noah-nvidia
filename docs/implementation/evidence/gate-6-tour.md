# Gate 6 — Tour guiado del reviewer

Fecha de verificación local: 2026-09-06 21:28 ART  
Repositorio: `Akunimal/noah-nvidia`  
Deploy verificado: Static Site Render `noah-nvidia-web`,
`dep-daf0deeq1p3s73b4qv20`, estado `Deploy succeeded`

## Alcance

Se agregó un tour guiado de cinco pasos para el reviewer del playground. El
tour usa anchors declarativos (`data-tour`) sobre Overview, Assistant,
Approvals, Knowledge y Settings. No depende de posiciones fijas del DOM ni
introduce un proveedor nuevo.

La superficie visible queda en inglés. La guía explica contexto, lenguaje
natural, aprobaciones, respuestas con fuentes y las fronteras de NVIDIA/Neon.
La entrada libre del onboarding conserva soporte multilingüe.

## Verificación funcional

- Skip desde un tenant local vacío: se mostró la advertencia, se confirmó la
  decisión y se cargó únicamente el fixture sintético Atlas Services.
- El botón `Explore playground` abrió el tour en el primer paso.
- Se recorrieron los cinco pasos con `Next`; la navegación cambió de forma
  visible a Overview, Assistant, Approvals, Knowledge y Settings.
- Se cerró el tour con `Finish tour`; la UI mostró `Replay guided tour`.
- Tras recargar la pestaña, el tour no reapareció automáticamente y el replay
  siguió disponible.
- Se reabrió el tour y se cerró con `Escape`.
- En la URL pública `https://noah-nvidia-web.onrender.com/`, tras recargar el
  bundle de `7bceac6`, se repitió el skip y se recorrieron los cinco pasos;
  Settings mostró el límite `postgres-jsonb` y el cierre dejó
  `Replay guided tour`.
- La implementación incluye navegación `ArrowLeft`/`ArrowRight`, trampa de
  foco con `Tab`, restauración del foco previo, `prefers-reduced-motion` y
  reubicación ante scroll/resize.

## Verificación técnica

Desde `apps/web`:

| Comando | Resultado |
|---|---|
| `npm test -- --run` | 3 archivos, 8 tests, 8 passed |
| `npm run lint` | passed |
| `npm run typecheck` | passed |
| `npm run build` | passed; Vite generó `apps/web/dist` |

La regresión completa del API con el entorno Python fijado (`services/api/.venv`)
dio 54 tests passed; quedó solo un warning de deprecación de Starlette.

El API local se ejecutó con `NOAH_PUBLIC_DEMO=true`,
`NOAH_REQUIRE_AUTH=false` y `NOAH_ENABLE_EXTERNAL_EFFECTS=false`; el bootstrap
declaró playground vacío, sandbox sintético y efectos externos desactivados.
No se consumió crédito ni se llamó a un modelo durante la verificación del
tour.

## Persistencia y límites

El marcador del tour es `noah-guided-tour:v1:<tenant>` y vive en el navegador
por tenant. Solo se escribe cuando el onboarding ya está `completed` o
`skipped`; el test de unidad cubre ambas condiciones y el rechazo de
`not_started`. No se guarda texto privado, clave, token ni respuesta de
proveedor.

El smoke de Neon con un bearer privado válido continúa separado en Gate 5. La
prueba live pública no requiere ese bearer; un intento con un bearer sintético
fue rechazado por `AUTH_REQUIRED`, lo que confirma que la ruta protegida no
acepta credenciales inventadas. No se registra ningún secreto.

Graphify se actualizó después de los cambios de código y documentación:
1003 nodos, 1739 enlaces y 84 comunidades. La comprobación de integridad sobre
el grafo generado encontró 0 endpoints faltantes y 0 self-loops. La ejecución
avisó que falta `tree_sitter_sql` para enriquecer un archivo SQL y que las
etiquetas de comunidades pueden refrescarse con el comando de labeling; no se
instaló nada ni se consumió una API para este cierre.

## Estado de salida

Gate 6 queda cerrado con verificación local y live en Render. El roadmap
continúa con Gate 8 (hardening/cutover del 2026-10-27) y Gate 9
(entrega/freeze).
