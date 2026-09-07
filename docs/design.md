# estudIA — Design System

Guía de diseño extraída del mockup del dashboard. Pensada para implementarse con **Next.js + Tailwind CSS**.

---

## 1. Identidad

- **Nombre:** estudIA
- **Logo:** icono de robot/graduado (🤖🎓) en un badge morado redondeado + wordmark "estud**IA**" (la "IA" en el color primario, resto en negro/gris oscuro).
- **Personalidad:** amigable, motivadora, gamificada (tono cercano: "¡Hola, Alex! 👋", "¡Sigue así, lo estás haciendo increíble!").
- **Mascota:** robot ilustrado (estilo 3D/soft), aparece en el hero card y como botón flotante de chat en el nav inferior (mobile).

---

## 2. Paleta de colores

### Color primario (marca)
| Token | Hex aprox. | Uso |
|---|---|---|
| `primary-600` | `#6D4AFF` | Botones, links activos, texto de énfasis |
| `primary-500` | `#7C5CFC` | Gradiente hero, hover |
| `primary-400` | `#8B6BFF` | Gradiente hero (fin) |
| `primary-50`  | `#F1EEFF` | Fondo de item activo en sidebar, chips |

### Colores de estado / materias
| Token | Hex aprox. | Uso |
|---|---|---|
| `success-500` | `#22C55E` | Progreso alto (Matemáticas, "Suma de fracciones") |
| `info-500`    | `#3B82F6` | Ciencias, ícono Diamantes |
| `warning-500` | `#F97316` | Historia, racha (fuego), botón "Repasar" secundario |
| `accent-purple` | `#7C5CFC` | Español, insignias |
| `xp-yellow`   | `#FACC15` | Ícono estrella XP |

### Neutrales
| Token | Hex aprox. | Uso |
|---|---|---|
| `gray-900` | `#1E1B2E` | Títulos, texto principal |
| `gray-500` | `#6B7280` | Texto secundario/subtítulos |
| `gray-200` | `#E5E7EB` | Bordes, tracks de progress bar |
| `gray-50`  | `#F8F7FC` | Fondo general de la app |
| `white`    | `#FFFFFF` | Fondo de tarjetas, sidebar |

### Fondos especiales
- **Card "Reto de hoy":** gradiente diagonal `from-[#8B6BFF] to-[#6D4AFF]` (135deg), texto blanco.
- **Card "¡No olvides!":** fondo crema `#FEF3E2` / `amber-50`, botón primario morado.

### Tailwind config sugerido
```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      primary: {
        50: '#F1EEFF',
        400: '#8B6BFF',
        500: '#7C5CFC',
        600: '#6D4AFF',
        700: '#5B3FE0',
      },
      success: { 500: '#22C55E' },
      info: { 500: '#3B82F6' },
      warning: { 500: '#F97316' },
      xp: { 500: '#FACC15' },
    },
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
    },
    borderRadius: {
      xl: '1rem',
      '2xl': '1.25rem',
      '3xl': '1.5rem',
    },
  },
}
```

---

## 3. Tipografía

- **Familia sugerida:** `Inter` o `Poppins` (geométrica, redondeada, legible, tono "friendly-edtech"). Cargar vía `next/font/google`.
- **Escala:**

| Uso | Tamaño | Peso | Ejemplo |
|---|---|---|---|
| H1 (saludo) | `text-2xl` / 24px | `font-bold` | "¡Hola, Alex! 👋" |
| H2 (secciones) | `text-lg` / 18px | `font-semibold` | "Mis materias" |
| Título de card | `text-xl` / 20px | `font-bold` | "Resta de fracciones" |
| Body / labels | `text-sm` / 14px | `font-medium` | "Matemáticas", stats |
| Caption / meta | `text-xs` / 12px | `font-normal` | "5 preguntas · 7 min" |
| Métricas grandes | `text-3xl` / 30px | `font-bold` | "78%", "1,240" |

```js
// next/font example
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
```

---

## 4. Layout general

Estructura de tipo **dashboard app**:

