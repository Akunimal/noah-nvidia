# RCA — build fallido del API en Render

Fecha: 2026-09-05  
Servicio: `noah-nvidia-api`  
Build fallido: `bld-dadvqjou01pc73cglr90`  
Deploy fallido: `dep-dadvqjou01pc73cglr8g`  
Commit: `8af42c373e033aeb3e499687b0fa01e4262fe87c`

## Síntoma

Render notificó `Exited with status 1` durante el primer deploy del backend.

## Traza observada

1. El runtime inició con `python3.14`.
2. `pydantic-core==2.33.2` no encontró un wheel compatible y descargó el
   source distribution `pydantic_core-2.33.2.tar.gz`.
3. `maturin` intentó compilar el componente Rust mediante Cargo.
4. Cargo no pudo crear su cache porque el filesystem de build de Render
   devolvió `Read-only file system (os error 30)`.
5. La instalación terminó en `metadata-generation-failed`.

## Causa raíz

La causa fue la selección implícita de Python 3.14 en el primer deploy, no un
fallo de Nebius, OpenCode2API, OAuth ni de las credenciales. Al no existir un
wheel adecuado para esa combinación, pip cayó en una compilación nativa que no
era viable en ese entorno.

## Resolución y estado actual

- Render muestra `PYTHON_VERSION=3.12.10` en el Environment del servicio.
- El mismo commit `8af42c3` desplegó correctamente después del pin
  (`dep-dadvrluq1p3s73fdne50`, 54.5 s).
- El deploy actual `bd45712` está marcado como `Live`
  (`dep-dae0ubp5efls739htlhg`, 44.8 s).
- La API continúa configurada con Nebius como ruta primaria y con efectos
  externos desactivados.
- Los valores de secretos se mantuvieron enmascarados y no se modificaron.

## Prevención

- Se agregó `.python-version` en la raíz del repositorio con `3.12.10`.
- Se agregó el mismo valor explícito a `render.yaml` para futuros servicios
  creados desde el Blueprint.
- El pin del panel de Render debe permanecer presente porque tiene precedencia
  sobre el archivo del repositorio.

No fue necesario cambiar dependencias ni redeployar el código de aplicación:
el servicio live ya estaba recuperado antes de esta RCA.
