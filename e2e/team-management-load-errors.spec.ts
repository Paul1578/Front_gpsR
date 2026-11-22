import { expect, test } from "@playwright/test";

test("Dashboard de Logistics muestra error de opciones de flota y recupera al reintentar", async ({ page }) => {
  let assignmentOptionsFail = true;
  let forbiddenVehicleListRequests = 0;
  let successfulAssignmentOptionsRequests = 0;

  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.endsWith("/Auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "logistics-dashboard-test",
          email: "logistics@example.test",
          username: "logistics@example.test",
          firstName: "Logistics",
          lastName: "QA",
          roles: ["Logistics"],
          isActive: true,
        }),
      });
      return;
    }

    if (request.method() === "GET" && url.pathname.endsWith("/Routes/assignment-options")) {
      if (assignmentOptionsFail) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ message: "Servicio temporalmente no disponible" }),
        });
      } else {
        successfulAssignmentOptionsRequests += 1;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            vehicles: [{ id: "vehicle-logistics-1", plate: "GYA-1234", brand: "Fleet", model: "Van", year: 2025, status: 1 }],
            drivers: [],
          }),
        });
      }
      return;
    }

    if (request.method() === "GET" && url.pathname === "/api/backend/Vehicles") {
      forbiddenVehicleListRequests += 1;
      await route.fulfill({ status: 403, contentType: "application/json", body: "{}" });
      return;
    }

    if (request.method() === "GET" && url.pathname.endsWith("/Routes")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }

    if (["/Users/my-team", "/Drivers"].some((path) => url.pathname.endsWith(path))) {
      await route.fulfill({ status: 403, contentType: "application/json", body: "{}" });
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

  const availableVehiclesStat = page
    .getByText("Vehículos Disponibles", { exact: true })
    .locator("xpath=..");
  await expect(availableVehiclesStat.locator("p").nth(1)).toHaveText("—");
  const fleetAlert = page.getByRole("alert").filter({ hasText: "opciones de asignación" });
  await expect(fleetAlert).toContainText("Las cifras marcadas con — no están disponibles");
  await expect(page.getByText("No hay vehículos disponibles")).toHaveCount(0);

  assignmentOptionsFail = false;
  const recoveredOptions = page.waitForResponse((response) =>
    response.request().method() === "GET" &&
    new URL(response.url()).pathname.endsWith("/Routes/assignment-options") &&
    response.status() === 200,
  );
  await fleetAlert.getByRole("button", { name: "Reintentar" }).click();
  await recoveredOptions;
  await expect(fleetAlert).toHaveCount(0);
  await expect(availableVehiclesStat.locator("p").nth(1)).toHaveText("1");
  expect(successfulAssignmentOptionsRequests).toBeGreaterThan(0);
  expect(forbiddenVehicleListRequests).toBe(0);

  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
});

test("Gestión de Vehículos no confunde fallo de carga con flota vacía y permite reintentar", async ({ page }) => {
  let vehiclesRequestFails = true;
  let releaseInitialVehicleFailure: () => void = () => {};
  let notifyInitialVehicleRequest: () => void = () => {};
  const initialVehicleRequestStarted = new Promise<void>((resolve) => {
    notifyInitialVehicleRequest = resolve;
  });
  const initialVehicleFailureGate = new Promise<void>((resolve) => {
    releaseInitialVehicleFailure = resolve;
  });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.endsWith("/Auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "vehicles-load-error-admin",
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
      if (vehiclesRequestFails) {
        notifyInitialVehicleRequest();
        await initialVehicleFailureGate;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ message: "Servicio temporalmente no disponible" }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([{
            id: "vehicle-load-error-fixture",
            plate: "QA-VEH-01",
            brand: "Fleet QA",
            model: "Van",
            year: 2025,
            status: 0,
            isActive: true,
          }]),
        });
      }
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

    if (
      request.method() === "GET" &&
      ["/Users/my-team", "/Drivers", "/Routes"].some((path) => url.pathname.endsWith(path))
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
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Gestión de Vehículos", exact: true }).click();

  await expect(page.getByRole("status")).toHaveText("Cargando vehículos…");
  await expect(page.getByText("No hay vehículos registrados", { exact: true })).toHaveCount(0);
  await initialVehicleRequestStarted;
  releaseInitialVehicleFailure();

  const vehiclesAlert = page.getByRole("alert").filter({ hasText: "No se pudieron cargar los vehículos" });
  await expect(vehiclesAlert).toBeVisible();
  await expect(page.getByText("No hay vehículos registrados", { exact: true })).toHaveCount(0);

  vehiclesRequestFails = false;
  const recoveredVehicles = page.waitForResponse((response) =>
    response.request().method() === "GET" &&
    new URL(response.url()).pathname.endsWith("/Vehicles") &&
    response.status() === 200,
  );
  await vehiclesAlert.getByRole("button", { name: "Reintentar" }).click();
  await recoveredVehicles;
  await expect(vehiclesAlert).toHaveCount(0);
  await expect(page.getByText("QA-VEH-01", { exact: true })).toBeVisible();

  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
});

test("Gestión de Rutas muestra carga antes de error/vacío y recupera rutas al reintentar", async ({ page }) => {
  let routesRequestFails = true;
  let releaseInitialRoutesFailure: () => void = () => {};
  let notifyInitialRoutesRequest: () => void = () => {};
  const initialRoutesRequestStarted = new Promise<void>((resolve) => {
    notifyInitialRoutesRequest = resolve;
  });
  const initialRoutesFailureGate = new Promise<void>((resolve) => {
    releaseInitialRoutesFailure = resolve;
  });
  await page.setViewportSize({ width: 320, height: 844 });

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.endsWith("/Auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "routes-load-test-admin",
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

    if (request.method() === "GET" && url.pathname.endsWith("/Routes/assignment-options")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ vehicles: [], drivers: [] }) });
      return;
    }

    if (request.method() === "GET" && url.pathname.endsWith("/Routes")) {
      if (routesRequestFails) {
        notifyInitialRoutesRequest();
        await initialRoutesFailureGate;
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Servicio temporalmente no disponible" }) });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([{
            id: "route-load-fixture",
            name: "QA-ROUTE-01",
            vehicleId: "vehicle-route-fixture",
            driverId: "driver-route-fixture",
            points: [],
            status: 0,
            isActive: true,
            createdAtUtc: "2026-11-22T12:00:00Z",
          }]),
        });
      }
      return;
    }

    if (request.method() === "GET" && ["/Vehicles", "/Drivers", "/Users/my-team"].some((path) => url.pathname.endsWith(path))) {
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
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Gestión de Rutas", exact: true }).click();

  await expect(page.getByRole("status")).toHaveText("Cargando rutas…");
  await expect(page.getByText("Aún no tienes rutas", { exact: true })).toHaveCount(0);
  await initialRoutesRequestStarted;
  releaseInitialRoutesFailure();

  const routesAlert = page.getByRole("alert").filter({ hasText: "No se pudieron cargar las rutas" });
  await expect(routesAlert).toBeVisible();
  await expect(page.getByText("Aún no tienes rutas", { exact: true })).toHaveCount(0);

  routesRequestFails = false;
  const recoveredRoutes = page.waitForResponse((response) =>
    response.request().method() === "GET" &&
    new URL(response.url()).pathname.endsWith("/Routes") &&
    response.status() === 200,
  );
  await routesAlert.getByRole("button", { name: "Reintentar" }).click();
  await recoveredRoutes;
  await expect(routesAlert).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "QA-ROUTE-01" })).toBeVisible();

  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
});

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
