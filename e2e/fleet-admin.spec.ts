import { expect, test, type Locator } from "@playwright/test";
import { randomUUID } from "node:crypto";

const email = process.env.FLETFLOW_E2E_ADMIN_EMAIL;
const password = process.env.FLETFLOW_E2E_ADMIN_PASSWORD;
const userEmail = process.env.FLETFLOW_E2E_USER_EMAIL;
const userPassword = process.env.FLETFLOW_E2E_USER_PASSWORD;
const deactivationUserEmail = process.env.FLETFLOW_E2E_DEACTIVATION_EMAIL;
const deactivationUserPassword = process.env.FLETFLOW_E2E_DEACTIVATION_PASSWORD;
const driverEmail = process.env.FLETFLOW_E2E_DRIVER_EMAIL;
const driverPassword = process.env.FLETFLOW_E2E_DRIVER_PASSWORD;
const otherTenantEmail = process.env.FLETFLOW_E2E_OTHER_TENANT_EMAIL;
const otherTenantPassword = process.env.FLETFLOW_E2E_OTHER_TENANT_PASSWORD;
const driverIdFixture = process.env.FLETFLOW_E2E_DRIVER_ID;
const allowMutations = process.env.FLETFLOW_E2E_ALLOW_MUTATIONS === "true";

async function clickMapAwayFromMarkers(map: Locator) {
  const page = map.page();
  const mapToggle = page.getByRole("button", { name: "Ver mapa", exact: true });
  const usesMobileMapToggle = await mapToggle.isVisible();
  if (usesMobileMapToggle) {
    await mapToggle.click();
    await expect(page.getByRole("button", { name: "Ver paradas y detalles", exact: true })).toBeVisible();
  }
  await map.scrollIntoViewIfNeeded();
  const bounds = await map.boundingBox();
  if (!bounds) throw new Error("El mapa de selección no tiene dimensiones visibles.");

  const markerCenters = await map.locator(".leaflet-marker-icon").evaluateAll((markers) => {
    const mapElement = markers[0]?.closest(".leaflet-container");
    if (!mapElement) return [];
    const mapRect = mapElement.getBoundingClientRect();
    return markers.map((marker) => {
      const rect = marker.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2 - mapRect.left,
        y: rect.top + rect.height / 2 - mapRect.top,
      };
    });
  });
  const candidates = [0.18, 0.32, 0.5, 0.68, 0.82].flatMap((x) =>
    [0.32, 0.46, 0.6, 0.74].map((y) => ({
      x: bounds.width * x,
      y: bounds.height * y,
    })),
  );
  const safeSpot = candidates
    .map((candidate) => ({
      ...candidate,
      clearance: markerCenters.length
        ? Math.min(...markerCenters.map((marker) => Math.hypot(candidate.x - marker.x, candidate.y - marker.y)))
        : Number.POSITIVE_INFINITY,
    }))
    .sort((left, right) => right.clearance - left.clearance)
    .find((candidate) => candidate.clearance > 36);

  if (!safeSpot) throw new Error("No se encontró un área libre de marcadores para seleccionar el punto.");
  await map.click({ position: { x: safeSpot.x, y: safeSpot.y } });
  if (usesMobileMapToggle) {
    await expect(page.getByRole("button", { name: "Ver mapa", exact: true })).toBeVisible();
  }
}

test("formulario de inicio de sesión se adapta a móvil sin desbordarse", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await expect(page.getByLabel("Correo electrónico")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Contraseña" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();

  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
});

test("login con credenciales inválidas muestra un error comprensible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill("invalid.qa@example.test");
  await page.getByRole("textbox", { name: "Contraseña" }).fill("invalid-password");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.getByText("Correo o contraseña incorrectos")).toBeVisible();

  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
});

test("el registro público crea el tenant Gerente aislado y permite administrar la flota", async ({ page, request }) => {
  test.skip(!allowMutations, "Requiere API/MySQL QA descartables con FLETFLOW_E2E_ALLOW_MUTATIONS=true.");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/register");
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9);
  const emailAddress = `fletflow.e2e.admin.register.${suffix}@example.test`;
  const password = `RegisterQA-${randomUUID()}aA1!`;

  await page.getByLabel("Nombres").fill("E2E QA Empresa");
  await page.getByLabel("Apellidos").fill("Propietaria");
  await page.getByLabel("Correo electrónico").fill(emailAddress);
  await page.locator('input[type="password"]').nth(0).fill(password);
  await page.locator('input[type="password"]').nth(1).fill(password);
  const registrationPromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith("/api/backend/Auth/register") &&
    response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  expect((await registrationPromise).status()).toBe(200);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(page.getByRole("button", { name: "Dashboard Principal", exact: true })).toBeVisible();

  const token = await page.evaluate(() => {
    const serialized = localStorage.getItem("auth_tokens");
    return serialized ? JSON.parse(serialized).accessToken as string : null;
  });
  expect(token).toBeTruthy();
  const headers = { Authorization: `Bearer ${token}` };
  const meResponse = await request.get("/api/backend/Auth/me", { headers });
  expect(meResponse.status()).toBe(200);
  const me = await meResponse.json();
  expect(me.username).toBe("E2E QA Empresa Propietaria");
  expect(me.roles).toEqual(["Admin"]);

  const vehiclesResponse = await request.get("/api/backend/Vehicles", { headers });
  expect(vehiclesResponse.status()).toBe(200);
  expect(await vehiclesResponse.json()).toEqual([]);
  await expect(page.getByRole("button", { name: "Gestión de Vehículos", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gestión de Rutas", exact: true })).toBeVisible();
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
});

test("Admin navega el dashboard y rutas en tablet sin desbordamiento", async ({ page, request }) => {
  test.skip(!email || !password, "Requiere cuenta QA Admin.");

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email!);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(password!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Rutas Activas", { exact: true })).toBeVisible();

  const dashboardToken = await page.evaluate(() => {
    const serialized = localStorage.getItem("auth_tokens");
    return serialized ? JSON.parse(serialized).accessToken as string : null;
  });
  expect(dashboardToken).toBeTruthy();
  const dashboardHeaders = { Authorization: `Bearer ${dashboardToken}` };
  const [routesResponse, vehiclesResponse] = await Promise.all([
    request.get("/api/backend/Routes", { headers: dashboardHeaders }),
    request.get("/api/backend/Vehicles", { headers: dashboardHeaders }),
  ]);
  expect(routesResponse.status()).toBe(200);
  expect(vehiclesResponse.status()).toBe(200);
  const apiRoutes = await routesResponse.json() as { name: string; status: string | number; isActive?: boolean; createdAtUtc?: string | null; endedAt?: string | null; startedAt?: string | null }[];
  const apiVehicles = await vehiclesResponse.json() as { status: string | number; isActive?: boolean }[];
  const routeState = (status: string | number) => {
    const value = String(status).toLowerCase();
    if (value === "1" || value.includes("progress")) return "in_progress";
    if (value === "2" || value.includes("complet")) return "completed";
    if (value === "3" || value.includes("cancel")) return "cancelled";
    return "pending";
  };
  const vehicleState = (status: string | number) => {
    const value = String(status).toLowerCase();
    if (value === "1" || value.includes("route")) return "in_route";
    if (value === "2" || value.includes("maint")) return "maintenance";
    return "available";
  };
  const visibleRoutes = apiRoutes.filter((route) => route.isActive !== false);
  const visibleVehicles = apiVehicles.filter((vehicle) => vehicle.isActive !== false);
  const expectDashboardStat = async (label: string, value: number) => {
    const card = page.getByText(label, { exact: true }).locator("xpath=..");
    await expect(card.locator("p").nth(1)).toHaveText(String(value));
  };
  await expectDashboardStat("Rutas Activas", visibleRoutes.filter((route) => routeState(route.status) === "in_progress").length);
  await expectDashboardStat("Vehículos Disponibles", visibleVehicles.filter((vehicle) => vehicleState(vehicle.status) === "available").length);
  await expectDashboardStat("Rutas Pendientes", visibleRoutes.filter((route) => routeState(route.status) === "pending").length);
  await expectDashboardStat("Rutas Completadas", visibleRoutes.filter((route) => routeState(route.status) === "completed").length);
  const latestKnownRoute = visibleRoutes
    .filter((route) => route.createdAtUtc || route.endedAt || route.startedAt)
    .sort((left, right) => (right.createdAtUtc ?? right.endedAt ?? right.startedAt ?? "")
      .localeCompare(left.createdAtUtc ?? left.endedAt ?? left.startedAt ?? ""))[0];
  if (latestKnownRoute) {
    const activity = page.getByRole("heading", { name: "Actividad Reciente" }).locator("xpath=..");
    await expect(activity.locator(".space-y-3 > div").first()).toContainText(latestKnownRoute.name);
  }

  await expect(page.getByRole("button", { name: "Abrir menú" })).toBeVisible();
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(page.getByRole("button", { name: "Dashboard Principal", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Gestión de Rutas", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Rutas", exact: true })).toBeVisible();

  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
    main: document.querySelector("main")?.getBoundingClientRect().width ?? 0,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
  expect(widths.main).toBeGreaterThan(700);

  await page.setViewportSize({ width: 320, height: 844 });
  const assertMobileWidth = async () => {
    const mobileWidths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(mobileWidths.content).toBeLessThanOrEqual(mobileWidths.viewport);
  };
  await assertMobileWidth();
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Dashboard Principal", exact: true }).click();
  await expect(page.getByRole("button", { name: "Abrir menú" })).toBeVisible();
  await assertMobileWidth();
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Historial de Rutas", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Historial de Rutas", exact: true })).toBeVisible();
  await assertMobileWidth();
});

test("Admin usa Equipo y mapa en móvil y tablet sin desbordamiento", async ({ page }) => {
  test.skip(!email || !password, "Requiere cuenta QA Admin.");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email!);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(password!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const assertNoHorizontalOverflow = async () => {
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  };

  await assertNoHorizontalOverflow();

  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Gestión de Equipo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Gestión de Equipo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Crear Usuario" })).toBeVisible();
  await assertNoHorizontalOverflow();

  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Mapa en Tiempo Real", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mapa de rutas" })).toBeVisible();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await assertNoHorizontalOverflow();

  await page.setViewportSize({ width: 768, height: 1024 });
  await assertNoHorizontalOverflow();
  await page.getByRole("button", { name: "Volver" }).click();
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Gestión de Equipo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Gestión de Equipo" })).toBeVisible();
  await assertNoHorizontalOverflow();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Mi Perfil", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mi Perfil" })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 844 });
  await assertNoHorizontalOverflow();
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(page.getByPlaceholder("Contraseña actual")).toBeVisible();
  await assertNoHorizontalOverflow();
  await page.setViewportSize({ width: 768, height: 1024 });
  await assertNoHorizontalOverflow();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/backend/Auth/logout-all", async (route) => {
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Servicio temporalmente no disponible" }) });
  });
  await page.getByRole("button", { name: "Cerrar sesión en todos los dispositivos" }).click();
  await expect(page.getByText("Servicio temporalmente no disponible")).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Mi Perfil" })).toBeVisible();
});

test("Admin selecciona una ruta y consulta su tracking en el mapa tablet", async ({ page, request }) => {
  test.skip(!email || !password || !driverIdFixture || !allowMutations, "Requiere cuenta Admin/Driver QA y FLETFLOW_E2E_ALLOW_MUTATIONS=true.");

  test.setTimeout(90_000);
  page.setDefaultTimeout(8_000);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email!);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(password!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Mapa en Tiempo Real", exact: true }).click();

  const token = await page.evaluate(() => {
    const serialized = localStorage.getItem("auth_tokens");
    return serialized ? JSON.parse(serialized).accessToken as string : null;
  });
  expect(token).toBeTruthy();
  const headers = { Authorization: `Bearer ${token}` };
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9);
  const routeName = `E2E QA ruta mapa ${suffix}`;
  const secondRouteName = `E2E QA ruta mapa alterna ${suffix}`;
  const secondDriverEmail = `fletflow.e2e.driver.map.${suffix}@example.test`;
  let firstVehicleId: string | undefined;
  let secondVehicleId: string | undefined;
  let firstRouteId: string | undefined;
  let secondRouteId: string | undefined;
  let secondDriverId: string | undefined;
  const originalDriverResponse = await request.get(`/api/backend/Drivers/${driverIdFixture}`, { headers });
  expect(originalDriverResponse.status()).toBe(200);
  const originalDriverVehicleId = (await originalDriverResponse.json()).vehicleId as string | null;

  try {
    const secondDriverResponse = await request.post("/api/backend/Users", {
      headers,
      data: {
        username: `E2E QA Map ${suffix}`,
        email: secondDriverEmail,
        password: `MapQA-${randomUUID()}aA1!`,
        roleName: "Driver",
        firstName: "E2E QA Map",
        lastName: suffix,
        documentNumber: `E2EQA${suffix}`,
        phoneNumber: "0990000000",
      },
    });
    expect(secondDriverResponse.status()).toBe(200);
    const secondDriver = await secondDriverResponse.json();
    secondDriverId = secondDriver.driverId as string;
    const activateUserResponse = await request.put(`/api/backend/Users/${secondDriver.id}/status?isActive=true`, { headers });
    expect(activateUserResponse.status()).toBe(200);

    const firstVehicleResponse = await request.post("/api/backend/Vehicles", {
      headers,
      data: { plate: `E2EQA${suffix}`, brand: "FleetFlow QA", model: "Map tracking", year: 2025 },
    });
    expect(firstVehicleResponse.status()).toBe(201);
    firstVehicleId = (await firstVehicleResponse.json()).id as string;
    const secondVehicleResponse = await request.post("/api/backend/Vehicles", {
      headers,
      data: { plate: `E2EQA${suffix}B`, brand: "FleetFlow QA", model: "Map selection", year: 2025 },
    });
    expect(secondVehicleResponse.status()).toBe(201);
    secondVehicleId = (await secondVehicleResponse.json()).id as string;

    const firstRouteResponse = await request.post("/api/backend/Routes", {
      headers,
      data: {
        name: routeName,
        cargoDescription: "Tracking real para prueba responsive",
        vehicleId: firstVehicleId,
        driverId: driverIdFixture,
        points: [
          { lat: -0.18, lng: -78.46, name: "Origen tracking QA", operation: 0, status: 0 },
          { lat: -0.2, lng: -78.48, name: "Destino tracking QA", operation: 0, status: 0 },
        ],
      },
    });
    expect(firstRouteResponse.status()).toBe(201);
    firstRouteId = (await firstRouteResponse.json()).id as string;
    const startRouteResponse = await request.put(`/api/backend/Routes/${firstRouteId}/status`, {
      headers,
      data: { status: 1 },
    });
    expect(startRouteResponse.status()).toBe(204);
    const positionResponse = await request.post(`/api/backend/Routes/${firstRouteId}/positions`, {
      headers,
      data: { latitude: -0.185, longitude: -78.465, recordedAt: new Date().toISOString(), speedKmh: 0, heading: 0 },
    });
    expect(positionResponse.status()).toBe(200);

    const secondRouteResponse = await request.post("/api/backend/Routes", {
      headers,
      data: {
        name: secondRouteName,
        cargoDescription: "Ruta alterna de selección QA",
        vehicleId: secondVehicleId,
        driverId: secondDriverId,
        points: [
          { lat: -0.17, lng: -78.45, name: "Origen alterno QA", operation: 0, status: 0 },
          { lat: -0.21, lng: -78.49, name: "Destino alterno QA", operation: 0, status: 0 },
        ],
      },
    });
    expect(secondRouteResponse.status()).toBe(201);
    secondRouteId = (await secondRouteResponse.json()).id as string;

    // El snapping es una mejora visual opcional; el caso valida el mapa y el tracking de la API.
    await page.route("https://router.project-osrm.org/**", async (route) => {
      await route.fulfill({ status: 503, body: "OSRM indisponible durante la prueba" });
    });
    await page.reload();
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.getByRole("button", { name: "Mapa en Tiempo Real", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Mapa de rutas" })).toBeVisible();
    const map = page.locator(".leaflet-container");
    await expect(map).toBeVisible();
    const routeList = page.locator("aside").filter({ hasText: "Rutas planificadas" });
    const alternateRouteButton = routeList.getByRole("button").filter({ hasText: secondRouteName });
    const trackingRouteButton = routeList.getByRole("button").filter({ hasText: routeName });
    await expect(alternateRouteButton).toBeVisible();
    await expect(trackingRouteButton).toBeVisible();
    await alternateRouteButton.click();
    await expect(page.getByText("Ruta seleccionada", { exact: true }).locator(".."))
      .toContainText(secondRouteName);

    const positionsRead = page.waitForResponse((response) =>
      new URL(response.url()).pathname.endsWith(`/api/backend/Routes/${firstRouteId}/positions`) &&
      response.request().method() === "GET",
    );
    await trackingRouteButton.click();
    expect((await positionsRead).status()).toBe(200);
    await expect(page.getByText("Ruta seleccionada", { exact: true }).locator(".."))
      .toContainText(routeName);
    await expect(page.locator(".leaflet-marker-icon").filter({ hasText: "🚚" })).toBeVisible();
    await page.setViewportSize({ width: 320, height: 844 });
    await expect(page.getByText("Ruta seleccionada", { exact: true }).locator(".."))
      .toContainText(routeName);
    await expect(page.locator(".leaflet-container")).toBeVisible();
    await expect(page.locator(".leaflet-marker-icon").filter({ hasText: "🚚" })).toBeVisible();
    await expect(trackingRouteButton).toBeVisible();
    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      main: document.querySelector("main")?.clientWidth ?? 0,
      mainContent: document.querySelector("main")?.scrollWidth ?? 0,
    }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport);
    expect(widths.mainContent).toBeLessThanOrEqual(widths.main);
  } finally {
    const cleanupIssues: string[] = [];
    for (const routeId of [secondRouteId, firstRouteId]) {
      if (!routeId) continue;
      try {
        const currentRoute = await request.get(`/api/backend/Routes/${routeId}`, { headers });
        if (currentRoute.ok()) {
          const status = (await currentRoute.json()).status;
          if (status === 1 || status === "InProgress") {
            const cancel = await request.put(`/api/backend/Routes/${routeId}/status`, { headers, data: { status: 3 } });
            if (cancel.status() !== 204) cleanupIssues.push(`No se pudo cancelar ruta ${routeId}: HTTP ${cancel.status()}`);
          }
          const remove = await request.delete(`/api/backend/Routes/${routeId}`, { headers });
          if (![200, 204, 404].includes(remove.status())) cleanupIssues.push(`No se pudo retirar ruta ${routeId}: HTTP ${remove.status()}`);
        } else if (currentRoute.status() !== 404) {
          cleanupIssues.push(`No se pudo consultar ruta ${routeId}: HTTP ${currentRoute.status()}`);
        }
      } catch (error) {
        cleanupIssues.push(`Falló cleanup de ruta ${routeId}: ${String(error)}`);
      }
    }
    for (const [driverId, vehicleId, previousVehicleId] of [
      [driverIdFixture!, firstVehicleId, originalDriverVehicleId],
      [secondDriverId, secondVehicleId, null],
    ] as Array<[string | undefined, string | undefined, string | null]>) {
      if (!driverId || !vehicleId) continue;
      try {
        const driverResponse = await request.get(`/api/backend/Drivers/${driverId}`, { headers });
        if (driverResponse.ok() && (await driverResponse.json()).vehicleId === vehicleId) {
          const restore = previousVehicleId
            ? await request.put(`/api/backend/Drivers/${driverId}/assign-vehicle`, { headers, data: { vehicleId: previousVehicleId } })
            : await request.put(`/api/backend/Drivers/${driverId}/unassign-vehicle`, { headers });
          if (restore.status() !== 204) cleanupIssues.push(`No se pudo restaurar Driver ${driverId}: HTTP ${restore.status()}`);
        } else if (!driverResponse.ok() && driverResponse.status() !== 404) {
          cleanupIssues.push(`No se pudo consultar Driver ${driverId}: HTTP ${driverResponse.status()}`);
        }
      } catch (error) {
        cleanupIssues.push(`Falló cleanup de Driver ${driverId}: ${String(error)}`);
      }
    }
    for (const vehicleId of [firstVehicleId, secondVehicleId]) {
      if (!vehicleId) continue;
      try {
        const remove = await request.delete(`/api/backend/Vehicles/${vehicleId}`, { headers });
        if (![200, 204, 404].includes(remove.status())) cleanupIssues.push(`No se pudo retirar vehículo ${vehicleId}: HTTP ${remove.status()}`);
      } catch (error) {
        cleanupIssues.push(`Falló cleanup de vehículo ${vehicleId}: ${String(error)}`);
      }
    }
    expect(cleanupIssues, "El cleanup del mapa debe retirar rutas/vehículos y restaurar asignaciones").toEqual([]);
  }
});

