import { expect, test } from "@playwright/test";

test("Gestión de Equipo muestra y permite reintentar fallos de equipo y choferes", async ({ page }) => {
  let teamRequestFails = true;
  let driversRequestFails = true;

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.endsWith("/Auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "team-management-test-admin",
          email: "admin@example.test",
          username: "admin@example.test",
          firstName: "Admin",
          lastName: "QA",
          roles: ["Admin"],
          isActive: true,
        }),
      });
      return;
    }

    if (request.method() === "GET" && url.pathname.endsWith("/Users/my-team") && teamRequestFails) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "Servicio temporalmente no disponible" }),
      });
      return;
    }

    if (request.method() === "GET" && url.pathname.endsWith("/Drivers") && driversRequestFails) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "Servicio temporalmente no disponible" }),
      });
      return;
    }

    if (
      request.method() === "GET" &&
      ["/Users/my-team", "/Drivers", "/Vehicles", "/Routes"].some((path) => url.pathname.endsWith(path))
    ) {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }

    await route.continue();
  });

  await page.addInitScript(() => {
    localStorage.setItem("auth_tokens", JSON.stringify({
      accessToken: "playwright-test-access-token",
      refreshToken: "playwright-test-refresh-token",
    }));
  });

  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "Gestión de Equipo", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Gestión de Equipo", exact: true }).click();

  const teamAlert = page.getByRole("alert").filter({ hasText: "No se pudo cargar el equipo" });
  await expect(teamAlert).toBeVisible();
  await expect(page.getByText("No hay otros miembros en el equipo")).toHaveCount(0);
  teamRequestFails = false;
  await teamAlert.getByRole("button", { name: "Reintentar" }).click();
  await expect(teamAlert).toHaveCount(0);
  await expect(page.getByText("No hay otros miembros en el equipo")).toBeVisible();

  await page.getByRole("button", { name: "Gestionar choferes" }).click();
  const driversAlert = page.getByRole("alert").filter({ hasText: "No se pudieron cargar los choferes" });
  await expect(driversAlert).toBeVisible();
  await expect(page.getByText("No hay choferes registrados")).toHaveCount(0);
  driversRequestFails = false;
  await driversAlert.getByRole("button", { name: "Reintentar" }).click();
  await expect(driversAlert).toHaveCount(0);
  await expect(page.getByText("No hay choferes registrados")).toBeVisible();
});

test("Historial distingue error de lista vacía y permite reintentar", async ({ page }) => {
  let failRouteHistory = false;
  await page.setViewportSize({ width: 390, height: 844 });

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.endsWith("/Auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "route-history-test-admin",
          email: "admin@example.test",
          username: "admin@example.test",
          firstName: "Admin",
          lastName: "QA",
          roles: ["Admin"],
          isActive: true,
        }),
      });
      return;
    }

    if (request.method() === "GET" && url.pathname.endsWith("/Routes") && failRouteHistory) {
      failRouteHistory = false;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "Servicio temporalmente no disponible" }),
      });
      return;
    }

    if (
      request.method() === "GET" &&
      ["/Users/my-team", "/Drivers", "/Vehicles", "/Routes"].some((path) => url.pathname.endsWith(path))
    ) {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }

    await route.continue();
  });

  await page.addInitScript(() => {
    localStorage.setItem("auth_tokens", JSON.stringify({
      accessToken: "playwright-test-access-token",
      refreshToken: "playwright-test-refresh-token",
    }));
  });

  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "Abrir menú" })).toBeVisible();
  failRouteHistory = true;
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Historial de Rutas", exact: true }).click();

  const historyAlert = page.getByRole("alert").filter({ hasText: "No se pudieron cargar las rutas" });
  await expect(historyAlert).toBeVisible();
  await expect(page.getByText("No hay rutas para mostrar")).toHaveCount(0);

  await historyAlert.getByRole("button", { name: "Reintentar" }).click();
  await expect(historyAlert).toHaveCount(0);
  await expect(page.getByText("No hay rutas para mostrar")).toBeVisible();
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
});
