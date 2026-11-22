import { expect, test } from "@playwright/test";

const API_URL = "http://localhost:3001/api/v1";

const SUBJECTS = Array.from({ length: 3 }, (_, index) => ({
  id: `subject-${index + 1}`,
  name: `Materia ${index + 1}`,
  description: `Descripción de la materia ${index + 1}`,
  color: "emerald",
  icon: "subjects",
  materialsCount: 0,
  progress: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
}));

test("tras iniciar sesión con la API ya disponible, el home carga las materias", async ({
  page
}) => {
  // La API está caída al cargar la página y levanta cuando el usuario inicia sesión.
  let apiUp = false;
  let subjectsCalls = 0;

  await page.route(`${API_URL}/subjects`, (route) => {
    subjectsCalls += 1;
    if (!apiUp) return route.abort("failed");
    return route.fulfill({ json: SUBJECTS });
  });
  await page.route(`${API_URL}/auth/login`, (route) => {
    apiUp = true;
    return route.fulfill({ json: { sessionId: "e2e-session" } });
  });
  await page.route(`${API_URL}/users`, (route) =>
    route.fulfill({
      json: [
        {
          id: "user-1",
          name: "KARLOS",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z"
        }
      ]
    })
  );

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();

  await page.getByLabel("Usuario").fill("KARLOS");
  await page.getByLabel("Contraseña").fill("secreto");
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeHidden();
  await expect(page.locator("[data-carousel-card]")).toHaveCount(SUBJECTS.length);
  expect(subjectsCalls).toBeGreaterThan(1);
});