test("Admin gestiona vehículos en móvil estrecho y tablet", async ({ page }) => {
  test.skip(!email || !password || !allowMutations, "Requiere cuenta QA Admin y FLETFLOW_E2E_ALLOW_MUTATIONS=true.");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email!);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(password!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Gestión de Vehículos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Gestión de Vehículos" })).toBeVisible();

  const expectNoHorizontalOverflow = async () => {
    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(widths.content).toBeLessThanOrEqual(widths.viewport);
  };
  const expectDialogFitsViewport = async (dialog: Locator) => {
    const bounds = await dialog.boundingBox();
    expect(bounds, "El formulario debe ser visible en el viewport actual").not.toBeNull();
    const viewportWidth = page.viewportSize()!.width;
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewportWidth + 1);
  };

  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9);
  const plate = `E2EQA${suffix}`;
  let vehicleId: string | undefined;

  try {
    await page.setViewportSize({ width: 320, height: 844 });
    await expectNoHorizontalOverflow();
    await page.getByRole("button", { name: "Agregar Vehículo" }).click();
    const dialog = page.getByRole("dialog");
    await expectDialogFitsViewport(dialog);
    await dialog.getByPlaceholder("ABC-123").fill(plate);
    await dialog.getByPlaceholder("Toyota").fill("FleetFlow QA");
    await dialog.getByPlaceholder("Hilux").fill("Browser test");
    await dialog.locator('input[type="number"]').fill("2025");

    const created = page.waitForResponse((response) =>
      response.url().includes("/api/backend/Vehicles") &&
      response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Agregar", exact: true }).click();
    const createResponse = await created;
    expect(createResponse.status()).toBe(201);
    vehicleId = (await createResponse.json()).id as string;

    const card = page.locator(".grid > div").filter({ hasText: plate });
    await expect(card).toContainText("FleetFlow QA Browser test");

    await page.getByRole("button", { name: "Agregar Vehículo" }).click();
    const duplicateDialog = page.getByRole("dialog");
    await duplicateDialog.getByPlaceholder("ABC-123").fill(plate);
    await duplicateDialog.getByPlaceholder("Toyota").fill("FleetFlow QA");
    await duplicateDialog.getByPlaceholder("Hilux").fill("Duplicate test");
    await duplicateDialog.locator('input[type="number"]').fill("2025");
    const duplicateResponsePromise = page.waitForResponse((response) =>
      new URL(response.url()).pathname.endsWith("/api/backend/Vehicles") &&
      response.request().method() === "POST",
    );
    await duplicateDialog.getByRole("button", { name: "Agregar", exact: true }).click();
    const duplicateResponse = await duplicateResponsePromise;
    expect(duplicateResponse.status()).toBe(409);
    await expect(page.getByText(`Ya existe un vehículo con la placa ${plate} en esta empresa.`)).toBeVisible();
    await expect(duplicateDialog).toBeVisible();
    await expect(page.locator(".grid > div").filter({ hasText: plate })).toHaveCount(1);
    await duplicateDialog.getByRole("button", { name: "Cancelar" }).click();

    await card.getByRole("button", { name: "Editar" }).click();
    const editDialog = page.getByRole("dialog");
    await editDialog.getByPlaceholder("Toyota").fill("FleetFlow QA Editado");
    const updated = page.waitForResponse((response) =>
      response.url().includes(`/api/backend/Vehicles/${vehicleId}`) &&
      response.request().method() === "PUT",
    );
    await editDialog.getByRole("button", { name: "Actualizar", exact: true }).click();
    expect((await updated).status()).toBe(200);
    await expect(card).toContainText("FleetFlow QA Editado Browser test");

    await page.setViewportSize({ width: 768, height: 1024 });
    await expectNoHorizontalOverflow();
    await card.getByRole("button", { name: "Editar" }).click();
    const maintenanceDialog = page.getByRole("dialog");
    await expectDialogFitsViewport(maintenanceDialog);
    await maintenanceDialog.locator("select").selectOption("mantenimiento");
    await expect(maintenanceDialog.locator("select")).toHaveValue("mantenimiento");
    const maintenanceUpdate = page.waitForResponse((response) =>
      new URL(response.url()).pathname.endsWith(`/api/backend/Vehicles/${vehicleId}/status`) &&
      response.request().method() === "PUT",
    );
    await maintenanceDialog.getByRole("button", { name: "Actualizar", exact: true }).click();
    const maintenanceResponse = await maintenanceUpdate;
    expect(maintenanceResponse.status()).toBe(204);
    expect(maintenanceResponse.request().postDataJSON()).toEqual({ status: 2 });
    await expect(card).toContainText("Mantenimiento");
    const authHeaders = {
      Authorization: `Bearer ${await page.evaluate(() => JSON.parse(localStorage.getItem("auth_tokens") ?? "{}").accessToken)}`,
    };
    const maintenanceVehicle = await page.request.get(`/api/backend/Vehicles/${vehicleId}`, { headers: authHeaders });
    expect(maintenanceVehicle.status()).toBe(200);
    expect((await maintenanceVehicle.json()).status).toBe(2);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.getByRole("button", { name: "Gestión de Vehículos", exact: true }).click();
    await expect(page.locator(".grid > div").filter({ hasText: plate })).toContainText("Mantenimiento");
    await page.locator(".grid > div").filter({ hasText: plate }).getByRole("button", { name: "Editar" }).click();
    const availableDialog = page.getByRole("dialog");
    await availableDialog.locator("select").selectOption("disponible");
    await expect(availableDialog.locator("select")).toHaveValue("disponible");
    const availableUpdate = page.waitForResponse((response) =>
      new URL(response.url()).pathname.endsWith(`/api/backend/Vehicles/${vehicleId}/status`) &&
      response.request().method() === "PUT",
    );
    await availableDialog.getByRole("button", { name: "Actualizar", exact: true }).click();
    const availableResponse = await availableUpdate;
    expect(availableResponse.status()).toBe(204);
    expect(availableResponse.request().postDataJSON()).toEqual({ status: 0 });
    const availableVehicle = await page.request.get(`/api/backend/Vehicles/${vehicleId}`, { headers: authHeaders });
    expect(availableVehicle.status()).toBe(200);
    expect((await availableVehicle.json()).status).toBe(0);
    await expect(page.locator(".grid > div").filter({ hasText: plate })).toContainText("Disponible");

    await card.getByRole("button").nth(1).click();
    const confirmation = page.getByRole("alertdialog");
    await expect(confirmation.getByText("Eliminar Vehículo")).toBeVisible();
    const deleted = page.waitForResponse((response) =>
      response.url().includes(`/api/backend/Vehicles/${vehicleId}`) &&
      response.request().method() === "DELETE",
    );
    await confirmation.getByRole("button", { name: "Sí, eliminar" }).click();
    expect((await deleted).status()).toBe(204);
    await expect(card).toHaveCount(0);

    await page.getByRole("button", { name: "Mostrar bajas" }).click();
    const inactiveVehicles = page.getByRole("region", { name: "Vehículos dados de baja" });
    const inactiveCard = inactiveVehicles.locator("div.rounded-lg.border").filter({ hasText: plate });
    await expect(inactiveCard).toContainText("FleetFlow QA Editado Browser test");
    const reactivated = page.waitForResponse((response) =>
      response.url().includes(`/api/backend/Vehicles/${vehicleId}/reactivate`) &&
      response.request().method() === "POST",
    );
    await inactiveCard.getByRole("button", { name: "Reactivar" }).click();
    expect((await reactivated).status()).toBe(204);
    const vehicleAfterReactivation = await page.request.get(`/api/backend/Vehicles/${vehicleId}`, {
      headers: authHeaders,
    });
    expect(vehicleAfterReactivation.status()).toBe(200);
    expect((await vehicleAfterReactivation.json()).isActive).toBe(true);
    await expect(page.locator(".grid > div").filter({ hasText: plate })).toContainText("FleetFlow QA Editado Browser test");

    await page.setViewportSize({ width: 768, height: 1024 });
    await expectNoHorizontalOverflow();
  } finally {
    if (vehicleId) {
      const token = await page.evaluate(() => {
        const serialized = localStorage.getItem("auth_tokens");
        return serialized ? JSON.parse(serialized).accessToken as string : null;
      }).catch(() => null);
      if (token) {
        await page.request.delete(`/api/backend/Vehicles/${vehicleId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => undefined);
      }
    }
  }
});

test("Admin edita una ruta móvil, conserva su operación y la consulta en Historial", async ({ page }) => {
  test.skip(!email || !password || !driverIdFixture || !allowMutations, "Requiere Admin/Driver QA y FLETFLOW_E2E_ALLOW_MUTATIONS=true.");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email!);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(password!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const token = await page.evaluate(() => {
    const serialized = localStorage.getItem("auth_tokens");
    return serialized ? JSON.parse(serialized).accessToken as string : null;
  });
  expect(token).toBeTruthy();
  const headers = { Authorization: `Bearer ${token}` };
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9);
  const routeName = `E2E QA ruta ${suffix}`;
  const updatedName = `${routeName} editada`;
  let vehicleId: string | undefined;
  let routeId: string | undefined;

  try {
    const vehicleResponse = await page.request.post("/api/backend/Vehicles", {
      headers,
      data: { plate: `E2EQA${suffix}`, brand: "FleetFlow QA", model: "Route test", year: 2025 },
    });
    expect(vehicleResponse.status()).toBe(201);
    vehicleId = (await vehicleResponse.json()).id as string;

    const routeResponse = await page.request.post("/api/backend/Routes", {
      headers,
      data: {
        name: routeName,
        cargoDescription: "E2E QA recogida y entrega",
        vehicleId,
        driverId: driverIdFixture,
        plannedStart: "2038-07-21T10:00:00Z",
        plannedEnd: "2038-07-21T12:00:00Z",
        points: [
          { lat: -0.18, lng: -78.46, name: "E2E origen", operation: 0, status: 0 },
          { lat: -0.19, lng: -78.47, name: "E2E parada", operation: 3, status: 0 },
          { lat: -0.2, lng: -78.48, name: "E2E destino", operation: 0, status: 0 },
        ],
      },
    });
    expect(routeResponse.status()).toBe(201);
    routeId = (await routeResponse.json()).id as string;

    await page.reload();
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.getByRole("button", { name: "Gestión de Rutas", exact: true }).click();
    const search = page.getByPlaceholder("Nombre de ruta");
    await search.fill(routeName);
    const routeHeading = page.getByRole("heading", { name: routeName, exact: true });
    await expect(routeHeading).toBeVisible();
    const routeCard = routeHeading.locator("xpath=../../../..");
    await page.setViewportSize({ width: 320, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await routeCard.getByRole("button", { name: "Editar ruta" }).click();

    await page.getByPlaceholder("Ej. Entregas zona norte").fill(updatedName);
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("heading", { name: "Construye el recorrido" })).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("heading", { name: "Asigna los recursos" })).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("heading", { name: "Revisa y crea" })).toBeVisible();
    await expect(page.getByText(/E2E QA Driver/)).toBeVisible();
    const updateResponsePromise = page.waitForResponse((response) =>
      response.url().includes(`/api/backend/Routes/${routeId}`) &&
      response.request().method() === "PUT",
    );
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    expect((await updateResponsePromise).status()).toBe(200);

    const persistedResponse = await page.request.get(`/api/backend/Routes/${routeId}`, { headers });
    expect(persistedResponse.status()).toBe(200);
    const persistedRoute = await persistedResponse.json();
    expect(persistedRoute.name).toBe(updatedName);
    const persistedPoints = persistedRoute.points as Array<{ operation: number | string }>;
    expect(persistedPoints.some((point) => point.operation === 3 || point.operation === "PickupAndDelivery")).toBe(true);

    await page.getByLabel("Estado").selectOption("pendiente");
    await page.getByLabel("Vehículo").selectOption(vehicleId);
    await page.getByLabel("Conductor").selectOption(driverIdFixture!);
    await expect(page.getByRole("heading", { name: updatedName, exact: true })).toBeVisible();
    await search.fill(`${updatedName} sin coincidencia`);
    await expect(page.getByText("Ninguna ruta coincide con esos filtros.")).toBeVisible();
    await page.getByRole("button", { name: "Limpiar filtros" }).click();
    await expect(page.getByRole("heading", { name: updatedName, exact: true })).toBeVisible();

    await page.setViewportSize({ width: 768, height: 1024 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const cancelRouteCard = page.getByRole("heading", { name: updatedName, exact: true }).locator("xpath=../../../..");
    await cancelRouteCard.getByRole("button", { name: `Cancelar ruta ${updatedName}` }).click();
    const cancellationPromise = page.waitForResponse((response) =>
      response.url().includes(`/api/backend/Routes/${routeId}/status`) &&
      response.request().method() === "PUT",
    );
    await expect(page.getByRole("heading", { name: "Cancelar ruta pendiente" })).toBeVisible();
    const cancelDialog = page.getByRole("alertdialog");
    await expect(cancelDialog).toContainText("La disponibilidad del vehículo depende de su estado operativo y de otras rutas activas.");
    await page.getByRole("button", { name: "Sí, cancelar ruta" }).click();
    expect((await cancellationPromise).status()).toBe(204);
    const cancelledRouteResponse = await page.request.get(`/api/backend/Routes/${routeId}`, { headers });
    expect(cancelledRouteResponse.status()).toBe(200);
    expect((await cancelledRouteResponse.json()).status).toBe(3);

    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.getByRole("button", { name: "Historial de Rutas", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Historial de Rutas" })).toBeVisible();
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByRole("button", { name: "Canceladas", exact: true })).toBeVisible();
    const historyDimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      main: document.querySelector("main")?.clientWidth ?? 0,
      mainContent: document.querySelector("main")?.scrollWidth ?? 0,
    }));
    expect(historyDimensions.document).toBeLessThanOrEqual(historyDimensions.viewport);
    expect(historyDimensions.mainContent).toBeLessThanOrEqual(historyDimensions.main);
    await page.setViewportSize({ width: 320, height: 844 });
    const narrowHistoryDimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      main: document.querySelector("main")?.clientWidth ?? 0,
      mainContent: document.querySelector("main")?.scrollWidth ?? 0,
    }));
    expect(narrowHistoryDimensions.document).toBeLessThanOrEqual(narrowHistoryDimensions.viewport);
    expect(narrowHistoryDimensions.mainContent).toBeLessThanOrEqual(narrowHistoryDimensions.main);
    await page.getByRole("button", { name: "Canceladas", exact: true }).click();
    const historyHeading = page.getByRole("heading", { name: updatedName, exact: true });
    await expect(historyHeading).toBeVisible();
    const historyCard = historyHeading.locator("xpath=../../../..");
    await expect(historyCard).toContainText("Cancelada");
    await expect(historyCard).toContainText("E2E QA Driver");
    await expect(historyCard).toContainText("Inicio planificado:");
    await expect(historyCard).not.toContainText("Inicio real:");
    await expect(historyCard).not.toContainText("Creada:");
    await historyCard.getByRole("button", { name: "Ver Detalles" }).click();
    const historyDialog = page.getByRole("dialog");
    await expect(historyDialog.getByRole("heading", { name: "Detalles de la Ruta" })).toBeVisible();
    await expect(historyDialog).toContainText(updatedName);
    await expect(historyDialog).toContainText("Cancelada");
    await expect(historyDialog).toContainText("E2E QA Driver");
    await expect(historyDialog).toContainText("Inicio planificado");
    await expect(historyDialog).not.toContainText("Fecha Creación");
    await expect(historyDialog).not.toContainText("Inicio real");
    const historyDialogBounds = await historyDialog.boundingBox();
    expect(historyDialogBounds).not.toBeNull();
    const tabletWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(historyDialogBounds!.width).toBeLessThanOrEqual(tabletWidth);
    const mobileDialog = await historyDialog.evaluate((dialog) => ({
      width: dialog.getBoundingClientRect().width,
      overflowY: getComputedStyle(dialog).overflowY,
    }));
    expect(mobileDialog.width).toBeLessThanOrEqual(320);
    expect(mobileDialog.overflowY).toBe("auto");

    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(widths.content).toBeLessThanOrEqual(widths.viewport);
  } finally {
    if (routeId) await page.request.delete(`/api/backend/Routes/${routeId}`, { headers }).catch(() => undefined);
    if (vehicleId) await page.request.delete(`/api/backend/Vehicles/${vehicleId}`, { headers }).catch(() => undefined);
  }
});

test("Admin crea una ruta desde el mapa a 320 px y la elimina con confirmación", async ({ page }) => {
  test.skip(!email || !password || !driverIdFixture || !allowMutations, "Requiere Admin/Driver QA y FLETFLOW_E2E_ALLOW_MUTATIONS=true.");
  test.setTimeout(90_000);
  page.setDefaultTimeout(8_000);

  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email!);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(password!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const token = await page.evaluate(() => {
    const serialized = localStorage.getItem("auth_tokens");
    return serialized ? JSON.parse(serialized).accessToken as string : null;
  });
  expect(token).toBeTruthy();
  const headers = { Authorization: `Bearer ${token}` };
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9);
  const routeName = `E2E QA ruta mapa ${suffix}`;
  let vehicleId: string | undefined;
  let routeId: string | undefined;
  const driverBeforeResponse = await page.request.get(`/api/backend/Drivers/${driverIdFixture}`, { headers });
  expect(driverBeforeResponse.status()).toBe(200);
  const originalDriverVehicleId = (await driverBeforeResponse.json()).vehicleId as string | null;

  try {
    const vehicleResponse = await page.request.post("/api/backend/Vehicles", {
      headers,
      data: { plate: `E2EQA${suffix}`, brand: "FleetFlow QA", model: "Map test", year: 2025 },
    });
    expect(vehicleResponse.status()).toBe(201);
    vehicleId = (await vehicleResponse.json()).id as string;

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.getByRole("button", { name: "Gestión de Rutas", exact: true }).click();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Nueva ruta", exact: true }).click();
    await page.getByPlaceholder("Ej. Entregas zona norte").fill(routeName);
    await page.getByPlaceholder("Productos, cantidad o instrucciones para el conductor").fill("Recogida y entrega de prueba E2E");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("heading", { name: "Construye el recorrido" })).toBeVisible();

    const map = page.locator(".leaflet-container");
    await page.getByRole("button", { name: "Seleccionando" }).waitFor();
    const origin = page.getByPlaceholder("¿Desde dónde sale?");
    await origin.fill("Origen E2E desde mapa");
    await expect(page.getByTestId("origin-point-0")).toContainText("Ubicación pendiente");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("heading", { name: "Construye el recorrido" })).toBeVisible();
    await expect(page.getByText("Define un origen y un destino para continuar")).toBeVisible();
    await clickMapAwayFromMarkers(map);
    await expect(page.getByTestId("origin-point-0")).not.toContainText(/Ubicación pendiente|NaN/);
    await origin.fill("Origen E2E desde mapa");
    await page.getByRole("button", { name: "Agregar parada" }).click();
    await expect(page.getByRole("button", { name: "Ver paradas y detalles" })).toBeVisible();
    await clickMapAwayFromMarkers(map);
    const stopOne = page.getByPlaceholder("Parada 1");
    await expect(page.getByTestId("stop-point-0")).not.toContainText(/Ubicación pendiente|NaN/);
    await stopOne.fill("Recogida E2E");
    await page.getByRole("combobox", { name: "Tipo de operación de la parada 1" }).selectOption("pickup");
    await page.getByRole("button", { name: "Agregar parada" }).click();
    await expect(page.getByRole("button", { name: "Ver paradas y detalles" })).toBeVisible();
    await clickMapAwayFromMarkers(map);
    const stopTwo = page.getByPlaceholder("Parada 2");
    await expect(page.getByTestId("stop-point-1")).not.toContainText(/Ubicación pendiente|NaN/);
    await stopTwo.fill("Entrega y recogida E2E");
    await page.getByRole("combobox", { name: "Tipo de operación de la parada 2" }).selectOption("pickup_and_delivery");
    await page.getByRole("button", { name: "Agregar parada" }).click();
    await page.getByRole("button", { name: "Ver paradas y detalles", exact: true }).click();
    const temporaryStop = page.getByTestId("stop-point-2");
    await temporaryStop.getByRole("button", { name: "Eliminar parada" }).click();
    await expect(page.getByTestId("stop-point-2")).toHaveCount(0);
    await page.getByTestId("stop-point-1").getByRole("button", { name: "Subir parada" }).click();
    await expect(page.getByPlaceholder("Parada 1")).toHaveValue("Entrega y recogida E2E");
    await expect(page.getByPlaceholder("Parada 2")).toHaveValue("Recogida E2E");
    const destination = page.getByPlaceholder("¿A dónde llega?");
    await destination.fill("Destino E2E desde mapa");
    const destinationRow = destination.locator("xpath=../..");
    await destinationRow.getByRole("button", { name: "Ubicar" }).click();
    await expect(page.getByRole("button", { name: "Ver paradas y detalles" })).toBeVisible();
    await expect(page.getByTestId("destination-point-0")).toContainText("Ubicación pendiente");
    await clickMapAwayFromMarkers(map);
    await expect(page.getByTestId("destination-point-0")).not.toContainText(/Ubicación pendiente|NaN/);

    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("heading", { name: "Asigna los recursos" })).toBeVisible();
    await page.locator("select").nth(0).selectOption(vehicleId!);
    await page.locator("select").nth(1).selectOption(driverIdFixture!);
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("heading", { name: "Revisa y crea" })).toBeVisible();
    const routeSummary = page.getByText("Recorrido", { exact: true }).locator("..", { has: page.getByText(/puntos ·/) });
    await expect(routeSummary).toContainText("4 puntos");

    const createRoutePromise = page.waitForResponse((response) =>
      response.url().includes("/api/backend/Routes") && response.request().method() === "POST",
    );
    const createStartedAt = Date.now();
    await page.getByRole("button", { name: "Crear ruta", exact: true }).click();
    const createResponse = await createRoutePromise;
    expect(createResponse.status()).toBe(201);
    routeId = (await createResponse.json()).id as string;

    const persistedResponse = await page.request.get(`/api/backend/Routes/${routeId}`, { headers });
    expect(persistedResponse.status()).toBe(200);
    const persistedRoute = await persistedResponse.json();
    expect(persistedRoute.name).toBe(routeName);
    expect(persistedRoute.createdAtUtc).toBeTruthy();
    expect(Date.parse(persistedRoute.createdAtUtc)).toBeGreaterThanOrEqual(createStartedAt - 5_000);
    expect(Date.parse(persistedRoute.createdAtUtc)).toBeLessThanOrEqual(Date.now() + 5_000);
    const persistedPoints = persistedRoute.points as Array<{ name?: string; operation: number | string }>;
    expect(persistedPoints).toHaveLength(4);
    const operationNames: Record<number, string> = {
      0: "None",
      1: "Pickup",
      2: "Delivery",
      3: "PickupAndDelivery",
    };
    expect(persistedPoints.map((point) => ({
      name: point.name,
      operation: typeof point.operation === "number"
        ? operationNames[point.operation] ?? `Unknown(${point.operation})`
        : point.operation,
    }))).toEqual([
      { name: "Origen E2E desde mapa", operation: "None" },
      { name: "Entrega y recogida E2E", operation: "PickupAndDelivery" },
      { name: "Recogida E2E", operation: "Pickup" },
      { name: "Destino E2E desde mapa", operation: "None" },
    ]);

    const routeHeading = page.getByRole("heading", { name: routeName, exact: true });
    await expect(routeHeading).toBeVisible();
    const routeCard = routeHeading.locator("xpath=../../../..");
    await expect(routeCard).toContainText("Creada el");
    await expect(routeCard).not.toContainText("No registrada");
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await routeCard.getByRole("button", { name: `Eliminar ${routeName}` }).click();
    const confirmation = page.getByRole("alertdialog");
    await expect(confirmation.getByText("Eliminar ruta")).toBeVisible();
    const deleteRoutePromise = page.waitForResponse((response) =>
      response.url().includes(`/api/backend/Routes/${routeId}`) && response.request().method() === "DELETE",
    );
    await confirmation.getByRole("button", { name: "Sí, eliminar" }).click();
    expect([200, 204]).toContain((await deleteRoutePromise).status());
    await expect(routeCard).toHaveCount(0);
    routeId = undefined;

    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(widths.content).toBeLessThanOrEqual(widths.viewport);
  } finally {
    const cleanupIssues: string[] = [];
    if (routeId) {
      try {
        const currentRoute = await page.request.get(`/api/backend/Routes/${routeId}`, { headers });
        if (currentRoute.status() === 200) {
          const route = await currentRoute.json();
          const status = typeof route.status === "string" ? route.status.toLowerCase() : route.status;
          if (status === 1 || status === "inprogress" || status === "in_progress") {
            const cancelRoute = await page.request.put(`/api/backend/Routes/${routeId}/status`, {
              headers,
              data: { status: 3 },
            });
            if (cancelRoute.status() !== 204) cleanupIssues.push(`No se pudo cancelar la ruta temporal: HTTP ${cancelRoute.status()}`);
          }
          const cleanupRoute = await page.request.delete(`/api/backend/Routes/${routeId}`, { headers });
          if (![200, 204, 404].includes(cleanupRoute.status())) cleanupIssues.push(`No se pudo retirar la ruta temporal: HTTP ${cleanupRoute.status()}`);
        } else if (currentRoute.status() !== 404) {
          cleanupIssues.push(`No se pudo consultar la ruta temporal: HTTP ${currentRoute.status()}`);
        }
      } catch (error) {
        cleanupIssues.push(`Falló el cleanup de la ruta temporal: ${String(error)}`);
      }
    }
    if (vehicleId) {
      try {
        const currentDriverResponse = await page.request.get(`/api/backend/Drivers/${driverIdFixture}`, { headers });
        if (currentDriverResponse.status() !== 200) {
          cleanupIssues.push(`No se pudo leer la asignación del Driver QA: HTTP ${currentDriverResponse.status()}`);
        } else {
          const currentDriverVehicleId = (await currentDriverResponse.json()).vehicleId as string | null;
          if (currentDriverVehicleId === vehicleId) {
            const restoreAssignment = originalDriverVehicleId
              ? await page.request.put(`/api/backend/Drivers/${driverIdFixture}/assign-vehicle`, {
                  headers,
                  data: { vehicleId: originalDriverVehicleId },
                })
              : await page.request.put(`/api/backend/Drivers/${driverIdFixture}/unassign-vehicle`, { headers });
            if (restoreAssignment.status() !== 204) {
              cleanupIssues.push(`No se pudo restaurar la asignación previa del Driver: HTTP ${restoreAssignment.status()}`);
              const releaseTemporaryVehicle = await page.request.put(`/api/backend/Drivers/${driverIdFixture}/unassign-vehicle`, { headers });
              if (releaseTemporaryVehicle.status() !== 204) cleanupIssues.push(`No se pudo liberar el vehículo temporal del Driver: HTTP ${releaseTemporaryVehicle.status()}`);
            }
          }
        }
      } catch (error) {
        cleanupIssues.push(`Falló la restauración de la asignación del Driver: ${String(error)}`);
      }
      try {
        const cleanupVehicle = await page.request.delete(`/api/backend/Vehicles/${vehicleId}`, { headers });
        if (![200, 204, 404].includes(cleanupVehicle.status())) cleanupIssues.push(`No se pudo retirar el vehículo temporal: HTTP ${cleanupVehicle.status()}`);
      } catch (error) {
        cleanupIssues.push(`Falló el cleanup del vehículo temporal: ${String(error)}`);
      }
    }
    expect(cleanupIssues, "El cleanup debe retirar ruta/vehículo y restaurar el Driver sin ocultar fallos").toEqual([]);
  }
});

test("Admin crea una ruta con parada operativa en tablet sin desbordamiento", async ({ page, request }) => {
  test.skip(!email || !password || !driverIdFixture || !allowMutations, "Requiere cuenta QA Admin y FLETFLOW_E2E_ALLOW_MUTATIONS=true.");

  test.setTimeout(90_000);
  page.setDefaultTimeout(8_000);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email!);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(password!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const token = await page.evaluate(() => {
    const serialized = localStorage.getItem("auth_tokens");
    return serialized ? JSON.parse(serialized).accessToken as string : null;
  });
  expect(token).toBeTruthy();
  const headers = { Authorization: `Bearer ${token}` };
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9);
  const routeName = `E2E QA ruta tablet ${suffix}`;
  let vehicleId: string | undefined;
  let routeId: string | undefined;
  const driverBeforeResponse = await request.get(`/api/backend/Drivers/${driverIdFixture}`, { headers });
  expect(driverBeforeResponse.status()).toBe(200);
  const originalDriverVehicleId = (await driverBeforeResponse.json()).vehicleId as string | null;

  const expectNoHorizontalOverflow = async () => {
    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      main: document.querySelector("main")?.clientWidth ?? 0,
      mainContent: document.querySelector("main")?.scrollWidth ?? 0,
    }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport);
    expect(widths.mainContent).toBeLessThanOrEqual(widths.main);
  };

  try {
    const vehicleResponse = await request.post("/api/backend/Vehicles", {
      headers,
      data: { plate: `E2EQA${suffix}`, brand: "FleetFlow QA", model: "Tablet route", year: 2025 },
    });
    expect(vehicleResponse.status()).toBe(201);
    vehicleId = (await vehicleResponse.json()).id as string;

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.getByRole("button", { name: "Gestión de Rutas", exact: true }).click();
    await expectNoHorizontalOverflow();
    await page.getByRole("button", { name: "Nueva ruta", exact: true }).click();
    await page.getByPlaceholder("Ej. Entregas zona norte").fill(routeName);
    await page.getByPlaceholder("Productos, cantidad o instrucciones para el conductor").fill("Entrega y recogida QA en tablet");
    await expectNoHorizontalOverflow();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("heading", { name: "Construye el recorrido" })).toBeVisible();
    const map = page.locator(".leaflet-container");
    await page.getByRole("button", { name: "Seleccionando" }).waitFor();
    await clickMapAwayFromMarkers(map);
    await page.getByPlaceholder("¿Desde dónde sale?").fill("Origen tablet QA");
    await page.getByRole("button", { name: "Agregar parada" }).click();
    await expect(page.getByRole("button", { name: "Ver paradas y detalles" })).toBeVisible();
    await clickMapAwayFromMarkers(map);
    await page.getByPlaceholder("Parada 1").fill("Recogida y entrega tablet QA");
    await page.getByRole("combobox", { name: "Tipo de operación de la parada 1" }).selectOption("pickup_and_delivery");
    const destinationRow = page.getByPlaceholder("¿A dónde llega?").locator("xpath=../..");
    await destinationRow.getByRole("button", { name: "Ubicar" }).click();
    await expect(page.getByRole("button", { name: "Ver paradas y detalles" })).toBeVisible();
    await clickMapAwayFromMarkers(map);
    await page.getByPlaceholder("¿A dónde llega?").fill("Destino tablet QA");
    await expectNoHorizontalOverflow();

    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("heading", { name: "Asigna los recursos" })).toBeVisible();
    await page.locator("select").nth(0).selectOption(vehicleId);
    await page.locator("select").nth(1).selectOption(driverIdFixture!);
    await expectNoHorizontalOverflow();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("heading", { name: "Revisa y crea" })).toBeVisible();
    const routeSummary = page.getByText("Recorrido", { exact: true }).locator("..", { has: page.getByText(/3 puntos ·/) });
    await expect(routeSummary).toContainText("3 puntos");
    await expectNoHorizontalOverflow();

    const createResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/backend/Routes") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Crear ruta", exact: true }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.status()).toBe(201);
    routeId = (await createResponse.json()).id as string;

    const persistedResponse = await request.get(`/api/backend/Routes/${routeId}`, { headers });
    expect(persistedResponse.status()).toBe(200);
    const persistedRoute = await persistedResponse.json();
    expect(persistedRoute.name).toBe(routeName);
    const persistedPoints = persistedRoute.points as Array<{ name: string; operation: number | string }>;
    expect(persistedPoints.map((point) => point.name)).toEqual([
      "Origen tablet QA",
      "Recogida y entrega tablet QA",
      "Destino tablet QA",
    ]);
    expect([3, "PickupAndDelivery"]).toContain(persistedPoints[1].operation);
    await expectNoHorizontalOverflow();
  } finally {
    const cleanupIssues: string[] = [];
    if (routeId) {
      const cleanupRoute = await request.delete(`/api/backend/Routes/${routeId}`, { headers }).catch(() => null);
      if (!cleanupRoute || ![200, 204, 404].includes(cleanupRoute.status())) {
        cleanupIssues.push(`No se pudo retirar la ruta tablet temporal: HTTP ${cleanupRoute?.status() ?? "sin respuesta"}`);
      }
    }
    if (vehicleId) {
      const currentDriverResponse = await request.get(`/api/backend/Drivers/${driverIdFixture}`, { headers }).catch(() => null);
      if (currentDriverResponse?.status() === 200) {
        const currentVehicleId = (await currentDriverResponse.json()).vehicleId as string | null;
        if (currentVehicleId === vehicleId) {
          const restoreAssignment = originalDriverVehicleId
            ? await request.put(`/api/backend/Drivers/${driverIdFixture}/assign-vehicle`, { headers, data: { vehicleId: originalDriverVehicleId } })
            : await request.put(`/api/backend/Drivers/${driverIdFixture}/unassign-vehicle`, { headers });
          if (restoreAssignment.status() !== 204) cleanupIssues.push(`No se pudo restaurar el vehículo anterior del Driver: HTTP ${restoreAssignment.status()}`);
        }
      } else {
        cleanupIssues.push(`No se pudo verificar la asignación del Driver: HTTP ${currentDriverResponse?.status() ?? "sin respuesta"}`);
      }
      const cleanupVehicle = await request.delete(`/api/backend/Vehicles/${vehicleId}`, { headers }).catch(() => null);
      if (!cleanupVehicle || ![200, 204, 404].includes(cleanupVehicle.status())) {
        cleanupIssues.push(`No se pudo retirar el vehículo tablet temporal: HTTP ${cleanupVehicle?.status() ?? "sin respuesta"}`);
      }
    }
    expect(cleanupIssues, "El cleanup tablet debe retirar ruta/vehículo y restaurar el Driver").toEqual([]);
  }
});

test("Admin combina filtros de rutas y restablece la lista", async ({ page }) => {
  test.skip(!email || !password || !allowMutations, "Requiere cuenta QA Admin y FLETFLOW_E2E_ALLOW_MUTATIONS=true.");
  test.setTimeout(90_000);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email!);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(password!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const token = await page.evaluate(() => JSON.parse(localStorage.getItem("auth_tokens") ?? "{}").accessToken as string);
  expect(token).toBeTruthy();
  const headers = { Authorization: `Bearer ${token}` };
  const suffix = randomUUID().replaceAll("-", "").slice(0, 9);
  const fixture = {
    vehicles: [] as string[],
    drivers: [] as string[],
    routes: [] as Array<{ id: string; name: string }>,
  };
  const routeNames = [`E2E QA ruta filtros A ${suffix}`, `E2E QA ruta filtros B ${suffix}`];

  try {
    for (let index = 0; index < 2; index++) {
      const vehicle = await page.request.post("/api/backend/Vehicles", {
        headers,
        data: { plate: `E2EQA${suffix}F${index}`, brand: "FleetFlow QA", model: "Route filter", year: 2025 },
      });
      expect(vehicle.status()).toBe(201);
      fixture.vehicles.push((await vehicle.json()).id as string);

      const driver = await page.request.post("/api/backend/Drivers", {
        headers,
        data: {
          firstName: `E2E Filter ${suffix}`,
          lastName: `Driver ${index}`,
          documentNumber: `E2EQA${suffix}F${index}`,
          phoneNumber: "0990000099",
          userId: null,
        },
      });
      expect(driver.status()).toBe(201);
      fixture.drivers.push((await driver.json()).id as string);

      const route = await page.request.post("/api/backend/Routes", {
        headers,
        data: {
          name: routeNames[index],
          cargoDescription: "Fixture E2E filtros combinados",
          vehicleId: fixture.vehicles[index],
          driverId: fixture.drivers[index],
          points: [
            { lat: -0.18, lng: -78.46, name: `Origen filtro ${index}`, operation: 0 },
            { lat: -0.2, lng: -78.48, name: `Destino filtro ${index}`, operation: 0 },
          ],
        },
      });
      expect(route.status()).toBe(201);
      fixture.routes.push({ id: (await route.json()).id as string, name: routeNames[index] });
    }

    const cancelSecondRoute = await page.request.put(`/api/backend/Routes/${fixture.routes[1].id}/status`, {
      headers,
      data: { status: 3 },
    });
    expect(cancelSecondRoute.status()).toBe(204);

    await page.reload();
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.getByRole("button", { name: "Gestión de Rutas", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Rutas", exact: true })).toBeVisible();
    await page.getByLabel("Estado").selectOption("pendiente");
    await page.getByLabel("Vehículo").selectOption(fixture.vehicles[0]);
    await page.getByLabel("Conductor").selectOption(fixture.drivers[0]);

    const firstRouteHeading = page.getByRole("heading", { name: routeNames[0], exact: true });
    const secondRouteHeading = page.getByRole("heading", { name: routeNames[1], exact: true });
    await expect(firstRouteHeading).toBeVisible();
    await expect(secondRouteHeading).toHaveCount(0);

    // Isolate the status filter: same resource filters must expose the cancelled
    // route only after changing status, proving all selected criteria are applied.
    await page.getByLabel("Vehículo").selectOption(fixture.vehicles[1]);
    await page.getByLabel("Conductor").selectOption(fixture.drivers[1]);
    await expect(secondRouteHeading).toHaveCount(0);
    await page.getByLabel("Estado").selectOption("cancelada");
    await expect(secondRouteHeading).toBeVisible();

    for (const width of [320, 768]) {
      await page.setViewportSize({ width, height: width === 320 ? 844 : 1024 });
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        main: document.querySelector("main")?.clientWidth ?? 0,
        mainContent: document.querySelector("main")?.scrollWidth ?? 0,
      }));
      expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
      expect(dimensions.mainContent).toBeLessThanOrEqual(dimensions.main);
      await expect(secondRouteHeading).toBeVisible();
    }

    await page.getByRole("button", { name: "Limpiar filtros" }).click();
    await expect(firstRouteHeading).toBeVisible();
    await expect(secondRouteHeading).toBeVisible();

    for (const width of [320, 768]) {
      await page.setViewportSize({ width, height: width === 320 ? 844 : 1024 });
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
      await expect(firstRouteHeading).toBeVisible();
      await expect(secondRouteHeading).toBeVisible();
    }
  } finally {
    for (const route of fixture.routes) {
      const response = await page.request.delete(`/api/backend/Routes/${route.id}`, { headers }).catch(() => null);
      if (response) expect([200, 204, 404]).toContain(response.status());
    }
    for (const driverId of fixture.drivers) {
      const response = await page.request.put(`/api/backend/Drivers/${driverId}/status`, {
        headers,
        data: { isActive: false },
      }).catch(() => null);
      if (response) expect([200, 204, 404]).toContain(response.status());
    }
    for (const vehicleId of fixture.vehicles) {
      const response = await page.request.delete(`/api/backend/Vehicles/${vehicleId}`, { headers }).catch(() => null);
      if (response) expect([200, 204, 404]).toContain(response.status());
    }
  }
});

test("User no ve operaciones y la API deniega recursos de flota", async ({ page }) => {
  test.skip(!userEmail || !userPassword, "El runner local crea el usuario QA para verificar permisos.");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(userEmail!);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(userPassword!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(/Tu cuenta no tiene permisos operativos asignados/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Gestión de Equipo", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Gestión de Rutas", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Gestión de Vehículos", exact: true })).toHaveCount(0);

  const token = await page.evaluate(() => {
    const serialized = localStorage.getItem("auth_tokens");
    return serialized ? JSON.parse(serialized).accessToken as string : null;
  });
  expect(token).toBeTruthy();
  const headers = { Authorization: `Bearer ${token}` };
  const [vehiclesResponse, routesResponse] = await Promise.all([
    page.request.get("/api/backend/Vehicles", { headers }),
    page.request.get("/api/backend/Routes", { headers }),
  ]);
  expect(vehiclesResponse.status()).toBe(403);
  expect(routesResponse.status()).toBe(403);

  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
});

test("API deniega mutaciones y Manager gestiona flota desde la interfaz", async ({ page, browser }) => {
  test.skip(
    !email || !password || !userEmail || !userPassword || !driverEmail || !driverPassword || !driverIdFixture || !allowMutations,
    "Requiere fixtures QA de Admin, User y Driver y FLETFLOW_E2E_ALLOW_MUTATIONS=true.",
  );
  test.setTimeout(120_000);
  page.setDefaultTimeout(8_000);

  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9);
  type AuthHeaders = { Authorization: string };
  type MutationCheck = [string, () => Promise<{ status(): number }>];

  const login = async (accountEmail: string, accountPassword: string) => {
    const response = await page.request.post("/api/backend/Auth/login", {
      data: { email: accountEmail, password: accountPassword },
    });
    expect(response.status(), `login QA para ${accountEmail}`).toBe(200);
    const body = await response.json();
    const token = body.token ?? body.accessToken;
    expect(token, `token QA para ${accountEmail}`).toBeTruthy();
    return { Authorization: `Bearer ${token}` };
  };

  const adminHeaders = await login(email!, password!);
  const vehicleId = randomUUID();
  const driverId = randomUUID();
  const routeId = randomUUID();
  const userId = randomUUID();

  for (const [path, id] of [
    ["Vehicles", vehicleId],
    ["Drivers", driverId],
    ["Routes", routeId],
  ]) {
    const response = await page.request.get(`/api/backend/${path}/${id}`, { headers: adminHeaders });
    expect(response.status(), `el GUID QA ${path}/${id} debe ser inexistente`).toBe(404);
  }
  const team = await page.request.get("/api/backend/Users/my-team", { headers: adminHeaders });
  expect(team.status()).toBe(200);
  expect((await team.json()).some((member: { id: string }) => member.id === userId)).toBe(false);

  // Si una autorización falla, los POST sólo escriben fixtures con prefijos que
  // scripts/cleanup-e2e.sql elimina al cerrar el runner de base desechable.
  const qaVehicle = {
    plate: `E2EQA${suffix}`,
    brand: "FleetFlow QA",
    model: "Role matrix",
    year: 2025,
  };
  const qaDriver = {
    firstName: "E2E QA",
    lastName: `Denied ${suffix}`,
    documentNumber: `E2EQA${suffix}`,
    phoneNumber: "0990000000",
  };
  const qaRoute = {
    vehicleId: driverIdFixture,
    driverId: driverIdFixture,
    name: `E2E QA ruta autorización ${suffix}`,
    cargoDescription: "Fixture de matriz de permisos",
    points: [
      { lat: -0.18, lng: -78.46, name: "Origen QA", operation: 0 },
      { lat: -0.19, lng: -78.47, name: "Destino QA", operation: 0 },
    ],
  };
  const qaUser = {
    username: `E2E QA denied ${suffix}`,
    email: `fletflow.e2e.user.denied.${suffix}@example.test`,
    password: "QA-only-Password-934!",
    roleName: "User",
  };

  const createdVehicle = await page.request.post("/api/backend/Vehicles", {
    headers: adminHeaders,
    data: qaVehicle,
  });
  expect(createdVehicle.status()).toBe(201);
  const qaVehicleId = (await createdVehicle.json()).id as string;
  qaRoute.vehicleId = qaVehicleId;

  const expectDenied = async (role: string, operations: MutationCheck[]) => {
    for (const [operation, send] of operations) {
      const response = await send();
      expect(response.status(), `${role} debe recibir 403 en ${operation}`).toBe(403);
    }
  };

  const vehicleMutations = (headers: AuthHeaders): MutationCheck[] => [
    ["POST /Vehicles", () => page.request.post("/api/backend/Vehicles", { headers, data: { ...qaVehicle, plate: `E2EQA${suffix.slice(1)}` } })],
    [`PUT /Vehicles/${vehicleId}`, () => page.request.put(`/api/backend/Vehicles/${vehicleId}`, { headers, data: qaVehicle })],
    [`PUT /Vehicles/${vehicleId}/status`, () => page.request.put(`/api/backend/Vehicles/${vehicleId}/status`, { headers, data: { status: 0 } })],
    [`DELETE /Vehicles/${vehicleId}`, () => page.request.delete(`/api/backend/Vehicles/${vehicleId}`, { headers })],
    [`POST /Vehicles/${vehicleId}/reactivate`, () => page.request.post(`/api/backend/Vehicles/${vehicleId}/reactivate`, { headers })],
  ];
  const driverMutations = (headers: AuthHeaders): MutationCheck[] => [
    ["POST /Drivers", () => page.request.post("/api/backend/Drivers", { headers, data: { ...qaDriver, documentNumber: `E2EQA${suffix.slice(1)}` } })],
    [`PUT /Drivers/${driverId}`, () => page.request.put(`/api/backend/Drivers/${driverId}`, { headers, data: qaDriver })],
    [`PUT /Drivers/${driverId}/status`, () => page.request.put(`/api/backend/Drivers/${driverId}/status`, { headers, data: { isActive: false } })],
    [`PUT /Drivers/${driverId}/assign-vehicle`, () => page.request.put(`/api/backend/Drivers/${driverId}/assign-vehicle`, { headers, data: { vehicleId: qaVehicleId } })],
    [`PUT /Drivers/${driverId}/unassign-vehicle`, () => page.request.put(`/api/backend/Drivers/${driverId}/unassign-vehicle`, { headers })],
  ];
  const userAndRoleMutations = (currentHeaders: AuthHeaders): MutationCheck[] => [
    ["POST /Users", () => page.request.post("/api/backend/Users", { headers: currentHeaders, data: qaUser })],
    [`PUT /Users/${userId}/status`, () => page.request.put(`/api/backend/Users/${userId}/status?isActive=false`, { headers: currentHeaders })],
    [`PUT /Users/${userId}/role`, () => page.request.put(`/api/backend/Users/${userId}/role`, { headers: currentHeaders, data: { roleName: "Manager" } })],
    [`PUT /Users/${userId}/profile`, () => page.request.put(`/api/backend/Users/${userId}/profile`, { headers: currentHeaders, data: { username: "blocked", firstName: "Blocked", lastName: "Member" } })],
    [`POST /Users/${userId}/roles/Manager`, () => page.request.post(`/api/backend/Users/${userId}/roles/Manager`, { headers: currentHeaders })],
    [`DELETE /Users/${userId}/roles/Manager`, () => page.request.delete(`/api/backend/Users/${userId}/roles/Manager`, { headers: currentHeaders })],
    // El rol existente no puede crear datos aunque una autorización se configurara mal.
    ["POST /Roles", () => page.request.post("/api/backend/Roles", { headers: currentHeaders, data: { name: "User" } })],
    [`DELETE /Roles/E2E-QA-MISSING-${suffix}`, () => page.request.delete(`/api/backend/Roles/E2E-QA-MISSING-${suffix}`, { headers: currentHeaders })],
  ];
  const routeManagementMutations = (headers: AuthHeaders): MutationCheck[] => [
    ["POST /Routes", () => page.request.post("/api/backend/Routes", { headers, data: qaRoute })],
    [`PUT /Routes/${routeId}`, () => page.request.put(`/api/backend/Routes/${routeId}`, { headers, data: qaRoute })],
    [`DELETE /Routes/${routeId}`, () => page.request.delete(`/api/backend/Routes/${routeId}`, { headers })],
  ];

  const userHeaders = await login(userEmail!, userPassword!);
  await expectDenied("User", [
    ...vehicleMutations(userHeaders),
    ...driverMutations(userHeaders),
    ...routeManagementMutations(userHeaders),
    [`PUT /Routes/${routeId}/status`, () => page.request.put(`/api/backend/Routes/${routeId}/status`, { headers: userHeaders, data: { status: 3 } })],
    [`PUT /Routes/${routeId}/points/0/status`, () => page.request.put(`/api/backend/Routes/${routeId}/points/0/status`, { headers: userHeaders, data: { status: 2 } })],
    [`POST /Routes/${routeId}/points/0/evidence`, () => page.request.post(`/api/backend/Routes/${routeId}/points/0/evidence`, { headers: userHeaders, data: { type: "note", content: "QA denied", description: "QA" } })],
    [`POST /Routes/${routeId}/positions`, () => page.request.post(`/api/backend/Routes/${routeId}/positions`, { headers: userHeaders, data: { latitude: -0.18, longitude: -78.46 } })],
    ...userAndRoleMutations(userHeaders),
  ]);

  const driverHeaders = await login(driverEmail!, driverPassword!);
  await expectDenied("Driver", [
    ...vehicleMutations(driverHeaders),
    ...driverMutations(driverHeaders),
    ...routeManagementMutations(driverHeaders),
    ...userAndRoleMutations(driverHeaders),
  ]);

  const adminTeam = await page.request.get("/api/backend/Users/my-team", { headers: adminHeaders });
  expect(adminTeam.status()).toBe(200);
  const fixtureDriver = (await adminTeam.json()).find((member: { driverId?: string }) => member.driverId === driverIdFixture);
  expect(fixtureDriver?.id).toBeTruthy();
  const setFixtureRole = async (roleName: "Driver" | "Logistics" | "Manager") => {
    const response = await page.request.put(`/api/backend/Users/${fixtureDriver.id}/role`, {
      headers: adminHeaders,
      data: { roleName },
    });
    expect(response.status(), `cambio del fixture a ${roleName}`).toBe(200);
  };

  try {
    await setFixtureRole("Logistics");
    const logisticsHeaders = await login(driverEmail!, driverPassword!);
    await expectDenied("Logistics", [
      ...vehicleMutations(logisticsHeaders),
      ...driverMutations(logisticsHeaders),
      ...userAndRoleMutations(logisticsHeaders),
    ]);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill(email!);
    await page.getByRole("textbox", { name: "Contraseña" }).fill(password!);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.getByRole("button", { name: "Gestión de Equipo", exact: true }).click();
    const roleCard = page.getByTestId(`team-user-${fixtureDriver.id}`);
    const assignManagerRole = page.waitForResponse((response) =>
      new URL(response.url()).pathname.endsWith(`/api/backend/Users/${fixtureDriver.id}/role`) && response.request().method() === "PUT",
    );
    await roleCard.getByRole("button", { name: "Gestor de flota", exact: true }).click();
    expect((await assignManagerRole).status()).toBe(200);
    const persistedManagerTeam = await page.request.get("/api/backend/Users/my-team", { headers: adminHeaders });
    expect(persistedManagerTeam.status()).toBe(200);
    expect((await persistedManagerTeam.json()).find((member: { id: string }) => member.id === fixtureDriver.id).roles).toContain("Manager");

    const managerHeaders = await login(driverEmail!, driverPassword!);
    await expectDenied("Manager", userAndRoleMutations(managerHeaders));
    const managerTeamResponse = await page.request.get("/api/backend/Users/my-team", { headers: managerHeaders });
    expect(managerTeamResponse.status()).toBe(403);
    expect(await managerTeamResponse.text()).not.toContain(userEmail!);

    const managerVehicles = await page.request.get("/api/backend/Vehicles", { headers: managerHeaders });
    const managerRoutes = await page.request.get("/api/backend/Routes", { headers: managerHeaders });
    expect(managerVehicles.status()).toBe(200);
    expect(managerRoutes.status()).toBe(200);

    let managerVehicleId: string | undefined;
    let managerUiDriverId: string | undefined;
    try {
      const managerVehicle = await page.request.post("/api/backend/Vehicles", {
        headers: managerHeaders,
        data: { ...qaVehicle, plate: `E2EQAM${suffix}`, brand: "Manager QA" },
      });
      expect(managerVehicle.status()).toBe(201);
      managerVehicleId = (await managerVehicle.json()).id as string;

      const updateManagerVehicle = await page.request.put(`/api/backend/Vehicles/${managerVehicleId}`, {
        headers: managerHeaders,
        data: { ...qaVehicle, plate: `E2EQAM${suffix}`, brand: "Manager editado" },
      });
      expect(updateManagerVehicle.status()).toBe(200);
      const changeManagerVehicleStatus = await page.request.put(`/api/backend/Vehicles/${managerVehicleId}/status`, {
        headers: managerHeaders,
        data: { status: 2 },
      });
      expect(changeManagerVehicleStatus.status()).toBe(204);

      const persistedManagerVehicle = await page.request.get(`/api/backend/Vehicles/${managerVehicleId}`, { headers: managerHeaders });
      expect(persistedManagerVehicle.status()).toBe(200);
      expect(await persistedManagerVehicle.json()).toMatchObject({
        plate: `E2EQAM${suffix}`,
        brand: "Manager editado",
        status: 2,
      });

      const resetManagerVehicleStatus = await page.request.put(`/api/backend/Vehicles/${managerVehicleId}/status`, {
        headers: managerHeaders,
        data: { status: 0 },
      });
      expect(resetManagerVehicleStatus.status()).toBe(204);
      const deleteManagerVehicle = await page.request.delete(`/api/backend/Vehicles/${managerVehicleId}`, { headers: managerHeaders });
      expect(deleteManagerVehicle.status()).toBe(204);
      managerVehicleId = undefined;
    } finally {
      if (managerVehicleId) {
        const cleanupManagerVehicle = await page.request.delete(`/api/backend/Vehicles/${managerVehicleId}`, { headers: managerHeaders });
        expect([200, 204, 404]).toContain(cleanupManagerVehicle.status());
      }
    }

    const managerContext = await browser.newContext();
    const managerPage = await managerContext.newPage();
    managerVehicleId = undefined;
    const uiPlate = `E2EQAM${suffix}UI`;
    try {
      let managerTeamRequests = 0;
      managerPage.on("request", (request) => {
        if (new URL(request.url()).pathname.endsWith("/api/backend/Users/my-team")) {
          managerTeamRequests += 1;
        }
      });
      await managerPage.setViewportSize({ width: 390, height: 844 });
      await managerPage.goto("/login");
      await managerPage.getByLabel("Correo electrónico").fill(driverEmail!);
      await managerPage.getByRole("textbox", { name: "Contraseña" }).fill(driverPassword!);
      await managerPage.getByRole("button", { name: "Iniciar sesión" }).click();
      await expect(managerPage).toHaveURL(/\/dashboard$/);
      await managerPage.getByRole("button", { name: "Abrir menú" }).click();
      await expect(managerPage.getByRole("button", { name: "Gestión de Rutas", exact: true })).toBeVisible();
      await expect(managerPage.getByRole("button", { name: "Gestión de Vehículos", exact: true })).toBeVisible();
      await expect(managerPage.getByRole("button", { name: "Gestión de Conductores", exact: true })).toBeVisible();
      await expect(managerPage.getByRole("button", { name: "Gestión de Equipo", exact: true })).toHaveCount(0);
      await managerPage.getByRole("button", { name: "Gestión de Vehículos", exact: true }).click();
      await expect(managerPage.getByRole("heading", { name: "Gestión de Vehículos" })).toBeVisible();

      const expectManagerNoOverflow = async () => {
        const dimensions = await managerPage.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          content: document.documentElement.scrollWidth,
          mainClient: document.querySelector("main")?.clientWidth ?? 0,
          mainScroll: document.querySelector("main")?.scrollWidth ?? 0,
        }));
        expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
        expect(dimensions.mainScroll).toBeLessThanOrEqual(dimensions.mainClient);
      };
      await managerPage.setViewportSize({ width: 320, height: 844 });
      await expectManagerNoOverflow();
      await managerPage.getByRole("button", { name: "Agregar Vehículo" }).click();
      let vehicleDialog = managerPage.getByRole("dialog");
      await vehicleDialog.getByPlaceholder("ABC-123").fill(uiPlate);
      await vehicleDialog.getByPlaceholder("Toyota").fill("Manager UI");
      await vehicleDialog.getByPlaceholder("Hilux").fill("Responsive vehicle");
      await vehicleDialog.locator('input[type="number"]').fill("2025");
      const createManagerVehicle = managerPage.waitForResponse((response) =>
        new URL(response.url()).pathname.endsWith("/api/backend/Vehicles") && response.request().method() === "POST",
      );
      await vehicleDialog.getByRole("button", { name: "Agregar", exact: true }).click();
      const createManagerResponse = await createManagerVehicle;
      expect(createManagerResponse.status()).toBe(201);
      managerVehicleId = (await createManagerResponse.json()).id as string;
      const managerCard = managerPage.locator(".grid > div").filter({ hasText: uiPlate });
      await expect(managerCard).toContainText("Manager UI Responsive vehicle");

      await managerCard.getByRole("button", { name: "Editar" }).click();
      vehicleDialog = managerPage.getByRole("dialog");
      await vehicleDialog.getByPlaceholder("Toyota").fill("Manager editado");
      const editManagerVehicle = managerPage.waitForResponse((response) =>
        new URL(response.url()).pathname.endsWith(`/api/backend/Vehicles/${managerVehicleId}`) && response.request().method() === "PUT",
      );
      await vehicleDialog.getByRole("button", { name: "Actualizar", exact: true }).click();
      expect((await editManagerVehicle).status()).toBe(200);
      await expect(managerCard).toContainText("Manager editado Responsive vehicle");

      await managerPage.setViewportSize({ width: 768, height: 1024 });
      await expectManagerNoOverflow();
      await managerCard.getByRole("button", { name: "Editar" }).click();
      vehicleDialog = managerPage.getByRole("dialog");
      await vehicleDialog.locator("select").selectOption("mantenimiento");
      const setManagerMaintenance = managerPage.waitForResponse((response) =>
        new URL(response.url()).pathname.endsWith(`/api/backend/Vehicles/${managerVehicleId}/status`) && response.request().method() === "PUT",
      );
      await vehicleDialog.getByRole("button", { name: "Actualizar", exact: true }).click();
      expect((await setManagerMaintenance).status()).toBe(204);
      const managerAuthHeaders = { Authorization: `Bearer ${await managerPage.evaluate(() => JSON.parse(localStorage.getItem("auth_tokens") ?? "{}").accessToken)}` };
      const persistedManagerUiVehicle = await managerPage.request.get(`/api/backend/Vehicles/${managerVehicleId}`, { headers: managerAuthHeaders });
      expect(persistedManagerUiVehicle.status()).toBe(200);
      expect(await persistedManagerUiVehicle.json()).toMatchObject({ plate: uiPlate, brand: "Manager editado", status: 2 });
      await expect(managerCard).toContainText("Mantenimiento");

      await managerCard.getByRole("button", { name: "Editar" }).click();
      vehicleDialog = managerPage.getByRole("dialog");
      await vehicleDialog.locator("select").selectOption("disponible");
      const restoreManagerVehicle = managerPage.waitForResponse((response) =>
        new URL(response.url()).pathname.endsWith(`/api/backend/Vehicles/${managerVehicleId}/status`) && response.request().method() === "PUT",
      );
      await vehicleDialog.getByRole("button", { name: "Actualizar", exact: true }).click();
      expect((await restoreManagerVehicle).status()).toBe(204);
      await expect(managerCard).toContainText("Disponible");

      await managerPage.getByRole("button", { name: "Abrir menú" }).click();
      await managerPage.getByRole("button", { name: "Gestión de Conductores", exact: true }).click();
      await expect(managerPage.getByRole("heading", { name: "Gestión de Conductores" })).toBeVisible();
      await managerPage.setViewportSize({ width: 320, height: 844 });
      await expectManagerNoOverflow();
      await managerPage.getByLabel("Nombres del conductor").fill(`E2E QA Manager ${suffix}`);
      await managerPage.getByLabel("Apellidos del conductor").fill("Chofer");
      const managerDriverDocument = `E2EQA${suffix}M`;
      await managerPage.getByLabel("Documento del conductor").fill(managerDriverDocument);
      await managerPage.getByLabel("Teléfono del conductor").fill("0990000077");
      const createManagerDriver = managerPage.waitForResponse((response) =>
        new URL(response.url()).pathname.endsWith("/api/backend/Drivers") && response.request().method() === "POST",
      );
      await managerPage.getByRole("button", { name: "Crear conductor" }).click();
      const createManagerDriverResponse = await createManagerDriver;
      expect(createManagerDriverResponse.status()).toBe(201);
      managerUiDriverId = (await createManagerDriverResponse.json()).id as string;
      let managerDriverCard = managerPage.getByTestId(`managed-driver-${managerUiDriverId}`);
      await expect(managerDriverCard).toContainText(`E2E QA Manager ${suffix} Chofer`);
      await expectManagerNoOverflow();
      const driverCardDimensions = await managerDriverCard.evaluate((card) => ({ client: card.clientWidth, scroll: card.scrollWidth }));
      expect(driverCardDimensions.scroll).toBeLessThanOrEqual(driverCardDimensions.client);
      const managerDriverAuthHeaders = { Authorization: `Bearer ${await managerPage.evaluate(() => JSON.parse(localStorage.getItem("auth_tokens") ?? "{}").accessToken)}` };
      const managerDriverRead = await managerPage.request.get(`/api/backend/Drivers/${managerUiDriverId}`, { headers: managerDriverAuthHeaders });
      expect(managerDriverRead.status()).toBe(200);
      expect(await managerDriverRead.json()).toMatchObject({ documentNumber: managerDriverDocument, userId: null, vehicleId: null });

      await managerDriverCard.getByRole("button", { name: "Editar" }).click();
      await managerPage.getByLabel("Nombres del conductor").fill(`E2E QA Manager editado ${suffix}`);
      const saveManagerDriver = managerPage.waitForResponse((response) =>
        new URL(response.url()).pathname.endsWith(`/api/backend/Drivers/${managerUiDriverId}`) && response.request().method() === "PUT",
      );
      await managerPage.getByRole("button", { name: "Guardar cambios" }).click();
      expect((await saveManagerDriver).status()).toBe(200);
      managerDriverCard = managerPage.getByTestId(`managed-driver-${managerUiDriverId}`);
      await expect(managerDriverCard).toContainText(`E2E QA Manager editado ${suffix}`);

      await managerDriverCard.getByLabel(`Vehículo para E2E QA Manager editado ${suffix}`).selectOption(managerVehicleId!);
      const assignVehiclePath = `**/api/backend/Drivers/${managerUiDriverId}/assign-vehicle`;
      await managerPage.route(assignVehiclePath, async (route) => {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ message: "El vehículo ya está asignado a otro conductor." }),
        });
      });
      await managerDriverCard.getByRole("button", { name: "Asignar" }).click();
      await expect(managerPage.getByText("El vehículo ya está asignado a otro conductor.")).toBeVisible();
      await expect(managerPage.getByText("Vehículo asignado.", { exact: true })).toHaveCount(0);
      await managerPage.unroute(assignVehiclePath);

      const assignManagerDriverVehicle = managerPage.waitForResponse((response) =>
        new URL(response.url()).pathname.endsWith(`/api/backend/Drivers/${managerUiDriverId}/assign-vehicle`) && response.request().method() === "PUT",
      );
      await managerDriverCard.getByRole("button", { name: "Asignar" }).click();
      expect((await assignManagerDriverVehicle).status()).toBe(204);
      const assignedManagerDriver = await managerPage.request.get(`/api/backend/Drivers/${managerUiDriverId}`, { headers: managerDriverAuthHeaders });
      expect((await assignedManagerDriver.json()).vehicleId).toBe(managerVehicleId);

      const secondManagerDriverDocument = `E2EQA${suffix}N`;
      await managerPage.getByLabel("Nombres del conductor").fill(`E2E QA Manager segundo ${suffix}`);
      await managerPage.getByLabel("Apellidos del conductor").fill("Chofer");
      await managerPage.getByLabel("Documento del conductor").fill(secondManagerDriverDocument);
      await managerPage.getByLabel("Teléfono del conductor").fill("0990000078");
      const createSecondManagerDriver = managerPage.waitForResponse((response) =>
        new URL(response.url()).pathname.endsWith("/api/backend/Drivers") && response.request().method() === "POST",
      );
      await managerPage.getByRole("button", { name: "Crear conductor" }).click();
      const secondManagerDriverResponse = await createSecondManagerDriver;
      expect(secondManagerDriverResponse.status()).toBe(201);
      const secondManagerDriver = await secondManagerDriverResponse.json();
      const secondManagerDriverCard = managerPage.getByTestId(`managed-driver-${secondManagerDriver.id}`);
      await expect(secondManagerDriverCard.getByRole("combobox").locator(`option[value="${managerVehicleId}"]`)).toHaveCount(0);

      const unassignManagerDriverVehicle = managerPage.waitForResponse((response) =>
        new URL(response.url()).pathname.endsWith(`/api/backend/Drivers/${managerUiDriverId}/unassign-vehicle`) && response.request().method() === "PUT",
      );
      await managerDriverCard.getByRole("button", { name: "Quitar" }).click();
      expect((await unassignManagerDriverVehicle).status()).toBe(204);
      const unassignedManagerDriver = await managerPage.request.get(`/api/backend/Drivers/${managerUiDriverId}`, { headers: managerDriverAuthHeaders });
      expect((await unassignedManagerDriver.json()).vehicleId).toBeNull();
      await expect(secondManagerDriverCard.getByRole("combobox").locator(`option[value="${managerVehicleId}"]`)).toHaveCount(1);

      const deactivateManagerDriver = managerPage.waitForResponse((response) =>
        new URL(response.url()).pathname.endsWith(`/api/backend/Drivers/${managerUiDriverId}/status`) && response.request().method() === "PUT",
      );
      await managerDriverCard.getByRole("button", { name: "Dar de baja" }).click();
      expect((await deactivateManagerDriver).status()).toBe(204);
      await expect(managerDriverCard).toHaveCount(0);
      await managerPage.getByRole("button", { name: "Mostrar bajas" }).click();
      managerDriverCard = managerPage.getByTestId(`managed-driver-${managerUiDriverId}`);
      await expect(managerDriverCard).toContainText("Inactivo");
      const reactivateManagerDriver = managerPage.waitForResponse((response) =>
        new URL(response.url()).pathname.endsWith(`/api/backend/Drivers/${managerUiDriverId}/status`) && response.request().method() === "PUT",
      );
      await managerDriverCard.getByRole("button", { name: "Reactivar" }).click();
      expect((await reactivateManagerDriver).status()).toBe(204);
      await expect(managerDriverCard.getByRole("button", { name: "Dar de baja" })).toBeVisible();
      expect(managerTeamRequests).toBe(0);

      await managerPage.setViewportSize({ width: 768, height: 1024 });
      await expectManagerNoOverflow();
      await expect(managerDriverCard).toBeVisible();
      await expect(managerDriverCard.getByRole("button", { name: "Editar" })).toBeVisible();
      await expect(managerDriverCard.getByRole("button", { name: "Dar de baja" })).toBeVisible();
      await expect(managerPage.getByLabel("Documento del conductor")).toBeVisible();
      await expect(managerPage.getByLabel("Teléfono del conductor")).toBeVisible();
      const tabletDriverCardDimensions = await managerDriverCard.evaluate((card) => ({ client: card.clientWidth, scroll: card.scrollWidth }));
      expect(tabletDriverCardDimensions.scroll).toBeLessThanOrEqual(tabletDriverCardDimensions.client);
      await managerDriverCard.getByRole("button", { name: "Editar" }).click();
      await managerPage.getByLabel("Nombres del conductor").fill(`E2E QA Manager tablet ${suffix}`);
      const saveTabletManagerDriver = managerPage.waitForResponse((response) =>
        new URL(response.url()).pathname.endsWith(`/api/backend/Drivers/${managerUiDriverId}`) && response.request().method() === "PUT",
      );
      await managerPage.getByRole("button", { name: "Guardar cambios" }).click();
      expect((await saveTabletManagerDriver).status()).toBe(200);
      managerDriverCard = managerPage.getByTestId(`managed-driver-${managerUiDriverId}`);
      await expect(managerDriverCard).toContainText(`E2E QA Manager tablet ${suffix}`);
      const persistedTabletManagerDriver = await managerPage.request.get(`/api/backend/Drivers/${managerUiDriverId}`, { headers: managerDriverAuthHeaders });
      expect(await persistedTabletManagerDriver.json()).toMatchObject({ firstName: `E2E QA Manager tablet ${suffix}` });
      await managerDriverCard.getByRole("combobox").selectOption(managerVehicleId!);
      const assignTabletManagerDriver = managerPage.waitForResponse((response) =>
        new URL(response.url()).pathname.endsWith(`/api/backend/Drivers/${managerUiDriverId}/assign-vehicle`) && response.request().method() === "PUT",
      );
      await managerDriverCard.getByRole("button", { name: "Asignar" }).click();
      expect((await assignTabletManagerDriver).status()).toBe(204);
      const tabletAssignedDriver = await managerPage.request.get(`/api/backend/Drivers/${managerUiDriverId}`, { headers: managerDriverAuthHeaders });
      expect((await tabletAssignedDriver.json()).vehicleId).toBe(managerVehicleId);

      const unassignTabletManagerDriver = managerPage.waitForResponse((response) =>
        new URL(response.url()).pathname.endsWith(`/api/backend/Drivers/${managerUiDriverId}/unassign-vehicle`) && response.request().method() === "PUT",
      );
      await managerDriverCard.getByRole("button", { name: "Quitar" }).click();
      expect((await unassignTabletManagerDriver).status()).toBe(204);
      const tabletUnassignedDriver = await managerPage.request.get(`/api/backend/Drivers/${managerUiDriverId}`, { headers: managerDriverAuthHeaders });
      expect((await tabletUnassignedDriver.json()).vehicleId).toBeNull();

      const deactivateTabletManagerDriver = managerPage.waitForResponse((response) =>
        new URL(response.url()).pathname.endsWith(`/api/backend/Drivers/${managerUiDriverId}/status`) && response.request().method() === "PUT",
      );
      await managerDriverCard.getByRole("button", { name: "Dar de baja" }).click();
      expect((await deactivateTabletManagerDriver).status()).toBe(204);
      await expect(managerDriverCard).toContainText("Inactivo");
      const reactivateTabletManagerDriver = managerPage.waitForResponse((response) =>
        new URL(response.url()).pathname.endsWith(`/api/backend/Drivers/${managerUiDriverId}/status`) && response.request().method() === "PUT",
      );
      await managerDriverCard.getByRole("button", { name: "Reactivar" }).click();
      expect((await reactivateTabletManagerDriver).status()).toBe(204);
      const tabletReactivatedDriver = await managerPage.request.get(`/api/backend/Drivers/${managerUiDriverId}`, { headers: managerDriverAuthHeaders });
      expect((await tabletReactivatedDriver.json()).isActive).toBe(true);
      await expectManagerNoOverflow();
      await managerPage.getByRole("button", { name: "Abrir menú" }).click();
      await managerPage.getByRole("button", { name: "Gestión de Vehículos", exact: true }).click();
      await expect(managerPage.getByRole("heading", { name: "Gestión de Vehículos" })).toBeVisible();
      const managerDeleteDialog = managerPage.getByRole("alertdialog");
      const deleteManagerUiVehicle = managerPage.waitForResponse((response) =>
        new URL(response.url()).pathname.endsWith(`/api/backend/Vehicles/${managerVehicleId}`) && response.request().method() === "DELETE",
      );
      await managerCard.getByRole("button").nth(1).click();
      await managerDeleteDialog.getByRole("button", { name: "Sí, eliminar" }).click();
      expect((await deleteManagerUiVehicle).status()).toBe(204);
      managerVehicleId = undefined;
      await expect(managerCard).toHaveCount(0);
      await managerPage.setViewportSize({ width: 390, height: 844 });
      await expectManagerNoOverflow();
    } finally {
      if (managerUiDriverId) {
        const token = await managerPage.evaluate(() => JSON.parse(localStorage.getItem("auth_tokens") ?? "{}").accessToken as string).catch(() => null);
        if (token) {
          const headers = { Authorization: `Bearer ${token}` };
          const currentDriver = await managerPage.request.get(`/api/backend/Drivers/${managerUiDriverId}`, { headers }).catch(() => null);
          if (currentDriver?.ok()) {
            const driverData = await currentDriver.json().catch(() => null);
            if (driverData?.vehicleId) {
              await managerPage.request.put(`/api/backend/Drivers/${managerUiDriverId}/unassign-vehicle`, { headers }).catch(() => undefined);
            }
            if (driverData?.isActive) {
              await managerPage.request.put(`/api/backend/Drivers/${managerUiDriverId}/status`, { headers, data: { isActive: false } }).catch(() => undefined);
            }
          }
        }
      }
      if (managerVehicleId) {
        const token = await managerPage.evaluate(() => JSON.parse(localStorage.getItem("auth_tokens") ?? "{}").accessToken as string).catch(() => null);
        if (token) {
          await managerPage.request.put(`/api/backend/Vehicles/${managerVehicleId}/status`, {
            headers: { Authorization: `Bearer ${token}` },
            data: { status: 0 },
          }).catch(() => undefined);
          await managerPage.request.delete(`/api/backend/Vehicles/${managerVehicleId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => undefined);
        }
      }
      await managerContext.close();
    }
  } finally {
    await setFixtureRole("Driver");
  }
});

