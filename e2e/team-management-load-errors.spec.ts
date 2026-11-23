import { expect, test } from "@playwright/test";

test("Gestión de Equipo explica el fallo de vehículos y bloquea la asignación hasta reintentar", async ({ page }) => {
  let failVehicleRequests = true;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.endsWith("/Auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "team-vehicle-load-admin", email: "admin@example.test", username: "admin", firstName: "Admin", roles: ["Admin"], isActive: true }),
      });
      return;
    }

    if (request.method() === "GET" && url.pathname.endsWith("/Vehicles")) {
      if (failVehicleRequests) {
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Servicio temporalmente no disponible" }) });
      } else {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: "vehicle-team-load-1", plate: "QA-TEAM-01", brand: "Fleet QA", model: "Van", year: 2025, status: 0, isActive: true }]) });
      }
      return;
    }

    if (request.method() === "GET" && url.pathname.endsWith("/Drivers")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ id: "driver-team-load-1", userId: null, firstName: "Chofer", lastName: "QA", documentNumber: "TEAM-QA-01", phoneNumber: "0990000000", vehicleId: null, isActive: true }]),
      });
      return;
    }

    if (request.method() === "GET" && url.pathname.endsWith("/Routes/assignment-options")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ vehicles: [], drivers: [] }) });
      return;
    }

    if (request.method() === "GET" && ["/Users/my-team", "/Routes"].some((path) => url.pathname.endsWith(path))) {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }

    await route.continue();
  });

  await page.addInitScript(() => {
    localStorage.setItem("auth_tokens", JSON.stringify({ accessToken: "playwright-test-access-token", refreshToken: "playwright-test-refresh-token" }));
  });

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Gestión de Equipo", exact: true }).click();
  await page.getByRole("button", { name: "Gestionar choferes" }).click();

  const vehicleError = page.getByRole("alert").filter({ hasText: "No se pudieron cargar los vehículos" });
  await expect(vehicleError).toBeVisible();
  const assignVehicleSelect = page.getByTestId("team-driver-driver-team-load-1").locator("select");
  await expect(assignVehicleSelect).toBeDisabled();
  await expect(vehicleError).toContainText("No es posible verificar cuáles están disponibles para asignación");

  const recoveredVehicles = page.waitForResponse((response) =>
    response.request().method() === "GET" && new URL(response.url()).pathname.endsWith("/Vehicles") && response.status() === 200,
  );
  failVehicleRequests = false;
  await vehicleError.getByRole("button", { name: "Reintentar" }).click();
  await recoveredVehicles;
  await expect(vehicleError).toHaveCount(0);
  await expect(page.getByRole("option", { name: /QA-TEAM-01/ })).toBeAttached();
  await expect(assignVehicleSelect).toBeEnabled();
});

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

