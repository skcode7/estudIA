import { expect, test, type Page } from "@playwright/test";

const API_URL = "http://localhost:3001/api/v1";
const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

async function mockApi(page: Page, lastPractice: { completedAt: string | null } | "fail") {
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
  await page.route(`${API_URL}/subjects`, (route) => route.fulfill({ json: [] }));
  await page.route(`${API_URL}/quizzes/last-practice`, (route) =>
    lastPractice === "fail" ? route.abort("failed") : route.fulfill({ json: lastPractice })
  );
}

test("con práctica reciente el badge muestra días sin practicar en verde", async ({ page }) => {
  await mockApi(page, { completedAt: daysAgo(2) });
  await page.goto("/");

  const badge = page.locator("[data-practice-tone]");
  await expect(badge).toHaveAttribute("data-practice-tone", "fresh");
  await expect(badge).toHaveText("2 días sin practicar");
});

test("entre 5 y 15 días el badge se vuelve morado", async ({ page }) => {
  await mockApi(page, { completedAt: daysAgo(10) });
  await page.goto("/");

  const badge = page.locator("[data-practice-tone]");
  await expect(badge).toHaveAttribute("data-practice-tone", "steady");
  await expect(badge).toHaveText("10 días sin practicar");
});

test("más de 15 días el badge se vuelve rojo", async ({ page }) => {
  await mockApi(page, { completedAt: daysAgo(20) });
  await page.goto("/");

  const badge = page.locator("[data-practice-tone]");
  await expect(badge).toHaveAttribute("data-practice-tone", "lapsed");
  await expect(badge).toHaveText("20 días sin practicar");
});

test("sin ningún quiz respondido el badge invita a empezar", async ({ page }) => {
  await mockApi(page, { completedAt: null });
  await page.goto("/");

  const badge = page.locator("[data-practice-tone]");
  await expect(badge).toHaveAttribute("data-practice-tone", "none");
  await expect(badge).toHaveText("Aún no practicas");
});

test("si la consulta falla el badge no aparece", async ({ page }) => {
  await mockApi(page, "fail");
  await page.goto("/");

  await expect(page.getByText("¡Hola, KARLOS!")).toBeVisible();
  await expect(page.locator("[data-practice-tone]")).toHaveCount(0);
});

test("en 320 px el badge cabe en la pantalla sin desbordar", async ({ page }) => {
  await mockApi(page, { completedAt: daysAgo(20) });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");

  const badge = page.locator("[data-practice-tone]");
  await expect(badge).toBeVisible();

  const box = await badge.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);

  const pageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(pageOverflow).toBeLessThanOrEqual(0);
});
