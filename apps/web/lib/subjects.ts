import { type ApiSubject } from "./api";

export type Subject = ApiSubject & {
  progress: number;
  materials: number;
  icon: string;
  iconBackground: string;
  progressColor: string;
  message: string;
};

export const colorOptions = [
  { iconBackground: "bg-emerald-100 text-emerald-600", progressColor: "bg-emerald-500", icon: "√" },
  { iconBackground: "bg-blue-100 text-blue-600", progressColor: "bg-blue-500", icon: "⚗" },
  { iconBackground: "bg-orange-100 text-orange-600", progressColor: "bg-orange-500", icon: "⌂" },
  { iconBackground: "bg-violet-100 text-violet-600", progressColor: "bg-violet-500", icon: "▤" }
];

export function decorateSubject(subject: ApiSubject, index: number): Subject {
  const color = colorOptions[index % colorOptions.length];
  return {
    ...subject,
    progress: 0,
    materials: 0,
    icon: color.icon,
    iconBackground: color.iconBackground,
    progressColor: color.progressColor,
    message: "Tu materia está lista para estudiar ✨"
  };
}