test("Gestión de Rutas distingue asignaciones no cargadas y permite recuperar etiquetas", async ({ page }) => {
  let assignmentOptionsFail = true;
  await page.setViewportSize({ width: 320, height: 844 });
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.endsWith("/Auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "routes-assignment-error-admin", email: "admin@example.test", username: "admin@example.test", firstName: "Admin", lastName: "QA", roles: ["Admin"], isActive: true }),
      });
      return;
    }

    if (request.method() === "GET" && url.pathname.endsWith("/Routes/assignment-options")) {
      if (assignmentOptionsFail) {
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Servicio temporalmente no disponible" }) });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            vehicles: [{ id: "vehicle-route-fixture", plate: "QA-VEH-01", brand: "Fleet QA", model: "Van", year: 2025, status: 1 }],
            drivers: [{ id: "driver-route-fixture", firstName: "Conductor", lastName: "QA", isActive: true }],
          }),
        });
      }
      return;
    }

    if (request.method() === "GET" && url.pathname.endsWith("/Routes")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ id: "route-assignment-fixture", name: "QA ruta asignada", vehicleId: "vehicle-route-fixture", driverId: "driver-route-fixture", points: [], status: 0, isActive: true, createdAtUtc: "2026-11-22T12:00:00Z" }]),
      });
      return;
    }

    if (request.method() === "GET" && ["/Vehicles", "/Drivers", "/Users/my-team"].some((path) => url.pathname.endsWith(path))) {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    await route.continue();
  });

  await page.addInitScript(() => {
    localStorage.setItem("auth_tokens", JSON.stringify({ accessToken: "playwright-test-access-token", refreshToken: "playwright-test-refresh-token" }));
  });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Gestión de Rutas", exact: true }).click();

  const assignmentAlert = page.getByRole("alert").filter({ hasText: "No se pudieron cargar todas las opciones de asignación" });
  await expect(assignmentAlert).toBeVisible();
  const routeCard = page.locator(".grid > div").filter({ hasText: "QA ruta asignada" });
  await expect(routeCard).toContainText("No disponible temporalmente");
  await expect(routeCard).not.toContainText("Sin vehículo asignado");
  await expect(routeCard).not.toContainText("Sin conductor asignado");

  assignmentOptionsFail = false;
  const recoveredAssignments = page.waitForResponse((response) =>
    response.request().method() === "GET" &&
    new URL(response.url()).pathname.endsWith("/Routes/assignment-options") &&
    response.status() === 200,
  );
  await assignmentAlert.getByRole("button", { name: "Reintentar" }).click();
  await recoveredAssignments;
  await expect(assignmentAlert).toHaveCount(0);
  await expect(routeCard).toContainText("QA-VEH-01 · Fleet QA Van");
  await expect(routeCard).toContainText("Conductor QA");

  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
});

test("FleetContext descarta una respuesta pendiente de una cuenta anterior", async ({ page }) => {
  let releaseAccountAVehicles: () => void = () => {};
  let notifyAccountAVehiclesRequest: () => void = () => {};
  const accountAVehiclesRequestStarted = new Promise<void>((resolve) => {
    notifyAccountAVehiclesRequest = resolve;
  });
  const accountAVehiclesGate = new Promise<void>((resolve) => {
    releaseAccountAVehicles = resolve;
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const authorization = request.headers().authorization;

    if (url.pathname.endsWith("/Auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "fleet-owner-a",
          email: "owner-a@example.test",
          username: "owner-a@example.test",
          firstName: "Owner",
          lastName: "A",
          roles: ["Admin"],
          isActive: true,
        }),
      });
      return;
    }

    if (request.method() === "POST" && url.pathname.endsWith("/Auth/logout")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      return;
    }

    if (request.method() === "POST" && url.pathname.endsWith("/Auth/login")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: "account-b-access-token",
          refreshToken: "account-b-refresh-token",
          user: {
            id: "fleet-owner-b",
            email: "owner-b@example.test",
            username: "owner-b@example.test",
            firstName: "Owner",
            lastName: "B",
            roles: ["Admin"],
            isActive: true,
          },
        }),
      });
      return;
    }

    if (request.method() === "GET" && url.pathname.endsWith("/Vehicles")) {
      if (authorization === "Bearer playwright-test-access-token") {
        notifyAccountAVehiclesRequest();
        await accountAVehiclesGate;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([{
            id: "vehicle-account-a",
            plate: "A-PRIVATE-01",
            brand: "Fleet QA",
            model: "Van",
            year: 2025,
            status: 0,
            isActive: true,
          }]),
        }).catch(() => {});
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([{
            id: "vehicle-account-b",
            plate: "B-PRIVATE-01",
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
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ vehicles: [], drivers: [] }) });
      return;
    }

    if (request.method() === "GET" && ["/Routes", "/Drivers", "/Users/my-team"].some((path) => url.pathname.endsWith(path))) {
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
  await accountAVehiclesRequestStarted;

  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await page.getByRole("button", { name: "Sí, cerrar sesión" }).click();
  await page.waitForURL(/\/login/);

  await page.getByLabel("Correo electrónico").fill("owner-b@example.test");
  await page.getByRole("textbox", { name: "Contraseña" }).fill("test-password");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.getByText("Owner B", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Gestión de Vehículos", exact: true }).click();
  await expect(page.getByText("B-PRIVATE-01", { exact: true })).toBeVisible();

  releaseAccountAVehicles();
  await expect(page.getByText("A-PRIVATE-01", { exact: true })).toHaveCount(0);
  await expect(page.getByText("B-PRIVATE-01", { exact: true })).toBeVisible();
});

