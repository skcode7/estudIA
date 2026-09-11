export const navItems = [
  ["home", "⌂", "Inicio"],
  ["subjects", "▤", "Mis materias"],
  ["materials", "📄", "Materiales"],
  ["quiz", "?", "Quiz"],
  ["review", "↻", "Repaso"],
  ["progress", "▥", "Progreso"],
  ["badges", "♜", "Insignias"]
] as const;

export type NavItemId = (typeof navItems)[number][0];

export function navLabel(id: NavItemId): string {
  return navItems.find(([navId]) => navId === id)?.[2] ?? "Inicio";
}