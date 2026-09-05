# Fase 0 — evidencia del contrato de onboarding

Fecha: 2026-09-05

Alcance: contrato y anti-drift; sin cambio de runtime ni deploy.

## Entregables

- `contracts/onboarding.v1.schema.json`: shape validado para empresa,
  inventario opcional y campos faltantes explícitos.
- `contracts/provider-result.schema.json`: procedencia técnica separada del
  JSON de negocio.
- `docs/implementation/onboarding-roadmap.md`: modos demo/playground,
  flujo, rutas reservadas, política NVIDIA/Nebius y roadmap.
- `STATE.md`, `plan.md`, `README.md` y el README raíz alineados con el nuevo
  workstream.

## Decisiones verificadas

- Nebius/NVIDIA es la ruta para texto de usuario.
- OpenCode2API queda limitado a la demo sintética Nemotron-only.
- Neon es persistencia; Supabase y Vercel quedan fuera.
- El demo Atlas y el playground vacío son tenants separados.
- Skip es explícito, sintético, idempotente y sin llamada de modelo.
- El tour queda después de `completed` o `skipped`.

## Verificación de salida

- Ambos schemas se parsean como JSON válido y conservan sus identificadores de
  versión.
- `git diff --check` no reporta errores.
- La suite API existente se mantiene sin modificaciones de runtime: 36 tests
  pasan.
- Graphify se actualizó después de este cambio a 726 nodos y 1.207 relaciones;
  el health check no encontró endpoints huérfanos, loops ni colapsos. Como no
  había una clave Gemini/Google disponible, la parte documental se indexó de
  forma estructural y no se solicitó ninguna clave.
- No se agregaron secretos al corpus.

No se realizó deploy porque esta fase solo cambia contratos y documentación.