test("un refresh tardío de la cuenta anterior no reemplaza ni cierra la sesión nueva", async ({ page }) => {
  let releaseAccountARefresh: () => void = () => {};
  let notifyAccountARefresh: () => void = () => {};
  const accountARefreshStarted = new Promise<void>((resolve) => {
    notifyAccountARefresh = resolve;
  });
  const accountARefreshGate = new Promise<void>((resolve) => {
    releaseAccountARefresh = resolve;
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const authorization = request.headers().authorization;

    if (url.pathname.endsWith("/Auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "auth-owner-a",
          email: "auth-a@example.test",
          username: "auth-a@example.test",
          firstName: "Auth",
          lastName: "A",
          roles: ["Admin"],
          isActive: true,
        }),
      });
      return;
    }

    if (request.method() === "GET" && url.pathname.endsWith("/Vehicles")) {
      if (authorization === "Bearer auth-account-a-token") {
        await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "Token caducado" }) });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([{
            id: "vehicle-auth-account-b",
            plate: "AUTH-B-01",
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

    if (request.method() === "POST" && url.pathname.endsWith("/Auth/refresh")) {
      const body = request.postDataJSON() as { refreshToken?: string };
      if (body.refreshToken === "auth-account-a-refresh") {
        notifyAccountARefresh();
        await accountARefreshGate;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            accessToken: "auth-account-a-refreshed-token",
            refreshToken: "auth-account-a-refreshed-refresh",
            user: {
              id: "auth-owner-a",
              email: "auth-a@example.test",
              username: "auth-a@example.test",
              firstName: "Auth",
              lastName: "A",
              roles: ["Admin"],
              isActive: true,
            },
          }),
        }).catch(() => {});
      } else {
        await route.fulfill({ status: 401, contentType: "application/json", body: "{}" });
      }
      return;
    }

    if (request.method() === "POST" && url.pathname.endsWith("/Auth/logout")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      return;
    }

    if (request.method() === "POST" && url.pathname.endsWith("/Auth/login")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: "auth-account-b-token",
          refreshToken: "auth-account-b-refresh",
          user: {
            id: "auth-owner-b",
            email: "auth-b@example.test",
            username: "auth-b@example.test",
            firstName: "Auth",
            lastName: "B",
            roles: ["Admin"],
            isActive: true,
          },
        }),
      });
      return;
    }

    if (request.method() === "GET" && url.pathname.endsWith("/Routes/assignment-options")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ vehicles: [], drivers: [] }) });
      return;
    }

    if (request.method() === "GET" && ["/Routes", "/Drivers", "/Users/my-team"].some((path) => url.pathname.endsWith(path))) {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }

    await route.continue();
  });

  await page.addInitScript(() => {
    localStorage.setItem("auth_tokens", JSON.stringify({
      accessToken: "auth-account-a-token",
      refreshToken: "auth-account-a-refresh",
    }));
  });

  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "Abrir menú" })).toBeVisible();
  await accountARefreshStarted;

  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await page.getByRole("button", { name: "Sí, cerrar sesión" }).click();
  await page.waitForURL(/\/login/);
  await page.getByLabel("Correo electrónico").fill("auth-b@example.test");
  await page.getByRole("textbox", { name: "Contraseña" }).fill("test-password");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.getByText("Auth B", { exact: false })).toBeVisible();

  releaseAccountARefresh();
  await expect(page.getByText("Auth B", { exact: false })).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const tokens = localStorage.getItem("auth_tokens");
    return tokens ? JSON.parse(tokens).accessToken : null;
  })).toBe("auth-account-b-token");
  await expect(page.getByText("Auth A", { exact: false })).toHaveCount(0);
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

