import { expect, test } from "@playwright/test";

test("Dashboard no muestra cero ni actividad vacía antes de cargar rutas", async ({ page }) => {
  let releaseRoutes: () => void = () => {};
  let notifyRouteRequest: () => void = () => {};
  const routeRequestStarted = new Promise<void>((resolve) => { notifyRouteRequest = resolve; });
  const routeResponseGate = new Promise<void>((resolve) => { releaseRoutes = resolve; });

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.endsWith("/Auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "dashboard-loading-admin", email: "admin@example.test", username: "admin", firstName: "Admin", roles: ["Admin"], isActive: true }),
      });
      return;
    }

    if (request.method() === "GET" && url.pathname.endsWith("/Routes")) {
      notifyRouteRequest();
      await routeResponseGate;
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }

    if (request.method() === "GET" && url.pathname.endsWith("/Vehicles")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }

    if (request.method() === "GET" && url.pathname.endsWith("/Routes/assignment-options")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ vehicles: [], drivers: [] }) });
      return;
    }

    if (request.method() === "GET" && (url.pathname.endsWith("/Drivers") || url.pathname.endsWith("/Users/my-team"))) {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }

    await route.continue();
  });

  await page.addInitScript(() => {
    localStorage.setItem("auth_tokens", JSON.stringify({ accessToken: "playwright-test-access-token", refreshToken: "playwright-test-refresh-token" }));
  });

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /Bienvenido/ })).toBeVisible();
  await routeRequestStarted;

  await expect(page.getByRole("status").filter({ hasText: "Cargando actividad de rutas" })).toBeVisible();
  await expect(page.getByText("No hay actividad reciente", { exact: true })).toHaveCount(0);
  const activeRoutesStat = page.getByText("Rutas Activas", { exact: true }).locator("xpath=..");
  await expect(activeRoutesStat.locator("p").nth(1)).toHaveText("Cargando…");

  releaseRoutes();
  await expect(page.getByText("No hay actividad reciente", { exact: true })).toBeVisible();
  await expect(activeRoutesStat.locator("p").nth(1)).toHaveText("0");
});
