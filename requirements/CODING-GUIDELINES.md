# Guías de implementación

## TypeScript
- `strict: true`.
- Evitar `any`.
- Tipos explícitos en fronteras.
- Preferir funciones pequeñas.

## Backend
- Controllers delgados.
- Casos de uso explícitos.
- Repositorios mediante interfaces.
- DTOs para entrada/salida.
- Validación antes de entrar al dominio.

## Frontend
- Mobile-first.
- Componentes accesibles.
- Server Components por defecto.
- Client Components solo cuando exista necesidad de interacción/estado.
- Estados loading/error/empty bien diseñados.

## Database
- Migraciones versionadas.
- Índices para foreign keys y consultas frecuentes.
- Constraints para invariantes.
- No guardar blobs grandes innecesariamente.

## API
- Versionar como `/api/v1`.
- Respuestas consistentes.
- Errores con códigos identificables.
- OpenAPI como contrato.

## IA
- Toda salida externa se valida.
- No confiar en texto generado como dato válido.
- Prompts versionables.
- Evitar acoplar modelos de negocio al formato del proveedor.

## Seguridad
- Secretos solo en backend.
- Sanitizar/validar uploads.
- Limitar tamaño de entrada.
- No registrar API keys.
- No devolver secretos en respuestas.

## Testing
Prioridad:
1. Casos de uso.
2. Adaptadores críticos.
3. API crítica.
4. Flujos E2E principales.
