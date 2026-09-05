# Alcance exacto del MVP

## Objetivo
Validar la experiencia central de estudIA con un único usuario y sin restricciones comerciales.

## Incluido

### Materias
- Crear materia.
- Editar materia.
- Eliminar materia.
- Listar materias.

### Temas
- Crear tema dentro de una materia.
- Editar tema.
- Eliminar tema.
- Consultar temas.

### Material
- Asociar material a un tema.
- Texto como primer formato.
- Preparar modelo para archivos.
- Estado de procesamiento.

### IA
- Analizar contenido.
- Identificar conceptos/objetivos.
- Generar preguntas.
- Generar explicaciones.
- Generar pistas.

### Quiz
- Crear quiz.
- Presentar preguntas.
- Registrar respuestas.
- Calcular resultado.
- Mostrar retroalimentación.

### Progreso
- Intentos.
- Porcentaje de aciertos.
- Progreso por tema.
- Historial básico.

## Excluido
- Authentico.
- Multiusuario.
- Padres/profesores.
- Billing.
- Suscripciones.
- Lifetime.
- Redis.
- Workers.
- Notificaciones.
- Gamificación avanzada.
- App nativa.
- Analytics avanzados.

## Criterio de éxito
Un usuario debe poder:

```text
crear materia
 -> crear tema
 -> introducir material
 -> generar preguntas
 -> realizar quiz
 -> recibir resultado
 -> volver a estudiar puntos débiles
```