test("Admin delegado no recibe opciones de crear ni promover a Admin", async ({ page }) => {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.endsWith("/Auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "delegated-admin-id",
          email: "delegated-admin@example.test",
          username: "delegated-admin",
          firstName: "Admin delegado",
          roles: ["Admin"],
          isActive: true,
        }),
      });
      return;
    }

    if (request.method() === "GET" && url.pathname.endsWith("/Users/my-team")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{
          id: "member-user-1",
          email: "member@example.test",
          username: "member",
          firstName: "Miembro",
          lastName: "Equipo",
          roles: ["User"],
          isActive: true,
        }]),
      });
      return;
    }

    if (request.method() === "GET" && ["/Drivers", "/Vehicles", "/Routes"].some((path) => url.pathname.endsWith(path))) {
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
    const payload = btoa(JSON.stringify({ nameid: "delegated-admin-id", owner_id: "root-account-id", role: "Admin" }))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    localStorage.setItem("auth_tokens", JSON.stringify({
      accessToken: `e30.${payload}.test-signature`,
      refreshToken: "playwright-test-refresh-token",
    }));
  });

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Gestión de Equipo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Gestión de Equipo" })).toBeVisible();

  await page.getByRole("button", { name: "Crear Usuario" }).click();
  const createDialog = page.getByRole("dialog");
  await expect(createDialog.getByRole("button", { name: "Gerente", exact: true })).toHaveCount(0);
  await createDialog.getByRole("button", { name: "Cancelar" }).click();

  const memberCard = page.getByTestId("team-user-member-user-1");
  await expect(memberCard).toBeVisible();
  await expect(memberCard.getByRole("button", { name: "Gerente", exact: true })).toHaveCount(0);
});