test("Logistics ve rutas pero no vehículos ni administración de equipo", async ({ page, browser }) => {
  test.skip(!email || !password || !driverEmail || !driverPassword || !driverIdFixture || !allowMutations, "Requiere fixtures Admin/Driver y FLETFLOW_E2E_ALLOW_MUTATIONS=true.");
  test.setTimeout(90_000);
  page.setDefaultTimeout(8_000);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email!);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(password!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const adminToken = await page.evaluate(() => {
    const serialized = localStorage.getItem("auth_tokens");
    return serialized ? JSON.parse(serialized).accessToken as string : null;
  });
  expect(adminToken).toBeTruthy();
  const headers = { Authorization: `Bearer ${adminToken}` };
  const teamResponse = await page.request.get("/api/backend/Users/my-team", { headers });
  expect(teamResponse.status()).toBe(200);
  const team = await teamResponse.json() as Array<{ id: string; driverId?: string }>;
  const driver = team.find((member) => member.driverId === driverIdFixture);
  expect(driver).toBeTruthy();

  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9);
  const routeName = `E2E QA ruta Logistics ${suffix}`;
  let routeId: string | undefined;
  const createdVehicle = await page.request.post("/api/backend/Vehicles", {
    headers,
    data: { plate: `E2EQA${suffix}`, brand: "FleetFlow QA", model: "Logistics route", year: 2025 },
  });
  expect(createdVehicle.status()).toBe(201);
  const vehicleId = (await createdVehicle.json()).id as string;
  const createdDriver = await page.request.post("/api/backend/Drivers", {
    headers,
    data: {
      firstName: `E2E Logistics ${suffix}`,
      lastName: "Chofer",
      documentNumber: `E2EQA${suffix}L`,
      phoneNumber: "0990000088",
      userId: null,
    },
  });
  expect(createdDriver.status()).toBe(201);
  const routeDriverId = (await createdDriver.json()).id as string;

  const promote = await page.request.put(`/api/backend/Users/${driver!.id}/role`, {
    headers,
    data: { roleName: "Logistics" },
  });
  expect(promote.status()).toBe(200);

  const logisticsContext = await browser.newContext();
  const logisticsPage = await logisticsContext.newPage();
  let forbiddenVehicleListRequests = 0;
  logisticsPage.on("request", (request) => {
    if (
      request.method() === "GET" &&
      new URL(request.url()).pathname === "/api/backend/Vehicles"
    ) {
      forbiddenVehicleListRequests += 1;
    }
  });
  try {
    await logisticsPage.setViewportSize({ width: 390, height: 844 });
    await logisticsPage.goto("/login");
    await logisticsPage.getByLabel("Correo electrónico").fill(driverEmail!);
    await logisticsPage.getByRole("textbox", { name: "Contraseña" }).fill(driverPassword!);
    await logisticsPage.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(logisticsPage).toHaveURL(/\/dashboard$/);
    const logisticsToken = await logisticsPage.evaluate(() => {
      const serialized = localStorage.getItem("auth_tokens");
      return serialized ? JSON.parse(serialized).accessToken as string : null;
    });
    expect(logisticsToken).toBeTruthy();
    const logisticsHeaders = { Authorization: `Bearer ${logisticsToken}` };
    const assignmentOptionsResponse = await logisticsPage.request.get(
      "/api/backend/Routes/assignment-options",
      { headers: logisticsHeaders },
    );
    expect(assignmentOptionsResponse.status()).toBe(200);
    const assignmentOptions = await assignmentOptionsResponse.json();
    const availableVehiclesStat = logisticsPage
      .getByText("Vehículos Disponibles", { exact: true })
      .locator("xpath=..");
    await expect(availableVehiclesStat.locator("p").nth(1)).toHaveText(
      String(assignmentOptions.vehicles.length),
    );
    expect(forbiddenVehicleListRequests).toBe(0);

    await logisticsPage.getByRole("button", { name: "Abrir menú" }).click();
    await expect(logisticsPage.getByRole("button", { name: "Gestión de Rutas", exact: true })).toBeVisible();
    await expect(logisticsPage.getByRole("button", { name: "Gestión de Vehículos", exact: true })).toHaveCount(0);
    await expect(logisticsPage.getByRole("button", { name: "Gestión de Conductores", exact: true })).toHaveCount(0);
    await expect(logisticsPage.getByRole("button", { name: "Gestión de Equipo", exact: true })).toHaveCount(0);

    const [routesResponse, vehiclesResponse, driversResponse] = await Promise.all([
      logisticsPage.request.get("/api/backend/Routes", { headers: logisticsHeaders }),
      logisticsPage.request.get("/api/backend/Vehicles", { headers: logisticsHeaders }),
      logisticsPage.request.get("/api/backend/Drivers", { headers: logisticsHeaders }),
    ]);
    expect(routesResponse.status()).toBe(200);
    expect(vehiclesResponse.status()).toBe(403);
    expect(driversResponse.status()).toBe(403);
    const logisticsTeamResponse = await logisticsPage.request.get("/api/backend/Users/my-team", { headers: logisticsHeaders });
    expect(logisticsTeamResponse.status()).toBe(403);
    expect(await logisticsTeamResponse.text()).not.toContain(driverEmail!);
    expect(assignmentOptions.vehicles).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: vehicleId, plate: `E2EQA${suffix}` }),
    ]));
    expect(assignmentOptions.drivers).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: routeDriverId, firstName: `E2E Logistics ${suffix}`, userId: null }),
    ]));
    expect(assignmentOptions.drivers.every((item: Record<string, unknown>) =>
      !("documentNumber" in item) && !("phoneNumber" in item),
    )).toBe(true);

    await test.step("Logistics crea una ruta desde el constructor", async () => {
      await logisticsPage.getByRole("button", { name: "Gestión de Rutas", exact: true }).click();
      await logisticsPage.getByRole("button", { name: "Nueva ruta", exact: true }).click();
      await logisticsPage.getByPlaceholder("Ej. Entregas zona norte").fill(routeName);
      await logisticsPage.getByPlaceholder("Productos, cantidad o instrucciones para el conductor").fill("Creada por Logistics desde UI");
      await logisticsPage.getByRole("button", { name: "Continuar" }).click();
      const map = logisticsPage.locator(".leaflet-container");
      await logisticsPage.getByRole("button", { name: "Seleccionando" }).waitFor();
      await logisticsPage.setViewportSize({ width: 320, height: 844 });
      const originMapDimensions = await logisticsPage.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        main: document.querySelector("main")?.clientWidth ?? 0,
        mainContent: document.querySelector("main")?.scrollWidth ?? 0,
      }));
      expect(originMapDimensions.document).toBeLessThanOrEqual(originMapDimensions.viewport);
      expect(originMapDimensions.mainContent).toBeLessThanOrEqual(originMapDimensions.main);
      await clickMapAwayFromMarkers(map);
      await logisticsPage.getByPlaceholder("¿Desde dónde sale?").fill("Origen Logistics E2E");
      const destinationRow = logisticsPage.getByPlaceholder("¿A dónde llega?").locator("xpath=../..");
      await destinationRow.getByRole("button", { name: "Ubicar" }).click();
      await logisticsPage.setViewportSize({ width: 768, height: 1024 });
      const destinationMapDimensions = await logisticsPage.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        main: document.querySelector("main")?.clientWidth ?? 0,
        mainContent: document.querySelector("main")?.scrollWidth ?? 0,
      }));
      expect(destinationMapDimensions.document).toBeLessThanOrEqual(destinationMapDimensions.viewport);
      expect(destinationMapDimensions.mainContent).toBeLessThanOrEqual(destinationMapDimensions.main);
      await clickMapAwayFromMarkers(map);
      await logisticsPage.getByPlaceholder("¿A dónde llega?").fill("Destino Logistics E2E");
      await logisticsPage.getByRole("button", { name: "Continuar" }).click();
      await logisticsPage.getByRole("heading", { name: "Asigna los recursos" }).waitFor();
      await expect(logisticsPage.locator("select").nth(0).locator(`option[value="${vehicleId}"]`)).toHaveCount(1);
      await expect(logisticsPage.locator("select").nth(1).locator(`option[value="${routeDriverId}"]`)).toHaveCount(1);
      await logisticsPage.locator("select").nth(0).selectOption(vehicleId!);
      await logisticsPage.locator("select").nth(1).selectOption(routeDriverId);
      for (const width of [320, 768]) {
        await logisticsPage.setViewportSize({ width, height: width === 320 ? 844 : 1024 });
        const dimensions = await logisticsPage.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          content: document.documentElement.scrollWidth,
        }));
        expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
        await expect(logisticsPage.locator("select").nth(0)).toHaveValue(vehicleId);
        await expect(logisticsPage.locator("select").nth(1)).toHaveValue(routeDriverId);
      }
      await logisticsPage.setViewportSize({ width: 390, height: 844 });
      await logisticsPage.getByRole("button", { name: "Continuar" }).click();
      await logisticsPage.getByRole("heading", { name: "Revisa y crea" }).waitFor();
      const createRoutePromise = logisticsPage.waitForResponse((response) =>
        response.url().includes("/api/backend/Routes") && response.request().method() === "POST",
      );
      await logisticsPage.getByRole("button", { name: "Crear ruta", exact: true }).click();
      const createRouteResponse = await createRoutePromise;
      expect(createRouteResponse.status()).toBe(201);
      routeId = (await createRouteResponse.json()).id as string;
    });
    const persistedRoute = await logisticsPage.request.get(`/api/backend/Routes/${routeId}`, { headers: logisticsHeaders });
    expect(persistedRoute.status()).toBe(200);
    expect(await persistedRoute.json()).toMatchObject({
      name: routeName,
      vehicleId,
      vehiclePlate: `E2EQA${suffix}`,
      driverId: routeDriverId,
      status: 0,
    });

    const routeCard = logisticsPage.getByRole("heading", { name: routeName, exact: true }).locator("xpath=../../../..");
    for (const width of [320, 768]) {
      await logisticsPage.setViewportSize({ width, height: width === 320 ? 844 : 1024 });
      const routeListDimensions = await logisticsPage.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        main: document.querySelector("main")?.clientWidth ?? 0,
        mainContent: document.querySelector("main")?.scrollWidth ?? 0,
      }));
      expect(routeListDimensions.document).toBeLessThanOrEqual(routeListDimensions.viewport);
      expect(routeListDimensions.mainContent).toBeLessThanOrEqual(routeListDimensions.main);
      await expect(logisticsPage.getByRole("heading", { name: routeName, exact: true })).toBeVisible();
    }
    await routeCard.getByRole("button", { name: `Cancelar ruta ${routeName}` }).click();
    const cancelDialog = logisticsPage.getByRole("alertdialog");
    await expect(logisticsPage.getByRole("heading", { name: "Cancelar ruta pendiente" })).toBeVisible();
    for (const width of [320, 768]) {
      await logisticsPage.setViewportSize({ width, height: width === 320 ? 844 : 1024 });
      const dimensions = await logisticsPage.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
      const dialogBounds = await cancelDialog.boundingBox();
      expect(dialogBounds).toBeTruthy();
      expect(dialogBounds!.x).toBeGreaterThanOrEqual(0);
      expect(dialogBounds!.x + dialogBounds!.width).toBeLessThanOrEqual(width);
    }
    const cancelRoutePromise = logisticsPage.waitForResponse((response) =>
      response.url().includes(`/api/backend/Routes/${routeId}/status`) && response.request().method() === "PUT",
    );
    await logisticsPage.getByRole("button", { name: "Sí, cancelar ruta" }).click();
    expect((await cancelRoutePromise).status()).toBe(204);
    const cancelledRoute = await logisticsPage.request.get(`/api/backend/Routes/${routeId}`, { headers: logisticsHeaders });
    expect((await cancelledRoute.json()).status).toBe(3);

    await logisticsPage.getByRole("button", { name: "Abrir menú" }).click();
    await logisticsPage.getByRole("button", { name: "Historial de Rutas", exact: true }).click();
    await expect(logisticsPage.getByRole("heading", { name: "Historial de Rutas", exact: true })).toBeVisible();
    const historyCardHeading = logisticsPage.getByRole("heading", { name: routeName, exact: true });
    await expect(historyCardHeading).toBeVisible();
    const historyCard = historyCardHeading.locator("xpath=../../../..");
    await expect(historyCard).toContainText(`E2EQA${suffix}`);
    await expect(
      logisticsPage.getByRole("alert").filter({ hasText: "No se pudieron cargar las rutas" }),
    ).toHaveCount(0);
    for (const width of [320, 768]) {
      await logisticsPage.setViewportSize({ width, height: width === 320 ? 844 : 1024 });
      const dimensions = await logisticsPage.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
        main: document.querySelector("main")?.clientWidth ?? 0,
        mainContent: document.querySelector("main")?.scrollWidth ?? 0,
      }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
      expect(dimensions.mainContent).toBeLessThanOrEqual(dimensions.main);
      await expect(historyCardHeading).toBeVisible();
    }
    await historyCard.getByRole("button", { name: "Ver Detalles" }).click();
    const historyDialog = logisticsPage.getByRole("dialog");
    await expect(historyDialog).toContainText(`E2EQA${suffix}`);
    for (const width of [320, 768]) {
      await logisticsPage.setViewportSize({ width, height: width === 320 ? 844 : 1024 });
      const dimensions = await logisticsPage.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
      const dialogBounds = await historyDialog.boundingBox();
      expect(dialogBounds).toBeTruthy();
      expect(dialogBounds!.x).toBeGreaterThanOrEqual(0);
      expect(dialogBounds!.x + dialogBounds!.width).toBeLessThanOrEqual(width);
    }
    expect(forbiddenVehicleListRequests).toBe(0);
  } finally {
    if (routeId) await page.request.delete(`/api/backend/Routes/${routeId}`, { headers }).catch(() => undefined);
    if (vehicleId) await page.request.delete(`/api/backend/Vehicles/${vehicleId}`, { headers }).catch(() => undefined);
    await logisticsContext.close();
    const restoreDriverRole = await page.request.put(`/api/backend/Users/${driver!.id}/role`, {
      headers,
      data: { roleName: "Driver" },
    }).catch(() => null);
    if (restoreDriverRole?.status() === 200) {
      const restoredDriver = await page.request.get(`/api/backend/Drivers/${driverIdFixture}`, { headers }).catch(() => null);
      if (restoredDriver?.status() === 200 && (await restoredDriver.json()).isActive === false) {
        await page.request.put(`/api/backend/Drivers/${driverIdFixture}/status`, {
          headers,
          data: { isActive: true },
        }).catch(() => undefined);
      }
    }
  }
});

