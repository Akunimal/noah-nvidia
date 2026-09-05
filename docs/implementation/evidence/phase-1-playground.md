# Fase 1 — evidencia de aislamiento demo/playground

Fecha: 2026-09-05

Alcance: separar el tenant de video `tenant-demo` de cualquier tenant de
prueba, sin agregar todavía el wizard ni llamadas nuevas a modelos.

## Entrega

- El backend deriva `workspace.mode` del tenant autenticado.
- `tenant-demo` conserva únicamente el fixture sintético Atlas (`atlas-v1`).
- Los tenants autenticados restantes arrancan con negocio, conexiones y
  colecciones vacías.
- El fallback de conexiones `demo-connected` quedó limitado a `tenant-demo`.
- La UI no muestra Atlas antes de conocer el modo y deja visible el estado
  `Demo sandbox` o `Playground vacío`.
- Un guard explícito impide ejecutar `seed_demo` sobre un tenant de prueba.
- Una escritura exclusiva del playground no aparece en el catálogo demo.

## Verificación

Ejecutado desde `C:\Noe\noah-nvidia`:

```text
uv run --python 3.12 --with-requirements services/api/requirements-dev.txt python -m pytest -q
39 passed, 1 warning

apps/web: npm run typecheck   OK
apps/web: npm run lint        OK
apps/web: npm run build       OK
git diff --check              OK
```

Las pruebas nuevas en `services/api/test_main.py` cubren:

1. metadata demo y conexiones sintéticas declaradas;
2. bootstrap vacío del playground en acciones, mail, calendario, ledger,
   documentos, quotes y receivables;
3. rechazo de siembra Atlas en un tenant distinto;
4. aislamiento de una escritura del playground respecto del catálogo demo.

## Límites honestos

Esta evidencia no afirma un deploy live. Render sigue siendo manual y el
próximo paso operativo después del commit es publicar y repetir bootstrap con
el token demo y un tenant de prueba aislado. Neon continúa siendo la fuente
durable, sin agregar Supabase ni Vercel.
