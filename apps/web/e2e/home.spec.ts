import { expect, test, type Page } from "@playwright/test";

const API_URL = "http://localhost:3001/api/v1";

const SUBJECTS = Array.from({ length: 7 }, (_, index) => ({
  id: `subject-${index + 1}`,
  name: `Materia ${index + 1}`,
  description: `Descripción de la materia ${index + 1}`,
  color: "emerald",
  icon: "subjects",
  materialsCount: index,
  progress: index === 0 ? null : index * 10,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
}));

/** Intercepta la API para que el test no dependa del backend levantado. */
async function mockApi(page: Page) {
  await page.addInitScript(() => {
    window.sessionStorage.setItem(
      "estudia_session",
      JSON.stringify({ sessionId: "e2e-session", login: "KARLOS" })
    );
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

  await page.route(`${API_URL}/subjects`, (route) => route.fulfill({ json: SUBJECTS }));
}

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test("la grilla de materias se presenta en horizontal con paginado lateral", async ({ page }) => {
  await page.goto("/");

  const nav = page.getByRole("navigation", { name: "Paginación de materias" });
  await expect(nav).toBeVisible();
  await expect(nav).toContainText("Página 1 de");

  const cards = page.locator("[data-carousel-card]");
  await expect(cards).toHaveCount(SUBJECTS.length);

  // El carril es horizontal: su contenido excede el ancho visible.
  const overflow = await page.evaluate(() => {
    const track = document.querySelector("[data-carousel-card]")?.parentElement;
    return track ? track.scrollWidth - track.clientWidth : 0;
  });
  expect(overflow).toBeGreaterThan(0);

  // "Anterior" deshabilitado en la primera página y "Siguiente" habilitado.
  const previous = nav.getByRole("button", { name: "Página anterior" });
  const next = nav.getByRole("button", { name: "Página siguiente" });
  await expect(previous).toBeDisabled();
  await expect(next).toBeEnabled();

  await next.click();
  await expect(nav).toContainText("Página 2 de");
  await expect(previous).toBeEnabled();
});

test("en móvil la grilla muestra una sola tarjeta por página", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const cards = page.locator("[data-carousel-card]");
  await expect(cards.first()).toBeVisible();

  const visible = await page.evaluate(() => {
    const track = document.querySelector("[data-carousel-card]")?.parentElement;
    if (!track) return 0;
    const bounds = track.getBoundingClientRect();
    return Array.from(document.querySelectorAll("[data-carousel-card]")).filter((card) => {
      const rect = card.getBoundingClientRect();
      return rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1;
    }).length;
  });

  expect(visible).toBe(1);
});

test("¡No olvides! comparte fila con el hero en escritorio", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const tops = await page.evaluate(() => {
    const grid = document.querySelector("body > main > div > section > div");
    const hero = grid?.querySelector(":scope > section:nth-of-type(1)");
    const aside = grid?.querySelector(":scope > aside");
    if (!hero || !aside) return null;
    return {
      hero: Math.round(hero.getBoundingClientRect().top),
      aside: Math.round(aside.getBoundingClientRect().top)
    };
  });

  expect(tops).not.toBeNull();
  expect(tops?.aside).toBe(tops?.hero);
});

test("la grilla de materias comparte fila y altura con efemérides", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const boxes = await page.evaluate(() => {
    const grid = document.querySelector("body > main > div > section > div");
    const subjects = grid?.querySelector(":scope > section[aria-labelledby='home-subjects-heading']");
    const ephemerides = grid?.querySelector(
      ":scope > section[aria-labelledby='home-ephemerides-heading']"
    );
    if (!subjects || !ephemerides) return null;
    const subjectsRect = subjects.getBoundingClientRect();
    const ephemeridesRect = ephemerides.getBoundingClientRect();
    return {
      subjectsTop: Math.round(subjectsRect.top),
      ephemeridesTop: Math.round(ephemeridesRect.top),
      subjectsHeight: Math.round(subjectsRect.height),
      ephemeridesHeight: Math.round(ephemeridesRect.height)
    };
  });

  expect(boxes).not.toBeNull();
  expect(boxes?.ephemeridesTop).toBe(boxes?.subjectsTop);
  expect(boxes?.ephemeridesHeight).toBe(boxes?.subjectsHeight);
});
