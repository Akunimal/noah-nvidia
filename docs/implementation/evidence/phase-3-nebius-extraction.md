# Fase 3 — extracción estructurada con Nebius

Fecha: 2026-09-05  
Estado: **cerrada en local; deploy manual pendiente**

## Alcance

La descripción privada del playground ahora pasa por
`POST /api/v1/onboarding/extract`. La ruta usa únicamente la instancia
Nebius/NVIDIA declarada por `NvidiaRouter`, devuelve un borrador revisable y no
persiste el prompt, `business`, `inventory` ni un estado de onboarding.

El tenant sintético `tenant-demo` se rechaza antes de llamar al proveedor.
OpenCode2API sigue fuera de este camino y continúa reservado al sandbox
sintético autorizado.

## Implementación verificada

- `services/api/onboarding.py` valida el JSON con campos extra prohibidos,
  límites del contrato, formato de moneda/locale, items de inventario y
  `missing_fields` coherente con los valores nulos.
- El API fuerza `allow_free_synthetic=false`, comprueba que el modelo sea
  NVIDIA Nemotron y conserva la procedencia mediante `ProviderResult`.
- Un error de proveedor o un JSON inválido devuelve código visible y no
  devuelve al navegador el texto de modelo inválido.
- El wizard muestra `provider · model`, mantiene la descripción ante errores y
  ofrece reintentar o editar un borrador manual vacío.
- `contracts/openapi.yaml` fue regenerado desde la app y documenta el endpoint
  y sus modelos.

## Verificación automatizada

Ejecutada desde `C:\Noe\noah-nvidia`:

```text
uv run --python 3.12 --with-requirements services/api/requirements-dev.txt python -m pytest -q
43 passed, 1 warning

apps/web: npm run test
6 tests passed

apps/web: npm run typecheck
OK
```

La prueba de extracción usa un `ProviderResult` Nebius sintético y confirma
que el texto llega solo a esa ruta, que no se habilita el fallback gratuito y
que el tenant no se crea ni se toca. Otras pruebas cubren falta de clave,
tenant demo y salida inválida sin eco del contenido.

## Límite honesto

Esta evidencia demuestra el contrato y el comportamiento local con una
respuesta Nebius simulada; no afirma todavía una extracción live desde Render.
El deploy manual y la prueba lado a lado quedan para la siguiente actividad,
sin cambiar claves ni habilitar efectos externos.
