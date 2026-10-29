import { type ApiSubject } from "./api";
import { type IconName } from "./icons";

/** Paletas de color permitidas para una materia (deben coincidir con el backend). */
export type SubjectColor = "emerald" | "blue" | "orange" | "violet";

export const SUBJECT_COLORS: SubjectColor[] = ["emerald", "blue", "orange", "violet"];

/** Íconos permitidos para una materia (subset de `IconName`). */
export const SUBJECT_ICONS: IconName[] = [
  "subjects",
  "quiz",
  "progress",
  "badges",
  "graduate",
  "text",
  "image",
  "link",
  "sparkle",
  "goal",
  "question",
  "camera"
];

export const SUBJECT_COLOR_PALETTES: Record<
  SubjectColor,
  { iconBackground: string; progressColor: string }
> = {
  emerald: { iconBackground: "bg-emerald-100 text-emerald-600", progressColor: "bg-emerald-500" },
  blue: { iconBackground: "bg-blue-100 text-blue-600", progressColor: "bg-blue-500" },
  orange: { iconBackground: "bg-orange-100 text-orange-600", progressColor: "bg-orange-500" },
  violet: { iconBackground: "bg-violet-100 text-violet-600", progressColor: "bg-violet-500" }
};

export const FALLBACK_SUBJECT_COLOR: SubjectColor = "violet";
export const FALLBACK_SUBJECT_ICON: IconName = "subjects";

export type Subject = ApiSubject & {
  progress: number | null;
  materials: number;
  icon: IconName;
  iconBackground: string;
  progressColor: string;
  message: string;
};

function resolveColor(color: string | undefined): SubjectColor {
  return (SUBJECT_COLORS as string[]).includes(color ?? "")
    ? (color as SubjectColor)
    : FALLBACK_SUBJECT_COLOR;
}

function resolveIcon(icon: string | undefined): IconName {
  return (SUBJECT_ICONS as string[]).includes(icon ?? "")
    ? (icon as IconName)
    : FALLBACK_SUBJECT_ICON;
}

/**
 * Completa la tarjeta con los datos que vienen de la API (materiales, progreso,
 * color e ícono). Ya no inventa valores: si la materia no tiene intentos de quiz,
 * `progress` queda `null` y la tarjeta muestra el estado "aún no hay quizzes".
 */
export function decorateSubject(subject: ApiSubject): Subject {
  const color = resolveColor(subject.color);
  const palette = SUBJECT_COLOR_PALETTES[color];
  const hasProgress = subject.progress !== null && subject.progress !== undefined;

  return {
    ...subject,
    materials: subject.materialsCount ?? 0,
    progress: subject.progress ?? null,
    icon: resolveIcon(subject.icon),
    iconBackground: palette.iconBackground,
    progressColor: palette.progressColor,
    message: hasProgress
      ? "Sigue practicando para mejorar tu progreso."
      : "Aún no hay quizzes en esta materia."
  };
}