```
┌─────────────┬──────────────────────────────────────────┐
│             │  Topbar (saludo + stats chips + campana)  │
│  Sidebar    ├──────────────────────────────────────────┤
│  (fixed,    │  Grid principal (2 columnas: main + aside)│
│  240px)     │   - Hero "Reto de hoy"                    │
│             │   - Mis materias (grid 4 cols)             │
│  Perfil     │   - Continúa estudiando (lista)            │
│  (bottom)   │                          │ Progreso        │
│             │                          │ Insignias       │
│             │                          │ Recordatorio    │
└─────────────┴──────────────────────────────────────────┘
```

- **Desktop:** sidebar fija a la izquierda (~220–240px), contenido principal en grid `grid-cols-[1fr_360px]` (main + aside derecho), gap `24px`, padding externo `32px`.
- **Mobile:** sidebar se oculta y se reemplaza por **bottom tab bar** (Inicio, Mis materias, [botón flotante robot central], Quiz, Perfil). El botón central del robot es circular, elevado, color primario, tipo FAB.
- **Contenedor máx:** `max-w-[1440px] mx-auto`.
- **Fondo de página:** `gray-50`.

---

## 5. Componentes

### 5.1 Sidebar
- Fondo blanco, borde derecho `border-gray-100`.
- Logo arriba (robot icon + wordmark).
- Items de navegación: ícono + label, `rounded-xl`, padding `px-4 py-3`.
  - **Activo:** fondo `primary-50`, texto e ícono `primary-600`, `font-semibold`.
  - **Inactivo:** texto `gray-500`, hover `bg-gray-50`.
- Sección "Agregar material" separada con un pequeño espacio/borde superior.
- Card de perfil al final (avatar + nombre + nivel + mini progress bar de XP).

### 5.2 Topbar / Stat chips
- Saludo personalizado (`H1` + subtítulo `gray-500`).
- Chips de estadísticas a la derecha, en una sola fila con separadores sutiles o cards individuales:
  - 🔥 Racha — número + "días"
  - ⭐ XP — número
  - 💎 Diamantes — número
  - 🔔 Campana de notificaciones (ícono solo, `rounded-full` hover bg gray-100)
- Cada chip: ícono a la izquierda, label pequeño arriba (`text-xs gray-500`) y valor grande abajo (`text-base font-bold`).

### 5.3 Card "Reto de hoy" (Hero)
- `rounded-3xl`, gradiente primario, padding `32px`, texto blanco.
- Contenido: badge/ícono "Reto de hoy" (pill con blur/translucido `bg-white/20`), título grande, subtítulo (materia), meta info con bullets (`5 preguntas • 7 min • +50 XP`).
- Botón CTA: fondo blanco, texto `primary-600`, `rounded-xl`, ícono play a la derecha, `font-semibold`.
- Ilustración de la mascota a la derecha con elementos decorativos (estrellas, cruces) flotando.

### 5.4 Cards de "Mis materias"
- Grid de 4 columnas (desktop) / scroll horizontal o 2 columnas (mobile).
- Cada card: `bg-white rounded-2xl p-5 border border-gray-100 shadow-sm`.
- Ícono de la materia en un cuadrado `rounded-xl` con color pastel de fondo (verde claro, azul claro, naranja claro, morado claro) acorde a su color de progreso.
- Nombre de materia (`font-semibold`).
- Progress bar horizontal fina (`h-2 rounded-full`, track `gray-200`, fill según color) + porcentaje al lado.
- Micro-copy motivacional debajo ("Fuerte 💪", "¡Muy bien! ⭐", "Sigue practicando 🚀").
- Link "Ver todas" arriba a la derecha del título de sección, en `primary-600`.

### 5.5 Lista "Continúa estudiando"
- Card contenedora blanca `rounded-2xl`.
- Filas con: ícono pequeño (`rounded-lg` bg pastel), título + materia (subtítulo gris), progress bar inline, porcentaje, botón "Repasar".
- Botón "Repasar": outline, color según urgencia (verde/azul si va bien, naranja si necesita refuerzo) — `rounded-lg`, `text-sm font-semibold`, `border` + texto del mismo color, fondo transparente.

