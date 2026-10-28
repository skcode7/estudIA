export const navItems = [
  ["home", "home", "Inicio"],
  ["subjects", "subjects", "Mis materias"],
  ["materials", "materials", "Materiales"],
  ["evaluations", "evaluations", "Evaluaciones"],
  ["quiz", "quiz", "Quiz"],
  ["progress", "progress", "Progreso"],
  ["badges", "badges", "Insignias"]
] as const;

export type NavItemId = (typeof navItems)[number][0];

export function navLabel(id: NavItemId): string {
  return navItems.find(([navId]) => navId === id)?.[2] ?? "Inicio";
}
