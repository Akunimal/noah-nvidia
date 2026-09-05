# Fase 2 — evidencia del shell de onboarding

Fecha: 2026-09-05

Alcance: primera experiencia del playground, sin llamada a modelo, sin
persistencia y sin efectos externos.

## Entrega

- `OnboardingWizard` muestra bienvenida, descripción libre, preparación,
  revisión y salida.
- La descripción se transforma en un borrador local con el shape
  `onboarding.v1` para probar el flujo visual.
- La revisión permite editar nombre, actividad, categoría, zona horaria,
  moneda, locale e inventario opcional.
- `missing_fields` se recalcula después de cada edición y el JSON queda visible
  junto con la procedencia del shell.
- El wizard aparece automáticamente después de `bootstrap` para un playground
  y no aparece en `tenant-demo`.
- El skip muestra el texto de intención definido en el roadmap. En esta fase
  solo cambia la vista local; no siembra Atlas. La siembra idempotente queda
  reservada para fase 4.
- El botón del banner permite reabrir el shell desde el playground.

## Verificación

Pruebas automatizadas ejecutadas desde `C:\Noe\noah-nvidia`:

```text
apps/web: npm run test       6 tests passed
apps/web: npm run typecheck  OK
apps/web: npm run lint       OK
apps/web: npm run build      OK
git diff --check              OK
```

Validación visual local:

```text
API:    127.0.0.1:8000 con tenant sintético `tenant-phase2-preview`
Web:    127.0.0.1:5173 con VITE_API_BASE_URL local
Estado: Playground vacío → Onboarding → Bienvenida visible
API:    solo GET /health, /bootstrap y colecciones; ningún POST del wizard
```

## Límites honestos

La extracción real vía Nebius/NVIDIA, `ProviderResult`, confirmación durable y
skip con fixture todavía no están implementados en esta fase. No se hizo
deploy live ni se enviaron datos a un proveedor.