### 5.6 Card "Tu progreso"
- Mini gráfico de línea (sparkline) con puntos, color `primary-500`, relleno degradado suave debajo de la línea.
- Debajo: número grande (`78%`) + label ("Promedio general") + indicador de cambio (`↑ 12% esta semana` en verde).

### 5.7 Insignias recientes
- Badges hexagonales con ícono central y borde tipo "medalla" (gradiente/dorado o color temático).
- 3 en fila, cada una con label debajo (2 líneas: nombre + descripción corta).
- Link "Ver todas" arriba a la derecha.

### 5.8 Card "¡No olvides!" (recordatorio/CTA)
- Fondo crema/amber suave, `rounded-2xl`, ilustración de mochila en la esquina.
- Texto corto explicativo + botón primario con ícono "+".

### 5.9 Botones
| Variante | Estilo |
|---|---|
| Primario | `bg-primary-600 text-white rounded-xl px-5 py-3 font-semibold hover:bg-primary-700` |
| Primario sobre gradiente | `bg-white text-primary-600 rounded-xl` |
| Outline / secundario | `border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50` |
| Repasar (contextual) | `border-current text-{color}-600 rounded-lg text-sm` según estado de la materia |

### 5.10 Progress bars
- Altura `h-2`, `rounded-full`, track `bg-gray-200`, fill con color según categoría, transición suave (`transition-all duration-300`).

### 5.11 Bottom nav (mobile)
- Barra fija inferior, fondo blanco, sombra superior sutil.
- 4-5 íconos con label (Inicio, Mis materias, Quiz, Perfil) + botón circular central flotante (mascota) que abre el chat/asistente, en `primary-600`, elevado con sombra.

---

## 6. Espaciado y radios

- **Radio base de cards:** `rounded-2xl` (16px) / hero `rounded-3xl` (24px).
- **Radio de botones/inputs:** `rounded-xl` (12px).
- **Radio de chips/badges:** `rounded-full`.
- **Espaciado entre secciones:** `gap-6` (24px).
- **Padding interno de cards:** `p-5` a `p-8` según tamaño.
- **Sombra estándar:** `shadow-sm` (`0 1px 3px rgba(0,0,0,0.06)`) para cards sobre fondo gris; el hero no necesita sombra (ya destaca por color).

---

## 7. Iconografía e ilustración

- Íconos de línea simples (estilo Lucide/Heroicons) para navegación y UI.
- Emojis usados como acentos de personalidad (🔥⭐💎👋💪🚀) — no reemplazan íconos funcionales, son complementarios.
- Ilustraciones 3D/soft (mascota robot, mochila) reservadas para momentos de "hero" o motivacionales, no para uso repetitivo en toda la UI.

---

## 8. Tono de microcopy

- Segunda persona, cercano, celebratorio: "¡Sigue así!", "¡Muy bien!", "Sigue practicando 🚀".
- Frases cortas, con emoji de cierre ocasional.
- CTAs orientados a la acción: "Comenzar reto", "Repasar", "Agregar material".

---

## 9. Accesibilidad

- Contraste texto blanco sobre gradiente primario: verificar ≥ 4.5:1 (usar `primary-600`/`700` como base del gradiente, no tonos más claros que `500`).
- Progress bars: no depender solo del color — incluir el porcentaje en texto (ya está en el diseño).
- Tamaño mínimo de tap targets en mobile: `44x44px` (botones del bottom nav, FAB).

---

## 10. Próximos pasos sugeridos para la implementación

- [ ] Definir tokens en `tailwind.config.js` (colores, radios, fuente).
- [ ] Crear componentes base: `Sidebar`, `TopbarStats`, `SubjectCard`, `ProgressBar`, `BadgeHex`, `Button`.
- [ ] Crear layout responsivo con `Sidebar` (desktop) / `BottomNav` (mobile).
- [ ] Definir dark mode (opcional, no visto en el mockup actual).
