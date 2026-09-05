# ADR-0002 — Abstracción de proveedor de IA

## Estado
Aceptado

## Decisión
DeepSeek será el proveedor inicial, pero se accederá exclusivamente mediante una interfaz interna `AIProvider`.

## Motivo
Permitir cambiar de proveedor sin modificar la lógica de negocio.

## Consecuencias
- Se necesita un adapter.
- Las respuestas del proveedor se mapean a modelos internos.
- Los prompts específicos quedan aislados.
- La configuración del proveedor queda separada del dominio.