test("Gestión de Equipo pide confirmar cambios de rol y estado, y persiste sólo al confirmar", async ({ page }) => {
  test.setTimeout(60_000);
  let persistedMember = {
    id: "member-confirmation-1",
    email: "maria@example.test",
    username: "maria",
    firstName: "María Fernanda del Valle de los Ángeles",
    lastName: "Pérez Alcántara y Rodríguez",
    roles: ["User"],
    isActive: true,
  };
  let roleRequests = 0;
  let statusRequests = 0;

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.endsWith("/Auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "confirmation-admin-id",
          email: "admin@example.test",
          username: "admin",
          firstName: "Admin",
          roles: ["Admin"],
          isRootAccount: true,
          isActive: true,
        }),
      });
      return;
    }

    if (request.method() === "GET" && url.pathname.endsWith("/Users/my-team")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([persistedMember]) });
      return;
    }

    if (request.method() === "PUT" && url.pathname.endsWith(`/Users/${persistedMember.id}/role`)) {
      roleRequests += 1;
      const payload = request.postDataJSON() as { roleName: string };
      persistedMember = { ...persistedMember, roles: [payload.roleName] };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(persistedMember) });
      return;
    }

    if (request.method() === "PUT" && url.pathname.endsWith(`/Users/${persistedMember.id}/status`)) {
      statusRequests += 1;
      persistedMember = { ...persistedMember, isActive: url.searchParams.get("isActive") === "true" };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(persistedMember) });
      return;
    }

    if (request.method() === "GET" && ["/Drivers", "/Vehicles", "/Routes"].some((path) => url.pathname.endsWith(path))) {
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
      accessToken: "playwright-confirmation-access-token",
      refreshToken: "playwright-confirmation-refresh-token",
    }));
  });

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Gestión de Equipo", exact: true }).click();
  const memberCard = page.getByTestId(`team-user-${persistedMember.id}`);
  await expect(memberCard).toBeVisible();

  await page.setViewportSize({ width: 320, height: 360 });
  await memberCard.getByRole("button", { name: "Activo", exact: true }).click();
  const deactivateDialog = page.getByRole("alertdialog");
  await expect(deactivateDialog).toContainText(persistedMember.firstName);
  await expect(deactivateDialog).toContainText("perderá acceso a FleetFlow");
  const deactivateBounds = await deactivateDialog.boundingBox();
  expect(deactivateBounds).not.toBeNull();
  expect(deactivateBounds!.x).toBeGreaterThanOrEqual(0);
  expect(deactivateBounds!.x + deactivateBounds!.width).toBeLessThanOrEqual(320);
  expect(deactivateBounds!.y).toBeGreaterThanOrEqual(0);
  expect(deactivateBounds!.y + deactivateBounds!.height).toBeLessThanOrEqual(360);
  const cancelButton = deactivateDialog.getByRole("button", { name: "Cancelar", exact: true });
  const cancelBounds = await cancelButton.boundingBox();
  if (cancelBounds && cancelBounds.y + cancelBounds.height > 360) {
    await deactivateDialog.evaluate((dialog) => { dialog.scrollTop = dialog.scrollHeight; });
  }
  await expect(cancelButton).toBeInViewport();
  await cancelButton.click();
  await expect(deactivateDialog).toHaveCount(0);
  expect(statusRequests).toBe(0);
  expect(persistedMember.isActive).toBe(true);
  await expect(memberCard.getByRole("button", { name: "Activo", exact: true })).toBeVisible();

  await memberCard.getByRole("button", { name: "Activo", exact: true }).click();
  const lowHeightDialog = page.getByRole("alertdialog");
  const lowHeightBounds = await lowHeightDialog.boundingBox();
  expect(lowHeightBounds).not.toBeNull();
  expect(lowHeightBounds!.x).toBeGreaterThanOrEqual(0);
  expect(lowHeightBounds!.x + lowHeightBounds!.width).toBeLessThanOrEqual(320);
  expect(lowHeightBounds!.y).toBeGreaterThanOrEqual(0);
  expect(lowHeightBounds!.y + lowHeightBounds!.height).toBeLessThanOrEqual(360);
  const confirmDeactivation = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith(`/Users/${persistedMember.id}/status`) && response.request().method() === "PUT",
  );
  const confirmDeactivationButton = lowHeightDialog.getByRole("button", { name: "Sí, desactivar cuenta" });
  const confirmBounds = await confirmDeactivationButton.boundingBox();
  if (confirmBounds && confirmBounds.y + confirmBounds.height > 360) {
    await lowHeightDialog.evaluate((dialog) => { dialog.scrollTop = dialog.scrollHeight; });
  }
  await expect(confirmDeactivationButton).toBeInViewport();
  await confirmDeactivationButton.click();
  expect((await confirmDeactivation).status()).toBe(200);
  await expect(memberCard.getByRole("button", { name: "Inactivo", exact: true })).toBeVisible();
  expect(persistedMember.isActive).toBe(false);

  await memberCard.getByRole("button", { name: "Inactivo", exact: true }).click();
  const activateDialog = page.getByRole("alertdialog");
  await expect(activateDialog).toContainText(persistedMember.firstName);
  await expect(activateDialog).toContainText("podrá volver a iniciar sesión");
  await activateDialog.getByRole("button", { name: "Sí, activar cuenta" }).click();
  await expect(memberCard.getByRole("button", { name: "Activo", exact: true })).toBeVisible();
  expect(statusRequests).toBe(2);
  expect(persistedMember.isActive).toBe(true);

  const logisticsRole = memberCard.getByRole("button", { name: "Logistica", exact: true });
  await logisticsRole.click();
  const roleDialog = page.getByRole("alertdialog");
  await expect(roleDialog).toContainText(`${persistedMember.firstName} ${persistedMember.lastName} cambiará de Usuario a Logística`);
  await expect(roleDialog).toContainText("podrá consultar el mapa y gestionar rutas");
  await roleDialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  expect(roleRequests).toBe(0);
  expect(persistedMember.roles).toEqual(["User"]);
  await expect(memberCard.getByRole("button", { name: "Usuario", exact: true })).toBeVisible();

  await logisticsRole.click();
  const confirmRoleChange = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith(`/Users/${persistedMember.id}/role`) && response.request().method() === "PUT",
  );
  await page.getByRole("alertdialog").getByRole("button", { name: "Confirmar cambio" }).click();
  expect((await confirmRoleChange).status()).toBe(200);
  await expect(memberCard.getByRole("button", { name: "Logistica", exact: true })).toBeVisible();
  expect(persistedMember.roles).toEqual(["Logistics"]);

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.reload();
  await page.getByRole("button", { name: "Gestión de Equipo", exact: true }).click();
  const persistedCard = page.getByTestId(`team-user-${persistedMember.id}`);
  await expect(persistedCard.getByRole("button", { name: "Logistica", exact: true })).toBeVisible();
  await expect(persistedCard.getByRole("button", { name: "Activo", exact: true })).toBeVisible();
  expect(roleRequests).toBe(1);
  expect(statusRequests).toBe(2);
});

