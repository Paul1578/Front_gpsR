import { expect, test } from "@playwright/test";

test("Gestión de Equipo muestra y permite reintentar fallos de equipo y choferes", async ({ page }) => {
  let teamRequestFails = true;
  let driversRequestFails = true;
  await page.setViewportSize({ width: 390, height: 844 });

  const expectNoHorizontalOverflow = async () => {
    const widths = await page.evaluate(() => {
      const main = document.querySelector("main");
      return {
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        mainClient: main?.clientWidth ?? 0,
        mainContent: main?.scrollWidth ?? 0,
      };
    });

    expect(widths.document).toBeLessThanOrEqual(widths.viewport);
    expect(widths.mainContent).toBeLessThanOrEqual(widths.mainClient);
  };

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

    if (request.method() === "GET" && url.pathname.endsWith("/Routes/assignment-options")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ vehicles: [], drivers: [] }),
      });
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
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(page.getByRole("button", { name: "Gestión de Equipo", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Gestión de Equipo", exact: true }).click();

  const teamAlert = page.getByRole("alert").filter({ hasText: "No se pudo cargar el equipo" });
  await expect(teamAlert).toBeVisible();
  await expect(teamAlert.getByRole("button", { name: "Reintentar" })).toBeVisible();
  await expectNoHorizontalOverflow();
  await expect(page.getByText("No hay otros miembros en el equipo")).toHaveCount(0);
  teamRequestFails = false;
  await teamAlert.getByRole("button", { name: "Reintentar" }).click();
  await expect(teamAlert).toHaveCount(0);
  await expect(page.getByText("No hay otros miembros en el equipo")).toBeVisible();
  await expectNoHorizontalOverflow();

  await page.getByRole("button", { name: "Gestionar choferes" }).click();
  const driversAlert = page.getByRole("alert").filter({ hasText: "No se pudieron cargar los choferes" });
  await expect(driversAlert).toBeVisible();
  await expect(driversAlert.getByRole("button", { name: "Reintentar" })).toBeVisible();
  await expectNoHorizontalOverflow();
  await expect(page.getByText("No hay choferes registrados")).toHaveCount(0);
  driversRequestFails = false;
  await driversAlert.getByRole("button", { name: "Reintentar" }).click();
  await expect(driversAlert).toHaveCount(0);
  await expect(page.getByText("No hay choferes registrados")).toBeVisible();
  await expectNoHorizontalOverflow();
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

    if (request.method() === "GET" && url.pathname.endsWith("/Routes/assignment-options")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ vehicles: [], drivers: [] }),
      });
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

  const initialRoutesResponse = page.waitForResponse((response) =>
    response.request().method() === "GET" && new URL(response.url()).pathname.endsWith("/Routes"),
  );
  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "Abrir menú" })).toBeVisible();
  await initialRoutesResponse;
  await page.waitForLoadState("networkidle");
  failRouteHistory = true;
  await page.getByRole("button", { name: "Abrir menú" }).click();
  const failedHistoryResponse = page.waitForResponse((response) =>
    response.request().method() === "GET" &&
    new URL(response.url()).pathname.endsWith("/Routes") &&
    response.status() === 503,
  );
  await page.getByRole("button", { name: "Historial de Rutas", exact: true }).click();
  await failedHistoryResponse;

  const historyAlert = page.getByRole("alert").filter({ hasText: "No se pudieron cargar las rutas" });
  await expect(historyAlert).toBeVisible();
  await expect(page.getByText("No hay rutas para mostrar")).toHaveCount(0);
  failRouteHistory = false;

  const recoveredHistoryResponse = page.waitForResponse((response) =>
    response.request().method() === "GET" &&
    new URL(response.url()).pathname.endsWith("/Routes") &&
    response.status() === 200,
  );
  await historyAlert.getByRole("button", { name: "Reintentar" }).click();
  await recoveredHistoryResponse;
  await expect(historyAlert).toHaveCount(0);
  await expect(page.getByText("No hay rutas para mostrar")).toBeVisible();
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
});

test("Gestión de Conductores informa y permite recuperar errores de Drivers y Vehicles", async ({ page }) => {
  let failDrivers = true;
  let failVehicles = true;
  let vehicleRequests = 0;
  const testDriver = {
    id: "drivers-load-test-driver",
    firstName: "Lina",
    lastName: "Prueba",
    documentNumber: "QA-001",
    phoneNumber: "0990000000",
    isActive: true,
    vehicleId: null,
    userId: null,
  };
  const testVehicle = {
    id: "drivers-load-test-vehicle",
    plate: "ABC-123",
    brand: "Fleet QA",
    model: "Van",
    year: 2025,
    status: 0,
    isActive: true,
  };
  await page.setViewportSize({ width: 390, height: 844 });

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith("/Auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "drivers-load-test-admin",
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
    if (request.method() === "GET" && url.pathname.endsWith("/Vehicles")) {
      vehicleRequests += 1;
      if (failVehicles) {
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Unavailable" }) });
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([testVehicle]) });
      return;
    }
    if (request.method() === "GET" && url.pathname.endsWith("/Drivers")) {
      if (failDrivers) {
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Unavailable" }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([testDriver]) });
      return;
    }
    if (
      request.method() === "GET" &&
      ["/Users/my-team", "/Drivers", "/Vehicles", "/Routes"].some((path) => url.pathname.endsWith(path))
    ) {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    if (request.method() === "GET" && url.pathname.endsWith("/Routes/assignment-options")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ vehicles: [], drivers: [] }) });
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
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Gestión de Conductores", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Gestión de Conductores" })).toBeVisible();

  const driversAlert = page.getByRole("alert").filter({ hasText: "No se pudieron cargar los conductores" });
  await expect(driversAlert).toBeVisible();
  await expect(page.getByText("No hay conductores activos.")).toHaveCount(0);
  failDrivers = false;
  await driversAlert.getByRole("button", { name: "Reintentar" }).click();
  await expect(driversAlert).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Lina Prueba" })).toBeVisible();

  const vehiclesAlert = page.getByRole("alert").filter({ hasText: "No se pudieron cargar los vehículos" });
  await expect(vehiclesAlert).toBeVisible();
  expect(vehicleRequests).toBeGreaterThan(0);
  failVehicles = false;
  const requestsBeforeRetry = vehicleRequests;
  const retryButton = vehiclesAlert.getByRole("button", { name: "Reintentar" });
  await retryButton.click();
  const retryingButton = vehiclesAlert.getByRole("button", { name: "Reintentando…" });
  await expect(retryingButton).toBeDisabled();
  await expect(vehiclesAlert).toHaveCount(0);
  expect(vehicleRequests).toBe(requestsBeforeRetry + 1);
  const vehicleSelect = page.getByRole("combobox", { name: "Vehículo para Lina" });
  await expect(vehicleSelect).toBeVisible();
  await expect(vehicleSelect.locator("option", { hasText: "ABC-123 · Fleet QA Van" })).toBeAttached();
});