test("Mi Ruta prioriza una ruta en curso sobre una pendiente más reciente", async ({ page, request }) => {
  test.skip(!email || !password || !driverEmail || !driverPassword || !driverIdFixture || !allowMutations, "Requiere fixtures Admin/Driver y MySQL descartable.");

  const adminLogin = await request.post("/api/backend/Auth/login", { data: { email, password } });
  expect(adminLogin.status()).toBe(200);
  const adminTokens = await adminLogin.json();
  const adminHeaders = { Authorization: `Bearer ${adminTokens.token ?? adminTokens.accessToken}` };
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9);
  const inProgressName = `E2E QA ruta en curso primero ${suffix}`;
  const pendingName = `E2E QA ruta pendiente reciente ${suffix}`;
  const plate = `E2EQA${suffix}P`;
  const driverBefore = await request.get(`/api/backend/Drivers/${driverIdFixture}`, { headers: adminHeaders });
  expect(driverBefore.status()).toBe(200);
  const originalVehicleId = (await driverBefore.json()).vehicleId as string | null;
  const vehicleResponse = await request.post("/api/backend/Vehicles", {
    headers: adminHeaders,
    data: { plate, brand: "FleetFlow QA", model: "Driver route priority", year: 2025 },
  });
  expect(vehicleResponse.status()).toBe(201);
  const vehicleId = (await vehicleResponse.json()).id as string;
  let inProgressRouteId: string | undefined;
  let pendingRouteId: string | undefined;

  try {
    const routePayload = (name: string, start: string, end: string) => ({
      name,
      vehicleId,
      driverId: driverIdFixture,
      plannedStart: start,
      plannedEnd: end,
      points: [
        { lat: -0.18, lng: -78.46, name: "Origen prioridad", operation: 0 },
        { lat: -0.19, lng: -78.47, name: "Entrega prioridad", operation: 3 },
        { lat: -0.2, lng: -78.48, name: "Destino prioridad", operation: 0 },
      ],
    });
    const inProgressRoute = await request.post("/api/backend/Routes", {
      headers: adminHeaders,
      data: routePayload(inProgressName, "2040-01-01T08:00:00Z", "2040-01-01T10:00:00Z"),
    });
    expect(inProgressRoute.status()).toBe(201);
    inProgressRouteId = (await inProgressRoute.json()).id as string;
    const pendingRoute = await request.post("/api/backend/Routes", {
      headers: adminHeaders,
      data: routePayload(pendingName, "2041-01-01T08:00:00Z", "2041-01-01T10:00:00Z"),
    });
    expect(pendingRoute.status()).toBe(201);
    pendingRouteId = (await pendingRoute.json()).id as string;
    const startRoute = await request.put(`/api/backend/Routes/${inProgressRouteId}/status`, {
      headers: adminHeaders,
      data: { status: 1 },
    });
    expect(startRoute.status()).toBe(204);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill(driverEmail!);
    await page.getByRole("textbox", { name: "Contraseña" }).fill(driverPassword!);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    const dashboardRouteCard = page.getByRole("button", { name: /Ruta Activa/ });
    await expect(dashboardRouteCard).toContainText(inProgressName);
    await expect(dashboardRouteCard).not.toContainText(pendingName);
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.getByRole("button", { name: "Mi Ruta", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Mi Ruta Activa" })).toBeVisible();
    await expect(page.getByText(inProgressName, { exact: true })).toBeVisible();
    await expect(page.getByText(pendingName, { exact: true })).toHaveCount(0);
  } finally {
    if (inProgressRouteId) {
      await request.put(`/api/backend/Routes/${inProgressRouteId}/status`, { headers: adminHeaders, data: { status: 3 } }).catch(() => undefined);
    }
    if (pendingRouteId) {
      await request.put(`/api/backend/Routes/${pendingRouteId}/status`, { headers: adminHeaders, data: { status: 3 } }).catch(() => undefined);
    }
    if (originalVehicleId) {
      await request.put(`/api/backend/Drivers/${driverIdFixture}/assign-vehicle`, { headers: adminHeaders, data: { vehicleId: originalVehicleId } }).catch(() => undefined);
    } else {
      await request.put(`/api/backend/Drivers/${driverIdFixture}/unassign-vehicle`, { headers: adminHeaders }).catch(() => undefined);
    }
    if (pendingRouteId) await request.delete(`/api/backend/Routes/${pendingRouteId}`, { headers: adminHeaders }).catch(() => undefined);
    if (inProgressRouteId) await request.delete(`/api/backend/Routes/${inProgressRouteId}`, { headers: adminHeaders }).catch(() => undefined);
    await request.delete(`/api/backend/Vehicles/${vehicleId}`, { headers: adminHeaders }).catch(() => undefined);
  }
});

test("Driver Mi Ruta diferencia error de carga de una lista vacía y permite reintentar", async ({ page }) => {
  test.skip(!driverEmail || !driverPassword, "Requiere cuenta QA Driver.");

  await page.setViewportSize({ width: 390, height: 844 });
  page.setDefaultTimeout(8_000);
  let keepRouteReadsFailing = true;
  await page.route("**/api/backend/Routes**", async (route) => {
    if (route.request().method() === "GET" && keepRouteReadsFailing) {
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Servicio temporalmente no disponible" }) });
      return;
    }
    await route.continue();
  });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(driverEmail!);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(driverPassword!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Mi Ruta", exact: true }).click();
  const routeLoadAlert = page.getByRole("alert").filter({ hasText: "No se pudieron cargar tus rutas" });
  await expect(routeLoadAlert).toBeVisible();
  await expect(page.getByRole("heading", { name: "No tienes rutas asignadas" })).toHaveCount(0);
  keepRouteReadsFailing = false;
  await routeLoadAlert.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByRole("heading", { name: "No tienes rutas asignadas" })).toBeVisible();
});

test("Driver sólo ve su operación y la API protege recursos administrativos", async ({ page, request }) => {
  test.skip(!email || !password || !driverEmail || !driverPassword || !driverIdFixture || !allowMutations, "Requiere fixtures Admin/Driver y FLETFLOW_E2E_ALLOW_MUTATIONS=true.");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().grantPermissions(["geolocation"]);
  await page.context().setGeolocation({ latitude: -0.185, longitude: -78.465, accuracy: 10 });
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9);
  const adminLogin = await request.post("/api/backend/Auth/login", {
    data: { email, password },
  });
  expect(adminLogin.status()).toBe(200);
  const adminToken = await adminLogin.json();
  const adminHeaders = { Authorization: `Bearer ${adminToken.token ?? adminToken.accessToken}` };
  const plate = `E2EQA${suffix}`;
  const foreignPlate = `E2EQA${suffix.slice(-5)}F`;
  let vehicleId: string | undefined;
  let foreignVehicleId: string | undefined;
  let foreignDriverId: string | undefined;
  let routeId: string | undefined;
  let foreignRouteId: string | undefined;
  let originalDriverVehicleId: string | null = null;
  const routeName = `E2E QA ruta conductor ${suffix}`;

  try {
  const driverBeforeResponse = await request.get(`/api/backend/Drivers/${driverIdFixture}`, {
    headers: adminHeaders,
  });
  expect(driverBeforeResponse.status()).toBe(200);
  originalDriverVehicleId = (await driverBeforeResponse.json()).vehicleId as string | null;
  const vehicleResponse = await request.post("/api/backend/Vehicles", {
    headers: adminHeaders,
    data: { plate, brand: "FleetFlow QA", model: "Driver route", year: 2025 },
  });
  expect(vehicleResponse.status()).toBe(201);
  vehicleId = (await vehicleResponse.json()).id as string;
  const routeResponse = await request.post("/api/backend/Routes", {
    headers: adminHeaders,
    data: {
      name: routeName,
      cargoDescription: "Prueba operativa Driver",
      vehicleId,
      driverId: driverIdFixture,
      points: [
        { lat: -0.18, lng: -78.46, name: "Origen E2E", operation: 0 },
        { lat: -0.19, lng: -78.47, name: "Entrega E2E", operation: 3 },
        { lat: -0.195, lng: -78.475, name: "Parada secundaria E2E", operation: 1 },
        { lat: -0.2, lng: -78.48, name: "Destino E2E", operation: 0 },
      ],
    },
  });
  if (routeResponse.status() !== 201) {
    throw new Error(`No se pudo crear la ruta QA: HTTP ${routeResponse.status()} ${await routeResponse.text()}`);
  }
  routeId = (await routeResponse.json()).id as string;

  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(driverEmail!);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(driverPassword!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(page.getByRole("button", { name: "Mi Ruta", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gestión de Rutas", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Gestión de Equipo", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Gestión de Vehículos", exact: true })).toHaveCount(0);

  const driverToken = await page.evaluate(() => {
    const serialized = localStorage.getItem("auth_tokens");
    return serialized ? JSON.parse(serialized).accessToken as string : null;
  });
  expect(driverToken).toBeTruthy();
  const headers = { Authorization: `Bearer ${driverToken}` };
  const vehiclesResponse = await page.request.get("/api/backend/Vehicles", { headers });
  expect(vehiclesResponse.status()).toBe(403);

  await page.getByRole("button", { name: "Mi Ruta", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mi Ruta Activa" })).toBeVisible();
  await expect(page.getByText(routeName, { exact: true })).toBeVisible();
  await expect(page.getByText("GPS en vivo", { exact: true })).toBeVisible();
  const assertDriverViewport = async () => {
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
      mainViewport: document.querySelector("main")?.clientWidth ?? 0,
      mainContent: document.querySelector("main")?.scrollWidth ?? 0,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
    expect(dimensions.mainContent).toBeLessThanOrEqual(dimensions.mainViewport);
  };
  await assertDriverViewport();
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.getByRole("heading", { name: "Mi Ruta Activa" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Iniciar Ruta" })).toBeVisible();
  await assertDriverViewport();
  await page.setViewportSize({ width: 320, height: 844 });
  await assertDriverViewport();
  const gpsBadge = await page.getByText("GPS en vivo", { exact: true }).locator("xpath=..").boundingBox();
  const vehicleBadge = await page.locator(".absolute.top-4.right-4").boundingBox();
  expect(gpsBadge).not.toBeNull();
  expect(vehicleBadge).not.toBeNull();
  expect(gpsBadge!.x + gpsBadge!.width).toBeLessThanOrEqual(vehicleBadge!.x);
  const positionResponsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith(`/api/backend/Routes/${routeId}/positions`) &&
    response.request().method() === "POST",
  );
  const startRoutePromise = page.waitForResponse((response) =>
    response.url().includes(`/api/backend/Routes/${routeId}/status`) &&
    response.request().method() === "PUT",
  );
  await page.getByRole("button", { name: "Iniciar Ruta" }).click();
  expect((await startRoutePromise).status()).toBe(204);
  const positionResponse = await positionResponsePromise;
  expect(positionResponse.status()).toBe(200);
  const positionsResponse = await page.request.get(`/api/backend/Routes/${routeId}/positions`, {
    headers: adminHeaders,
  });
  expect(positionsResponse.status()).toBe(200);
  const positions = await positionsResponse.json() as Array<{ latitude: number; longitude: number }>;
  expect(positions).toEqual(expect.arrayContaining([
    expect.objectContaining({ latitude: -0.185, longitude: -78.465 }),
  ]));

  const stopCard = page.locator("article").filter({ hasText: "Entrega E2E" });
  await expect(stopCard).toContainText("Recogida y entrega");
  const startStopPromise = page.waitForResponse((response) =>
    response.url().includes(`/api/backend/Routes/${routeId}/points/1/status`) &&
    response.request().method() === "PUT",
  );
  await stopCard.getByRole("button", { name: "Iniciar parada" }).click();
  expect((await startStopPromise).status()).toBe(200);

  await stopCard.getByRole("button", { name: "Evidencia" }).click();
  const evidenceDialog = page.getByRole("dialog");
  await expect(evidenceDialog).toBeVisible();
  const evidenceBounds = await evidenceDialog.boundingBox();
  expect(evidenceBounds).not.toBeNull();
  expect(evidenceBounds!.x).toBeGreaterThanOrEqual(0);
  expect(evidenceBounds!.x + evidenceBounds!.width).toBeLessThanOrEqual(320);
  await assertDriverViewport();
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(evidenceDialog.getByRole("button", { name: "Nota" })).toBeVisible();
  await evidenceDialog.getByRole("button", { name: "Nota" }).click();
  await expect(evidenceDialog.getByRole("button", { name: "Agregar Nota" })).toBeVisible();
  const tabletEvidenceBounds = await evidenceDialog.boundingBox();
  expect(tabletEvidenceBounds).not.toBeNull();
  expect(tabletEvidenceBounds!.x).toBeGreaterThanOrEqual(0);
  expect(tabletEvidenceBounds!.x + tabletEvidenceBounds!.width).toBeLessThanOrEqual(768);
  await assertDriverViewport();
  await page.setViewportSize({ width: 320, height: 844 });
  await assertDriverViewport();
  await evidenceDialog.getByPlaceholder("Escribe tu nota aquí...").fill("Recibido por cliente E2E");
  const evidencePromise = page.waitForResponse((response) =>
    response.url().includes(`/api/backend/Routes/${routeId}/points/1/evidence`) &&
    response.request().method() === "POST",
  );
  await evidenceDialog.getByRole("button", { name: "Agregar Nota" }).click();
  expect((await evidencePromise).ok()).toBe(true);

  const completeStopPromise = page.waitForResponse((response) =>
    response.url().includes(`/api/backend/Routes/${routeId}/points/1/status`) &&
    response.request().method() === "PUT",
  );
  await stopCard.getByRole("button", { name: "Marcar completada" }).click();
  expect((await completeStopPromise).status()).toBe(200);
  await expect(stopCard).toContainText("Completada");
  await expect(stopCard).toContainText("Recibido por cliente E2E");
  const nextPointBadge = page.locator(".absolute.bottom-4.left-4");
  await expect(nextPointBadge).toContainText("Parada secundaria E2E");

  const secondaryStop = page.locator("article").filter({ hasText: "Parada secundaria E2E" });
  const startSecondaryStop = page.waitForResponse((response) =>
    response.url().includes(`/api/backend/Routes/${routeId}/points/2/status`) && response.request().method() === "PUT",
  );
  await secondaryStop.getByRole("button", { name: "Iniciar parada" }).click();
  expect((await startSecondaryStop).status()).toBe(200);
  await secondaryStop.getByRole("button", { name: "Evidencia" }).click();
  const secondaryEvidenceDialog = page.getByRole("dialog");
  await secondaryEvidenceDialog.getByRole("button", { name: "Nota", exact: true }).click();
  await secondaryEvidenceDialog.getByPlaceholder("Escribe tu nota aquí...").fill("Recogida secundaria confirmada");
  const secondaryEvidence = page.waitForResponse((response) =>
    response.url().includes(`/api/backend/Routes/${routeId}/points/2/evidence`) && response.request().method() === "POST",
  );
  await secondaryEvidenceDialog.getByRole("button", { name: "Agregar Nota" }).click();
  expect((await secondaryEvidence).status()).toBe(200);
  const completeSecondaryStop = page.waitForResponse((response) =>
    response.url().includes(`/api/backend/Routes/${routeId}/points/2/status`) && response.request().method() === "PUT",
  );
  await secondaryStop.getByRole("button", { name: "Marcar completada" }).click();
  expect((await completeSecondaryStop).status()).toBe(200);
  await expect(nextPointBadge).toContainText("No hay paradas pendientes");

  const completeRoutePromise = page.waitForResponse((response) =>
    response.url().includes(`/api/backend/Routes/${routeId}/status`) &&
    response.request().method() === "PUT",
  );
  await page.getByRole("button", { name: "Completar", exact: true }).click();
  expect((await completeRoutePromise).status()).toBe(204);
  await expect(page.getByRole("heading", { name: "No tienes rutas asignadas" })).toBeVisible();
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.getByRole("heading", { name: "No tienes rutas asignadas" })).toBeVisible();
  await assertDriverViewport();

  const persistedRoute = await page.request.get(`/api/backend/Routes/${routeId}`, { headers: adminHeaders });
  expect(persistedRoute.status()).toBe(200);
  expect((await persistedRoute.json()).status).toBe(2);
  const persistedVehicle = await page.request.get(`/api/backend/Vehicles/${vehicleId}`, { headers: adminHeaders });
  expect(persistedVehicle.status()).toBe(200);
  expect((await persistedVehicle.json()).status).toBe(0);

  const deactivateDriver = await request.put(`/api/backend/Drivers/${driverIdFixture}/status`, {
    headers: adminHeaders,
    data: { isActive: false },
  });
  expect(deactivateDriver.status()).toBe(204);
  expect((await page.request.get(`/api/backend/Routes/${routeId}`, { headers })).status()).toBe(403);
  expect((await page.request.get("/api/backend/Routes", { headers })).status()).toBe(403);
  expect((await page.request.get(`/api/backend/Routes/${routeId}/positions`, { headers })).status()).toBe(403);
  expect((await page.request.post(`/api/backend/Routes/${routeId}/positions`, {
    headers,
    data: { latitude: -0.185, longitude: -78.465 },
  })).status()).toBe(403);
  const reactivateDriver = await request.put(`/api/backend/Drivers/${driverIdFixture}/status`, {
    headers: adminHeaders,
    data: { isActive: true },
  });
  expect(reactivateDriver.status()).toBe(204);
  expect((await page.request.get(`/api/backend/Routes/${routeId}/positions`, { headers })).status()).toBe(200);

  const foreignVehicleResponse = await request.post("/api/backend/Vehicles", {
    headers: adminHeaders,
    data: { plate: foreignPlate, brand: "FleetFlow QA", model: "Foreign driver route", year: 2025 },
  });
  expect(foreignVehicleResponse.status()).toBe(201);
  foreignVehicleId = (await foreignVehicleResponse.json()).id as string;
  const foreignDriverResponse = await request.post("/api/backend/Drivers", {
    headers: adminHeaders,
    data: { firstName: "Foreign", lastName: "Driver QA", documentNumber: `E2EQA${suffix}`, phoneNumber: "0990000002" },
  });
  expect(foreignDriverResponse.status()).toBe(201);
  foreignDriverId = (await foreignDriverResponse.json()).id as string;
  const foreignRouteResponse = await request.post("/api/backend/Routes", {
    headers: adminHeaders,
    data: {
      name: `E2E QA ruta conductor ajeno ${suffix}`,
      cargoDescription: "Aislamiento Driver",
      vehicleId: foreignVehicleId,
      driverId: foreignDriverId,
      points: [
        { lat: -0.18, lng: -78.46, name: "Origen ajeno", operation: 0 },
        { lat: -0.19, lng: -78.47, name: "Parada ajena", operation: 3 },
        { lat: -0.2, lng: -78.48, name: "Destino ajeno", operation: 0 },
      ],
    },
  });
  expect(foreignRouteResponse.status()).toBe(201);
  foreignRouteId = (await foreignRouteResponse.json()).id as string;

  const driverForeignRoute = await page.request.get(`/api/backend/Routes/${foreignRouteId}`, { headers });
  expect(driverForeignRoute.status()).toBe(403);
  const driverRouteList = await page.request.get(`/api/backend/Routes?vehicleId=${foreignVehicleId}`, { headers });
  expect(driverRouteList.status()).toBe(200);
  const driverVisibleRoutes = await driverRouteList.json() as Array<{ id: string }>;
  expect(driverVisibleRoutes.some((route) => route.id === foreignRouteId)).toBe(false);
  expect((await page.request.put(`/api/backend/Routes/${foreignRouteId}/status`, {
    headers,
    data: { status: 3 },
  })).status()).toBe(404);
  expect((await page.request.put(`/api/backend/Routes/${foreignRouteId}/points/1/status`, {
    headers,
    data: { status: 1 },
  })).status()).toBe(404);
  expect((await page.request.post(`/api/backend/Routes/${foreignRouteId}/points/1/evidence`, {
    headers,
    data: { type: "note", content: "No autorizado", description: "Prueba negativa" },
  })).status()).toBe(404);
  expect((await page.request.get(`/api/backend/Routes/${foreignRouteId}/positions`, { headers })).status()).toBe(403);
  expect((await page.request.post(`/api/backend/Routes/${foreignRouteId}/positions`, {
    headers,
    data: { latitude: -0.185, longitude: -78.465 },
  })).status()).toBe(403);
  const unchangedForeignRoute = await request.get(`/api/backend/Routes/${foreignRouteId}`, { headers: adminHeaders });
  expect(unchangedForeignRoute.status()).toBe(200);
  const unchangedForeignRouteBody = await unchangedForeignRoute.json();
  expect(unchangedForeignRouteBody.status).toBe(0);
  expect(unchangedForeignRouteBody.points[1].status).toBe(0);
  expect(unchangedForeignRouteBody.points[1].evidence).toEqual([]);
  expect((await request.get(`/api/backend/Routes/${foreignRouteId}/positions`, { headers: adminHeaders })).status()).toBe(200);
  expect(await (await request.get(`/api/backend/Routes/${foreignRouteId}/positions`, { headers: adminHeaders })).json()).toEqual([]);

  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
  } finally {
    await request.put(`/api/backend/Drivers/${driverIdFixture}/status`, {
      headers: adminHeaders,
      data: { isActive: true },
    }).catch(() => undefined);
    if (foreignRouteId) {
      const removeForeignRoute = await request.delete(`/api/backend/Routes/${foreignRouteId}`, { headers: adminHeaders }).catch(() => null);
      if (removeForeignRoute && ![204, 404].includes(removeForeignRoute.status())) {
        throw new Error(`No se pudo limpiar la ruta ajena: HTTP ${removeForeignRoute.status()}`);
      }
    }
    if (foreignDriverId) {
      const unassignForeignDriver = await request.put(`/api/backend/Drivers/${foreignDriverId}/unassign-vehicle`, {
        headers: adminHeaders,
      }).catch(() => null);
      if (unassignForeignDriver && ![204, 404].includes(unassignForeignDriver.status())) {
        throw new Error(`No se pudo liberar la asignación del Driver ajeno: HTTP ${unassignForeignDriver.status()}`);
      }
      await request.put(`/api/backend/Drivers/${foreignDriverId}/status`, {
        headers: adminHeaders,
        data: { isActive: false },
      }).catch(() => undefined);
    }
    if (foreignVehicleId) {
      const removeForeignVehicle = await request.delete(`/api/backend/Vehicles/${foreignVehicleId}`, { headers: adminHeaders }).catch(() => null);
      if (removeForeignVehicle && ![204, 404].includes(removeForeignVehicle.status())) {
        throw new Error(`No se pudo limpiar el vehículo ajeno: HTTP ${removeForeignVehicle.status()}`);
      }
    }
    if (routeId) {
    const cleanupRoute = await request.get(`/api/backend/Routes/${routeId}`, { headers: adminHeaders });
    if (cleanupRoute.ok()) {
      const status = (await cleanupRoute.json()).status;
      if (status === 1 || status === "InProgress") {
        const cancelRoute = await request.put(`/api/backend/Routes/${routeId}/status`, {
          headers: adminHeaders,
          data: { status: 3 },
        });
        expect(cancelRoute.status()).toBe(204);
      }
      const deleteRoute = await request.delete(`/api/backend/Routes/${routeId}`, { headers: adminHeaders });
      expect(deleteRoute.status()).toBe(204);
    }
    }
    if (vehicleId) {
      const driverAfterResponse = await request.get(`/api/backend/Drivers/${driverIdFixture}`, { headers: adminHeaders });
      if (driverAfterResponse.ok()) {
        const currentVehicleId = (await driverAfterResponse.json()).vehicleId as string | null;
        if (currentVehicleId === vehicleId) {
          const restoreAssignment = originalDriverVehicleId
            ? await request.put(`/api/backend/Drivers/${driverIdFixture}/assign-vehicle`, {
                headers: adminHeaders,
                data: { vehicleId: originalDriverVehicleId },
              })
            : await request.put(`/api/backend/Drivers/${driverIdFixture}/unassign-vehicle`, { headers: adminHeaders });
          expect(restoreAssignment.status()).toBe(204);
        }
      }
      const cleanupVehicle = await request.delete(`/api/backend/Vehicles/${vehicleId}`, { headers: adminHeaders });
      expect([200, 204, 404]).toContain(cleanupVehicle.status());
    }
  }
});

test("un Admin de otra empresa no puede consultar ni modificar recursos de flota ajenos", async ({ page, request }) => {
  test.skip(!email || !password || !otherTenantEmail || !otherTenantPassword || !driverIdFixture || !allowMutations, "Requiere dos empresas y Driver QA locales con FLETFLOW_E2E_ALLOW_MUTATIONS=true.");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email!);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(password!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const ownerToken = await page.evaluate(() => {
    const serialized = localStorage.getItem("auth_tokens");
    return serialized ? JSON.parse(serialized).accessToken as string : null;
  });
  expect(ownerToken).toBeTruthy();
  const ownerHeaders = { Authorization: `Bearer ${ownerToken}` };
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9);
  let vehicleId: string | undefined;
  const driverId = driverIdFixture!;
  let routeId: string | undefined;
  const driverBeforeResponse = await request.get(`/api/backend/Drivers/${driverId}`, { headers: ownerHeaders });
  expect(driverBeforeResponse.status()).toBe(200);
  const originalDriverVehicleId = (await driverBeforeResponse.json()).vehicleId as string | null;

  try {
    const created = await page.request.post("/api/backend/Vehicles", {
      headers: ownerHeaders,
      data: { plate: `E2EQA${suffix}`, brand: "FleetFlow QA", model: "Tenant test", year: 2025 },
    });
    expect(created.status()).toBe(201);
    vehicleId = (await created.json()).id as string;

    const createdRoute = await page.request.post("/api/backend/Routes", {
      headers: ownerHeaders,
      data: {
        name: `E2E QA ruta tenant ${suffix}`,
        cargoDescription: "Ruta cross tenant QA",
        vehicleId,
        driverId,
        points: [
          { lat: -0.18, lng: -78.46, name: "Tenant origin", operation: 0, status: 0 },
          { lat: -0.19, lng: -78.47, name: "Tenant destination", operation: 0, status: 0 },
        ],
      },
    });
    expect(createdRoute.status()).toBe(201);
    routeId = (await createdRoute.json()).id as string;
    const startRoute = await page.request.put(`/api/backend/Routes/${routeId}/status`, {
      headers: ownerHeaders,
      data: { status: 1 },
    });
    expect(startRoute.status()).toBe(204);
    const createdPosition = await page.request.post(`/api/backend/Routes/${routeId}/positions`, {
      headers: ownerHeaders,
      data: { latitude: -0.185, longitude: -78.465, recordedAt: new Date().toISOString(), speedKmh: 0, heading: 0 },
    });
    expect(createdPosition.status()).toBe(200);

    const otherLogin = await page.request.post("/api/backend/Auth/login", {
      data: { email: otherTenantEmail, password: otherTenantPassword },
    });
    expect(otherLogin.status()).toBe(200);
    const otherLoginResult = await otherLogin.json();
    const otherToken = (otherLoginResult.token ?? otherLoginResult.accessToken) as string | undefined;
    expect(otherToken).toBeTruthy();
    const otherHeaders = { Authorization: `Bearer ${otherToken}` };

    const otherVehicles = await page.request.get("/api/backend/Vehicles", { headers: otherHeaders });
    expect(otherVehicles.status()).toBe(200);
    expect((await otherVehicles.json() as Array<{ id: string }>).some((vehicle) => vehicle.id === vehicleId)).toBe(false);

    const crossTenantGet = await page.request.get(`/api/backend/Vehicles/${vehicleId}`, { headers: otherHeaders });
    expect(crossTenantGet.status()).toBe(404);
    const crossTenantUpdate = await page.request.put(`/api/backend/Vehicles/${vehicleId}`, {
      headers: otherHeaders,
      data: { plate: `HACK${suffix}`, brand: "Changed", model: "Changed", year: 2025 },
    });
    expect(crossTenantUpdate.status()).toBe(404);
    const crossTenantDelete = await page.request.delete(`/api/backend/Vehicles/${vehicleId}`, { headers: otherHeaders });
    expect(crossTenantDelete.status()).toBe(404);

    const otherDrivers = await page.request.get("/api/backend/Drivers", { headers: otherHeaders });
    expect(otherDrivers.status()).toBe(200);
    expect((await otherDrivers.json() as Array<{ id: string }>).some((driver) => driver.id === driverId)).toBe(false);
    expect((await page.request.get(`/api/backend/Drivers/${driverId}`, { headers: otherHeaders })).status()).toBe(404);
    expect((await page.request.put(`/api/backend/Drivers/${driverId}`, {
      headers: otherHeaders,
      data: { firstName: "Cross tenant", lastName: "Blocked", documentNumber: `HACK${suffix}`, phoneNumber: "0990000000" },
    })).status()).toBe(404);
    expect((await page.request.put(`/api/backend/Drivers/${driverId}/status`, {
      headers: otherHeaders,
      data: { isActive: false },
    })).status()).toBe(404);

    const otherRoutes = await page.request.get("/api/backend/Routes", { headers: otherHeaders });
    expect(otherRoutes.status()).toBe(200);
    expect((await otherRoutes.json() as Array<{ id: string }>).some((route) => route.id === routeId)).toBe(false);
    expect((await page.request.get(`/api/backend/Routes/${routeId}`, { headers: otherHeaders })).status()).toBe(404);
    const otherRoutePositions = await page.request.get(`/api/backend/Routes/${routeId}/positions`, { headers: otherHeaders });
    expect(otherRoutePositions.status()).toBe(200);
    expect(await otherRoutePositions.json()).toEqual([]);
    expect((await page.request.post(`/api/backend/Routes/${routeId}/positions`, {
      headers: otherHeaders,
      data: { latitude: -0.186, longitude: -78.466, recordedAt: new Date().toISOString() },
    })).status()).toBe(404);
    expect((await page.request.put(`/api/backend/Routes/${routeId}`, {
      headers: otherHeaders,
      data: {
        name: "Cross tenant blocked",
        cargoDescription: "Blocked",
        vehicleId,
        driverId,
        points: [
          { lat: -0.18, lng: -78.46, name: "Tenant origin", operation: 0, status: 0 },
          { lat: -0.19, lng: -78.47, name: "Tenant destination", operation: 0, status: 0 },
        ],
      },
    })).status()).toBe(404);
    expect((await page.request.put(`/api/backend/Routes/${routeId}/status`, {
      headers: otherHeaders,
      data: { status: 3 },
    })).status()).toBe(404);
    expect((await page.request.delete(`/api/backend/Routes/${routeId}`, { headers: otherHeaders })).status()).toBe(404);

    const crossTenantCreate = await page.request.post("/api/backend/Routes", {
      headers: otherHeaders,
      data: {
        name: `E2E QA ruta tenant ataque ${suffix}`,
        cargoDescription: "No debe enlazar recursos ajenos",
        vehicleId,
        driverId,
        points: [
          { lat: -0.18, lng: -78.46, name: "Tenant origin", operation: 0, status: 0 },
          { lat: -0.19, lng: -78.47, name: "Tenant destination", operation: 0, status: 0 },
        ],
      },
    });
    expect(crossTenantCreate.status()).toBe(404);

    const ownerRead = await page.request.get(`/api/backend/Vehicles/${vehicleId}`, { headers: ownerHeaders });
    expect(ownerRead.status()).toBe(200);
    expect((await ownerRead.json()).plate).toBe(`E2EQA${suffix}`);
    expect((await page.request.get(`/api/backend/Drivers/${driverId}`, { headers: ownerHeaders })).status()).toBe(200);
    expect((await page.request.get(`/api/backend/Routes/${routeId}`, { headers: ownerHeaders })).status()).toBe(200);
    const ownerPositions = await page.request.get(`/api/backend/Routes/${routeId}/positions`, { headers: ownerHeaders });
    expect(ownerPositions.status()).toBe(200);
    expect(await ownerPositions.json()).toHaveLength(1);
  } finally {
    if (routeId) {
      const currentRoute = await request.get(`/api/backend/Routes/${routeId}`, { headers: ownerHeaders });
      if (currentRoute.status() === 200) {
        const status = (await currentRoute.json()).status;
        if (status === 1 || status === "InProgress") {
          const cancelRoute = await request.put(`/api/backend/Routes/${routeId}/status`, {
            headers: ownerHeaders,
            data: { status: 3 },
          });
          expect(cancelRoute.status()).toBe(204);
        }
        const deleteRoute = await request.delete(`/api/backend/Routes/${routeId}`, { headers: ownerHeaders });
        expect(deleteRoute.status()).toBe(204);
      } else {
        expect(currentRoute.status()).toBe(404);
      }
    }
    if (vehicleId) {
      const driverAfterResponse = await request.get(`/api/backend/Drivers/${driverId}`, { headers: ownerHeaders });
      if (driverAfterResponse.ok()) {
        const currentVehicleId = (await driverAfterResponse.json()).vehicleId as string | null;
        if (currentVehicleId === vehicleId) {
          const restoreAssignment = originalDriverVehicleId
            ? await request.put(`/api/backend/Drivers/${driverId}/assign-vehicle`, {
                headers: ownerHeaders,
                data: { vehicleId: originalDriverVehicleId },
              })
            : await request.put(`/api/backend/Drivers/${driverId}/unassign-vehicle`, { headers: ownerHeaders });
          expect(restoreAssignment.status()).toBe(204);
        }
      }
      const cleanupVehicle = await request.delete(`/api/backend/Vehicles/${vehicleId}`, { headers: ownerHeaders });
      expect([200, 204, 404]).toContain(cleanupVehicle.status());
    }
  }
});

test("Admin crea Drivers con y sin usuario desde Equipo y gestiona su ciclo", async ({ page }) => {
  test.skip(!email || !password || !allowMutations, "Requiere cuenta QA Admin y FLETFLOW_E2E_ALLOW_MUTATIONS=true.");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email!);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(password!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const token = await page.evaluate(() => {
    const serialized = localStorage.getItem("auth_tokens");
    return serialized ? JSON.parse(serialized).accessToken as string : null;
  });
  expect(token).toBeTruthy();
  const headers = { Authorization: `Bearer ${token}` };
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9);
  const plate = `E2EQA${suffix}`;
  const vehicleResponse = await page.request.post("/api/backend/Vehicles", {
    headers,
    data: { plate, brand: "FleetFlow QA", model: "Driver assignment", year: 2025 },
  });
  expect(vehicleResponse.status()).toBe(201);
  const vehicleId = (await vehicleResponse.json()).id as string;
  await page.reload();
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Gestión de Equipo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Gestión de Equipo" })).toBeVisible();

  const firstName = `E2E QA ${suffix}`;
  const lastName = "Chofer UI";
  const emailAddress = `fletflow.e2e.driver.ui.${suffix}@example.test`;
  const documentNumber = `E2EQA${suffix}`;
  await page.getByRole("button", { name: "Crear Usuario" }).click();
  const dialog = page.getByRole("dialog");
  const expectUserDialogFits = async () => {
    const sizes = await page.evaluate(() => ({
      viewport: window.innerWidth,
      page: document.documentElement.scrollWidth,
    }));
    const dialogSizes = await dialog.evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      client: element.clientWidth,
      scroll: element.scrollWidth,
    }));
    expect(sizes.page).toBeLessThanOrEqual(sizes.viewport);
    expect(dialogSizes.width).toBeLessThanOrEqual(sizes.viewport);
    expect(dialogSizes.scroll).toBeLessThanOrEqual(dialogSizes.client);
    await expect(dialog.getByRole("button", { name: "Crear Usuario", exact: true })).toBeVisible();
  };
  await page.setViewportSize({ width: 320, height: 844 });
  await expectUserDialogFits();
  await expect(dialog.getByPlaceholder("Juan")).toHaveAttribute("maxlength", "100");
  await expect(dialog.getByPlaceholder("Pérez")).toHaveAttribute("maxlength", "100");
  await expect(dialog.getByRole("textbox", { name: "jperez", exact: true })).toHaveAttribute("maxlength", "100");
  await expect(dialog.getByPlaceholder("jperez@empresa.com")).toHaveAttribute("maxlength", "200");
  await expect(dialog.getByPlaceholder("DNI / ID")).toBeVisible();
  await expect(dialog.getByPlaceholder("999999999")).toBeVisible();
  await page.setViewportSize({ width: 768, height: 1024 });
  await expectUserDialogFits();
  await dialog.getByRole("button", { name: /Gestor de flota/ }).click();
  await expect(dialog.getByPlaceholder("DNI / ID")).toHaveCount(0);
  await dialog.getByRole("button", { name: /Chofer/ }).click();
  await expect(dialog.getByPlaceholder("DNI / ID")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await dialog.getByPlaceholder("Juan").fill(firstName);
  await dialog.getByPlaceholder("Pérez").fill(lastName);
  await dialog.getByRole("textbox", { name: "jperez", exact: true }).fill(`e2e${suffix}`);
  await dialog.getByPlaceholder("jperez@empresa.com").fill(emailAddress);
  await dialog.getByPlaceholder("DNI / ID").fill(documentNumber);
  await dialog.getByPlaceholder("999999999").fill("0990000000");

    await page.route("**/api/backend/Users", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ message: "El correo ya está registrado" }),
        });
      } else {
        await route.continue();
      }
    });
    await dialog.getByRole("button", { name: "Crear Usuario", exact: true }).click();
    await expect(page.getByText("El correo ya está registrado")).toBeVisible();
    await expect(page.getByText("El nombre de usuario ya existe")).toHaveCount(0);
    await page.unroute("**/api/backend/Users");

  const createUserResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/backend/Users") &&
    response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Crear Usuario", exact: true }).click();
  const createUserResponse = await createUserResponsePromise;
  expect(createUserResponse.status()).toBe(200);
  const createdUser = await createUserResponse.json();
  expect(createdUser.role).toBe("Driver");
  expect(createdUser.invitationSent).toBe(false);
  expect(createdUser.driverId).toBeTruthy();
  const driverId = createdUser.driverId as string;
  await expect(page.getByText("Usuario creado, pero el correo de invitación no se pudo enviar")).toBeVisible();

  const duplicateDocumentEmail = `fletflow.e2e.driver.duplicate.${suffix}@example.test`;
  await page.getByRole("button", { name: "Crear Usuario" }).click();
  const duplicateDriverDialog = page.getByRole("dialog");
  await duplicateDriverDialog.getByPlaceholder("Juan").fill("Duplicado E2E");
  await duplicateDriverDialog.getByPlaceholder("Pérez").fill("Documento repetido");
  await duplicateDriverDialog.getByRole("textbox", { name: "jperez", exact: true }).fill(`dup${suffix}`);
  await duplicateDriverDialog.getByPlaceholder("jperez@empresa.com").fill(duplicateDocumentEmail);
  await duplicateDriverDialog.getByPlaceholder("DNI / ID").fill(documentNumber);
  await duplicateDriverDialog.getByPlaceholder("999999999").fill("0990000001");
  const duplicateDriverResponsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith("/api/backend/Users") &&
    response.request().method() === "POST",
  );
  await duplicateDriverDialog.getByRole("button", { name: "Crear Usuario", exact: true }).click();
  const duplicateDriverResponse = await duplicateDriverResponsePromise;
  expect(duplicateDriverResponse.status()).toBe(409);
  const duplicateDriverError = await duplicateDriverResponse.json();
  expect(duplicateDriverError.message).toBe("Ya existe un conductor con ese documento en la empresa.");
  await expect(page.getByText(duplicateDriverError.message)).toBeVisible();
  await expect(duplicateDriverDialog).toBeVisible();
  const usersAfterDuplicate = await page.request.get("/api/backend/Users/my-team", { headers });
  expect(usersAfterDuplicate.status()).toBe(200);
  expect((await usersAfterDuplicate.json() as Array<{ email: string }>).some((user) => user.email === duplicateDocumentEmail)).toBe(false);
  await duplicateDriverDialog.getByRole("button", { name: "Cancelar" }).click();

  await page.getByRole("button", { name: "Gestionar choferes" }).click();
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByPlaceholder("Documento")).toHaveAttribute("maxlength", "20");
  await expect(page.getByPlaceholder("Teléfono")).toHaveAttribute("maxlength", "20");
  const unlinkedFirstName = `Chofer libre ${suffix}`;
  const unlinkedDocument = `E2EQA${suffix}U`;
  await page.getByRole("combobox", { name: "Usuario vinculado al chofer" }).selectOption("");
  await page.getByPlaceholder("Nombres").fill(unlinkedFirstName);
  await page.getByPlaceholder("Apellidos").fill("Sin cuenta");
  await page.getByPlaceholder("Documento").fill(unlinkedDocument);
  await page.getByPlaceholder("Teléfono").fill("0990000099");
  const createUnlinkedDriverPromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith("/api/backend/Drivers") &&
    response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Crear Chofer" }).click();
  const createUnlinkedDriverResponse = await createUnlinkedDriverPromise;
  expect(createUnlinkedDriverResponse.status()).toBe(201);
  const unlinkedDriver = await createUnlinkedDriverResponse.json();
  expect(unlinkedDriver).toMatchObject({
    firstName: unlinkedFirstName,
    documentNumber: unlinkedDocument,
    userId: null,
    vehicleId: null,
  });
  const unlinkedDriverRead = await page.request.get(`/api/backend/Drivers/${unlinkedDriver.id}`, { headers });
  expect(unlinkedDriverRead.status()).toBe(200);
  expect((await unlinkedDriverRead.json()).userId).toBeNull();
  const createdUnlinkedDriverCard = page.getByText(`${unlinkedFirstName} Sin cuenta`, { exact: true }).locator("xpath=../..");
  await expect(createdUnlinkedDriverCard).toContainText("Sin usuario vinculado");
  await expect(createdUnlinkedDriverCard.getByRole("button", { name: "Quitar", exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });

  const driverName = page.getByText(`${firstName} ${lastName}`, { exact: true }).first();
  await expect(driverName).toBeVisible();
  const driverCard = driverName.locator("xpath=../..");
  await driverCard.getByRole("combobox").selectOption(vehicleId);
  const assignVehiclePromise = page.waitForResponse((response) =>
    response.url().includes(`/api/backend/Drivers/${driverId}/assign-vehicle`) &&
    response.request().method() === "PUT",
  );
  await driverCard.getByRole("button", { name: "Asignar", exact: true }).click();
  expect((await assignVehiclePromise).status()).toBe(204);
  const assignedDriver = await page.request.get(`/api/backend/Drivers/${driverId}`, { headers });
  expect((await assignedDriver.json()).vehicleId).toBe(vehicleId);
  await expect(driverCard).toContainText(plate);
  await expect(createdUnlinkedDriverCard.getByRole("combobox").locator("option").filter({ hasText: plate })).toHaveCount(0);

  const unassignVehiclePromise = page.waitForResponse((response) =>
    response.url().includes(`/api/backend/Drivers/${driverId}/unassign-vehicle`) &&
    response.request().method() === "PUT",
  );
  await driverCard.getByRole("button", { name: "Quitar", exact: true }).click();
  expect((await unassignVehiclePromise).status()).toBe(204);
  const unassignedDriver = await page.request.get(`/api/backend/Drivers/${driverId}`, { headers });
  expect(unassignedDriver.status()).toBe(200);
  expect((await unassignedDriver.json()).vehicleId).toBeNull();
  await expect(driverCard).toContainText("Sin vehículo");

  await driverCard.getByRole("button", { name: "Editar" }).click();
  const driverEditForm = driverCard.locator("form");
  await expect(driverEditForm.getByLabel("Documento del conductor")).toHaveAttribute("maxlength", "20");
  await expect(driverEditForm.getByLabel("Teléfono del conductor")).toHaveAttribute("maxlength", "20");
  let invalidDriverEditRequests = 0;
  const countInvalidDriverEdit = (request: { url: () => string; method: () => string }) => {
    if (request.url().includes(`/api/backend/Drivers/${driverId}`) && request.method() === "PUT") invalidDriverEditRequests += 1;
  };
  page.on("request", countInvalidDriverEdit);
  await driverEditForm.getByLabel("Nombres del conductor").fill("   ");
  await driverCard.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Completa todos los datos del conductor.")).toBeVisible();
  expect(invalidDriverEditRequests).toBe(0);
  page.off("request", countInvalidDriverEdit);
  await driverEditForm.getByLabel("Nombres del conductor").fill(`${firstName} editado`);

  const updateDriverPromise = page.waitForResponse((response) =>
    response.url().includes(`/api/backend/Drivers/${driverId}`) &&
    response.request().method() === "PUT",
  );
  await driverCard.getByRole("button", { name: "Guardar cambios" }).click();
  expect((await updateDriverPromise).status()).toBe(200);
  const updatedDriver = await page.request.get(`/api/backend/Drivers/${driverId}`, { headers });
  expect(updatedDriver.status()).toBe(200);
  expect((await updatedDriver.json()).firstName).toBe(`${firstName} editado`);
  const invalidDriverUpdate = await page.request.put(`/api/backend/Drivers/${driverId}`, {
    headers,
    data: { firstName: " ", lastName, documentNumber, phoneNumber: "0990000000" },
  });
  expect(invalidDriverUpdate.status()).toBe(400);
  const afterInvalidDriverUpdate = await page.request.get(`/api/backend/Drivers/${driverId}`, { headers });
  expect((await afterInvalidDriverUpdate.json()).firstName).toBe(`${firstName} editado`);
  const usersAfterDriverEdit = await page.request.get("/api/backend/Users/my-team", { headers });
  const linkedUserAfterDriverEdit = (await usersAfterDriverEdit.json()).find((member: { id: string }) => member.id === createdUser.id);
  expect(linkedUserAfterDriverEdit).toMatchObject({ firstName: `${firstName} editado`, lastName });

  const updatedDriverCard = page.getByText(`${firstName} editado ${lastName}`, { exact: true }).locator("xpath=../..");
  const deactivatePromise = page.waitForResponse((response) =>
    response.url().includes(`/api/backend/Drivers/${driverId}/status`) &&
    response.request().method() === "PUT",
  );
  await updatedDriverCard.getByRole("button", { name: "Dar de baja" }).click();
  expect((await deactivatePromise).status()).toBe(204);
  await page.getByRole("button", { name: "Mostrar bajas" }).click();
  const inactiveDriverCard = page.getByText(`${firstName} editado ${lastName}`).locator("xpath=../..");
  await expect(inactiveDriverCard).toContainText("Inactivo");
  await expect(createdUnlinkedDriverCard).toContainText("Sin usuario vinculado");

  const reactivatePromise = page.waitForResponse((response) =>
    response.url().includes(`/api/backend/Drivers/${driverId}/status`) &&
    response.request().method() === "PUT",
  );
  await inactiveDriverCard.getByRole("button", { name: "Reactivar" }).click();
  expect((await reactivatePromise).status()).toBe(204);
  const reactivatedDriver = await page.request.get(`/api/backend/Drivers/${driverId}`, { headers });
  expect(reactivatedDriver.status()).toBe(200);
  expect((await reactivatedDriver.json()).isActive).toBe(true);

  const teamMemberCard = page
    .getByTestId(`team-user-${createdUser.id}`);
  await page.setViewportSize({ width: 320, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const logisticsRolePromise = page.waitForResponse((response) =>
    response.url().includes(`/api/backend/Users/${createdUser.id}/role`) &&
    response.request().method() === "PUT",
  );
  await teamMemberCard.getByRole("button", { name: "Logistica", exact: true }).click();
  const logisticsRoleResponse = await logisticsRolePromise;
  expect(logisticsRoleResponse.status()).toBe(200);
  expect((await logisticsRoleResponse.json()).role).toBe("Logistics");
  const inactiveAfterRoleChange = await page.request.get(`/api/backend/Drivers/${driverId}`, { headers });
  expect((await inactiveAfterRoleChange.json()).isActive).toBe(false);
  await expect(page.getByText(`${firstName} editado ${lastName}`)).toHaveCount(0);

  const driverRolePromise = page.waitForResponse((response) =>
    response.url().includes(`/api/backend/Users/${createdUser.id}/role`) &&
    response.request().method() === "PUT",
  );
  await teamMemberCard.getByRole("button", { name: "Chofer", exact: true }).click();
  const driverRoleResponse = await driverRolePromise;
  expect(driverRoleResponse.status()).toBe(200);
  expect((await driverRoleResponse.json()).role).toBe("Driver");
  const activeAfterRoleChange = await page.request.get(`/api/backend/Drivers/${driverId}`, { headers });
  expect((await activeAfterRoleChange.json()).isActive).toBe(true);
  await expect(updatedDriverCard.getByRole("button", { name: "Dar de baja" })).toBeVisible();

  await teamMemberCard.getByRole("button", { name: `Editar usuario e2e${suffix}` }).click();
  const editDriverUserDialog = page.getByRole("dialog");
  await editDriverUserDialog.getByLabel("Nombres").fill(`${firstName} desde usuario`);
  await editDriverUserDialog.getByLabel("Apellidos").fill(lastName);
  await editDriverUserDialog.getByLabel("Usuario").fill(`e2e${suffix}`);
  const updateDriverUserProfilePromise = page.waitForResponse((response) =>
    response.url().includes(`/api/backend/Users/${createdUser.id}/profile`) &&
    response.request().method() === "PUT",
  );
  await editDriverUserDialog.getByRole("button", { name: "Guardar cambios" }).click();
  expect((await updateDriverUserProfilePromise).status()).toBe(200);
  const driverAfterUserProfileEdit = await page.request.get(`/api/backend/Drivers/${driverId}`, { headers });
  expect((await driverAfterUserProfileEdit.json())).toMatchObject({
    firstName: `${firstName} desde usuario`,
    lastName,
  });

  const deactivateUserPromise = page.waitForResponse((response) =>
    response.url().includes(`/api/backend/Users/${createdUser.id}/status`) &&
    response.request().method() === "PUT",
  );
  await teamMemberCard.getByRole("button", { name: "Activo", exact: true }).click();
  expect((await deactivateUserPromise).status()).toBe(200);
  const inactiveUsers = await page.request.get("/api/backend/Users/my-team", { headers });
  expect(inactiveUsers.status()).toBe(200);
  const persistedInactiveUser = (await inactiveUsers.json()).find((user: { id: string }) => user.id === createdUser.id);
  expect(persistedInactiveUser?.isActive).toBe(false);
  await expect(teamMemberCard.getByRole("button", { name: "Inactivo", exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Gestión de Equipo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Gestión de Equipo" })).toBeVisible();
  const inactiveMemberAfterReload = page.getByTestId(`team-user-${createdUser.id}`);
  await expect(inactiveMemberAfterReload.getByRole("button", { name: "Inactivo", exact: true })).toBeVisible();

  await page.setViewportSize({ width: 768, height: 1024 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Crear Usuario" }).click();
  const userDialog = page.getByRole("dialog");
  await userDialog.getByPlaceholder("Juan").fill(`Usuario QA ${suffix}`);
  await userDialog.getByPlaceholder("Pérez").fill("Sin flota");
  await userDialog.getByRole("textbox", { name: "jperez", exact: true }).fill(`user${suffix}`);
  const regularUserEmail = `fletflow.e2e.user.ui.${suffix}@example.test`;
  await userDialog.getByPlaceholder("jperez@empresa.com").fill(regularUserEmail);
  await userDialog.getByRole("button", { name: /^Usuario Consulta/ }).click();
  const createRegularUserResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/backend/Users") && response.request().method() === "POST",
  );
  await userDialog.getByRole("button", { name: "Crear Usuario", exact: true }).click();
  const createRegularUserResponse = await createRegularUserResponsePromise;
  expect(createRegularUserResponse.status()).toBe(200);
  const createdRegularUser = await createRegularUserResponse.json();
  expect(createdRegularUser.role).toBe("User");
  const teamUsersAfterCreate = await page.request.get("/api/backend/Users/my-team", { headers });
  expect(teamUsersAfterCreate.status()).toBe(200);
  expect((await teamUsersAfterCreate.json()).some((member: { email: string; roles: string[] }) =>
    member.email === regularUserEmail && member.roles.includes("User"),
  )).toBe(true);

  const regularUserCard = page
    .getByTestId(`team-user-${createdRegularUser.id}`);
  await regularUserCard.getByRole("button", { name: `Editar usuario user${suffix}` }).click();
  const editUserDialog = page.getByRole("dialog");
  await editUserDialog.getByLabel("Nombres").fill("Nombre actualizado QA");
  await editUserDialog.getByLabel("Apellidos").fill("Apellido actualizado");
  await editUserDialog.getByLabel("Usuario").fill(`useredit${suffix}`);
  const updateProfilePromise = page.waitForResponse((response) =>
    response.url().includes(`/api/backend/Users/${createdRegularUser.id}/profile`) &&
    response.request().method() === "PUT",
  );
  await editUserDialog.getByRole("button", { name: "Guardar cambios" }).click();
  expect((await updateProfilePromise).status()).toBe(200);
  const persistedEditedUserResponse = await page.request.get("/api/backend/Users/my-team", { headers });
  expect(persistedEditedUserResponse.status()).toBe(200);
  const persistedEditedUser = (await persistedEditedUserResponse.json()).find((member: { id: string }) => member.id === createdRegularUser.id);
  expect(persistedEditedUser).toMatchObject({
    username: `useredit${suffix}`,
    firstName: "Nombre actualizado QA",
    lastName: "Apellido actualizado",
    email: regularUserEmail,
  });

  const editedRegularUserCard = page
    .getByTestId(`team-user-${createdRegularUser.id}`);
  const deactivateRegularUserPromise = page.waitForResponse((response) =>
    response.url().includes(`/api/backend/Users/${createdRegularUser.id}/status`) &&
    response.request().method() === "PUT",
  );
  await editedRegularUserCard.getByRole("button", { name: "Activo", exact: true }).click();
  expect((await deactivateRegularUserPromise).status()).toBe(200);
  const inactiveRegularUsers = await page.request.get("/api/backend/Users/my-team", { headers });
  expect((await inactiveRegularUsers.json()).find((member: { id: string }) => member.id === createdRegularUser.id)?.isActive).toBe(false);

  const reactivateRegularUserPromise = page.waitForResponse((response) =>
    response.url().includes(`/api/backend/Users/${createdRegularUser.id}/status`) &&
    response.request().method() === "PUT",
  );
  await editedRegularUserCard.getByRole("button", { name: "Inactivo", exact: true }).click();
  expect((await reactivateRegularUserPromise).status()).toBe(200);
  const activeRegularUsers = await page.request.get("/api/backend/Users/my-team", { headers });
  expect((await activeRegularUsers.json()).find((member: { id: string }) => member.id === createdRegularUser.id)?.isActive).toBe(true);

  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
});

test("logout-all cierra la sesión actual y revoca el refresh de otra sesión", async ({ page, browser }) => {
  test.skip(!userEmail || !userPassword, "Requiere cuenta QA User con credenciales activas.");

  await page.setViewportSize({ width: 390, height: 844 });
  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  try {
    for (const targetPage of [page, secondPage]) {
      await targetPage.goto("/login");
      await targetPage.getByLabel("Correo electrónico").fill(userEmail!);
      await targetPage.getByRole("textbox", { name: "Contraseña" }).fill(userPassword!);
      await targetPage.getByRole("button", { name: "Iniciar sesión" }).click();
      await expect(targetPage).toHaveURL(/\/dashboard$/);
    }

    const secondRefreshToken = await secondPage.evaluate(() => {
      const serialized = localStorage.getItem("auth_tokens");
      return serialized ? JSON.parse(serialized).refreshToken as string : null;
    });
    expect(secondRefreshToken).toBeTruthy();

    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.getByRole("button", { name: "Mi Perfil", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Mi Perfil" })).toBeVisible();
    await page.getByRole("button", { name: "Cerrar sesión en todos los dispositivos" }).click();
    await expect(page).toHaveURL(/\/login$/);

    const revokedRefresh = await page.request.post("/api/backend/Auth/refresh", {
      data: { refreshToken: secondRefreshToken },
    });
    expect(revokedRefresh.status()).toBe(401);
    await expect.poll(() => secondPage.evaluate(() => localStorage.getItem("auth_tokens"))).toBeTruthy();
    const secondSessionCheck = await secondPage.request.get("/api/backend/Auth/me", {
      headers: { Authorization: `Bearer ${await secondPage.evaluate(() => {
        const serialized = localStorage.getItem("auth_tokens");
        return serialized ? JSON.parse(serialized).accessToken as string : "";
      })}` },
    });
    expect(secondSessionCheck.status()).toBe(401);
  } finally {
    await secondContext.close();
  }
});

test("User cambia su contraseña desde Mi Perfil y vuelve a iniciar sesión", async ({ page }) => {
  test.skip(!userEmail || !userPassword, "El runner local/CI crea el usuario QA para validar autenticación.");

  const newPassword = `PwQA-${randomUUID()}aA1!`;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(userEmail!);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(userPassword!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const previousRefreshToken = await page.evaluate(() => {
    const serialized = localStorage.getItem("auth_tokens");
    return serialized ? JSON.parse(serialized).refreshToken as string : null;
  });
  expect(previousRefreshToken).toBeTruthy();

  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Mi Perfil", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mi Perfil" })).toBeVisible();
  await page.getByRole("button", { name: "Cambiar contraseña", exact: true }).first().click();
  const passwordForm = page.getByPlaceholder("Contraseña actual").locator("xpath=ancestor::form");
  await page.getByPlaceholder("Contraseña actual").fill(userPassword!);
  await page.getByRole("textbox", { name: "Nueva contraseña", exact: true }).fill(newPassword);
  await page.getByRole("textbox", { name: "Confirmar nueva contraseña", exact: true }).fill(newPassword);
  const changePasswordResponsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith("/api/backend/Auth/change-password") &&
    response.request().method() === "POST",
  );
  await passwordForm.getByRole("button", { name: "Cambiar contraseña", exact: true }).click();
  expect((await changePasswordResponsePromise).status()).toBe(200);
  await expect(page).toHaveURL(/\/login$/);

  const refreshAfterPasswordChange = await page.request.post("/api/backend/Auth/refresh", {
    data: { refreshToken: previousRefreshToken },
  });
  expect(refreshAfterPasswordChange.status()).toBe(401);
  const oldPasswordLogin = await page.request.post("/api/backend/Auth/login", {
    data: { email: userEmail, password: userPassword },
  });
  expect(oldPasswordLogin.status()).toBe(401);

  await page.getByLabel("Correo electrónico").fill(userEmail!);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(newPassword);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const newSessionToken = await page.evaluate(() => {
    const serialized = localStorage.getItem("auth_tokens");
    return serialized ? JSON.parse(serialized).accessToken as string : null;
  });
  expect(newSessionToken).toBeTruthy();
});

test("desactivar un usuario desde Equipo revoca su sesión y refresh token", async ({ page, browser }) => {
  test.skip(!email || !password || !deactivationUserEmail || !deactivationUserPassword || !allowMutations, "Requiere cuentas QA activas y base descartable.");

  await page.setViewportSize({ width: 390, height: 844 });
  const userContext = await browser.newContext();
  const userPage = await userContext.newPage();
  try {
    await userPage.goto("/login");
    await userPage.getByLabel("Correo electrónico").fill(deactivationUserEmail!);
    await userPage.getByRole("textbox", { name: "Contraseña" }).fill(deactivationUserPassword!);
    await userPage.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(userPage).toHaveURL(/\/dashboard$/);
    const userTokens = await userPage.evaluate(() => {
      const serialized = localStorage.getItem("auth_tokens");
      return serialized ? JSON.parse(serialized) as { accessToken: string; refreshToken: string } : null;
    });
    expect(userTokens?.refreshToken).toBeTruthy();

    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill(email!);
    await page.getByRole("textbox", { name: "Contraseña" }).fill(password!);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    const teamResponse = await page.request.get("/api/backend/Users/my-team", {
      headers: { Authorization: `Bearer ${await page.evaluate(() => {
        const serialized = localStorage.getItem("auth_tokens");
        return serialized ? JSON.parse(serialized).accessToken as string : "";
      })}` },
    });
    expect(teamResponse.status()).toBe(200);
    const member = (await teamResponse.json()).find((candidate: { email: string }) => candidate.email === deactivationUserEmail);
    expect(member?.id).toBeTruthy();

    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.getByRole("button", { name: "Gestión de Equipo", exact: true }).click();
    const memberCard = page.getByTestId(`team-user-${member.id}`);
    const deactivateResponse = page.waitForResponse((response) =>
      response.url().includes(`/api/backend/Users/${member.id}/status`) && response.request().method() === "PUT",
    );
    await memberCard.getByRole("button", { name: "Activo", exact: true }).click();
    expect((await deactivateResponse).status()).toBe(200);

    const rejectedRefresh = await page.request.post("/api/backend/Auth/refresh", {
      data: { refreshToken: userTokens!.refreshToken },
    });
    expect(rejectedRefresh.status()).toBe(401);
    const rejectedAccess = await page.request.get("/api/backend/Auth/me", {
      headers: { Authorization: `Bearer ${userTokens!.accessToken}` },
    });
    expect(rejectedAccess.status()).toBe(401);
  } finally {
    await userContext.close();
  }
});