test("Historial distingue error de lista vacía y permite reintentar", async ({ page }) => {
  let failRouteHistory = false;
  let holdRouteResponses = false;
  let releaseRouteResponse: () => void = () => {};
  let notifyRouteRequest: () => void = () => {};
  const routeRequestStarted = new Promise<void>((resolve) => {
    notifyRouteRequest = resolve;
  });
  const routeResponseGate = new Promise<void>((resolve) => {
    releaseRouteResponse = resolve;
  });
  let routeHistoryData: unknown[] = [];
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
      if (holdRouteResponses) {
        notifyRouteRequest();
        await routeResponseGate;
      }
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "Servicio temporalmente no disponible" }),
      });
      return;
    }

    if (request.method() === "GET" && url.pathname.endsWith("/Routes")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(routeHistoryData) });
      return;
    }

    if (
      request.method() === "GET" &&
      ["/Users/my-team", "/Drivers", "/Vehicles"].some((path) => url.pathname.endsWith(path))
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
  holdRouteResponses = true;
  await page.getByRole("button", { name: "Abrir menú" }).click();
  const failedHistoryResponse = page.waitForResponse((response) =>
    response.request().method() === "GET" &&
    new URL(response.url()).pathname.endsWith("/Routes") &&
    response.status() === 503,
  );
  await page.getByRole("button", { name: "Historial de Rutas", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Historial de Rutas", level: 2 })).toBeVisible();
  await routeRequestStarted;
  await expect(page.getByText("Cargando rutas...", { exact: true })).toBeVisible();
  await expect(page.getByText("No hay rutas para mostrar", { exact: true })).toHaveCount(0);
  holdRouteResponses = false;
  releaseRouteResponse();
  await failedHistoryResponse;

  const historyAlert = page.getByRole("alert").filter({ hasText: "No se pudieron cargar las rutas" });
  await expect(historyAlert).toBeVisible();
  await expect(page.getByText("No hay rutas para mostrar")).toHaveCount(0);
  failRouteHistory = false;
  routeHistoryData = [{
    id: "route-history-multi-stop",
    vehicleId: "history-vehicle",
    vehiclePlate: "HST-123",
    driverId: "history-driver",
    name: "Ruta con operaciones mixtas",
    origin: { latitude: -0.18, longitude: -78.46, name: "Origen" },
    destination: { latitude: -0.2, longitude: -78.48, name: "Destino" },
    points: [
      { latitude: -0.18, longitude: -78.46, name: "Origen", operation: 0, status: 0 },
      { latitude: -0.19, longitude: -78.47, name: "Recoger paquete", operation: 1, status: 2 },
      { latitude: -0.195, longitude: -78.475, name: "Entregar paquete", operation: 2, status: 0 },
      { latitude: -0.197, longitude: -78.477, name: "Cambio y entrega", operation: 3, status: 4 },
      { latitude: -0.2, longitude: -78.48, name: "Destino", operation: 0, status: 0 },
    ],
    cargoDescription: "Paquetes QA",
    plannedStart: "2038-07-21T10:00:00Z",
    status: 2,
    isActive: true,
  }];

  const recoveredHistoryResponse = page.waitForResponse((response) =>
    response.request().method() === "GET" &&
    new URL(response.url()).pathname.endsWith("/Routes") &&
    response.status() === 200,
  );
  await historyAlert.getByRole("button", { name: "Reintentar" }).click();
  await recoveredHistoryResponse;
  await expect(historyAlert).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Ruta con operaciones mixtas" })).toBeVisible();
  await page.getByRole("button", { name: "Ver Detalles" }).click();
  const details = page.getByRole("dialog");
  await expect(details.getByText("Paradas operativas")).toBeVisible();
  await expect(details.getByText("Recoger paquete")).toBeVisible();
  await expect(details.getByText("Recogida", { exact: true })).toBeVisible();
  await expect(details.getByText("Completada", { exact: true })).toHaveCount(2);
  await expect(details.getByText("Entregar paquete")).toBeVisible();
  await expect(details.getByText("Entrega", { exact: true })).toBeVisible();
  await expect(details.getByText("Cambio y entrega")).toBeVisible();
  await expect(details.getByText("Recogida y entrega", { exact: true })).toBeVisible();
  await expect(details.getByText("Omitida", { exact: true })).toBeVisible();
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
});

test("Historial evita consultas duplicadas si vuelve el foco durante una carga", async ({ page }) => {
  let routeRequests = 0;
  let holdRouteResponses = false;
  let releaseRouteResponse: () => void = () => {};
  let notifyRouteRequest: () => void = () => {};
  const routeRequestStarted = new Promise<void>((resolve) => {
    notifyRouteRequest = resolve;
  });
  const routeResponseGate = new Promise<void>((resolve) => {
    releaseRouteResponse = resolve;
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.endsWith("/Auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "history-focus-admin", email: "admin@example.test", roles: ["Admin"], isActive: true }),
      });
      return;
    }

    if (request.method() === "GET" && url.pathname.endsWith("/Routes")) {
      routeRequests += 1;
      if (holdRouteResponses) {
        notifyRouteRequest();
        await routeResponseGate;
      }
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

    if (["/Users/my-team", "/Drivers", "/Vehicles"].some((path) => url.pathname.endsWith(path))) {
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

  const dashboardRoutes = page.waitForResponse((response) =>
    response.request().method() === "GET" && new URL(response.url()).pathname.endsWith("/Routes"),
  );
  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "Abrir menú" })).toBeVisible();
  await dashboardRoutes;
  expect(routeRequests).toBeGreaterThan(0);

  holdRouteResponses = true;
  await page.getByRole("button", { name: "Abrir menú" }).click();
  const historyResponse = page.waitForResponse((response) =>
    response.request().method() === "GET" && new URL(response.url()).pathname.endsWith("/Routes"),
  );
  await page.getByRole("button", { name: "Historial de Rutas", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Historial de Rutas", level: 2 })).toBeVisible();
  await routeRequestStarted;
  await expect(page.getByText("Cargando rutas...", { exact: true })).toBeVisible();
  const requestsWhileLoading = routeRequests;

  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.waitForTimeout(100);
  expect(routeRequests).toBe(requestsWhileLoading);

  holdRouteResponses = false;
  releaseRouteResponse();
  await historyResponse;
  await expect(page.getByText("No hay rutas para mostrar", { exact: true })).toBeVisible();

  const focusRefresh = page.waitForResponse((response) =>
    response.request().method() === "GET" && new URL(response.url()).pathname.endsWith("/Routes"),
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await focusRefresh;
  expect(routeRequests).toBe(requestsWhileLoading + 1);
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
