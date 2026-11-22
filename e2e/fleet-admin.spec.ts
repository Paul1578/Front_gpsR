import { expect, test, type Locator } from "@playwright/test";

const email = process.env.FLETFLOW_E2E_ADMIN_EMAIL;
const password = process.env.FLETFLOW_E2E_ADMIN_PASSWORD;
const userEmail = process.env.FLETFLOW_E2E_USER_EMAIL;
const userPassword = process.env.FLETFLOW_E2E_USER_PASSWORD;
const driverEmail = process.env.FLETFLOW_E2E_DRIVER_EMAIL;
const driverPassword = process.env.FLETFLOW_E2E_DRIVER_PASSWORD;
const otherTenantEmail = process.env.FLETFLOW_E2E_OTHER_TENANT_EMAIL;
const otherTenantPassword = process.env.FLETFLOW_E2E_OTHER_TENANT_PASSWORD;
const driverIdFixture = process.env.FLETFLOW_E2E_DRIVER_ID;
const allowMutations = process.env.FLETFLOW_E2E_ALLOW_MUTATIONS === "true";

async function clickMapAwayFromMarkers(map: Locator) {
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

test("Admin navega el dashboard y rutas en tablet sin desbordamiento", async ({ page }) => {
  test.skip(!email || !password, "Requiere cuenta QA Admin.");

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email!);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(password!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("button", { name: "Dashboard Principal", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Gestión de Rutas", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Rutas", exact: true })).toBeVisible();

  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
});

test("Admin crea, edita y elimina un vehículo desde la UI móvil", async ({ page }) => {
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

  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9);
  const plate = `E2EQA${suffix}`;
  let vehicleId: string | undefined;

  try {
    await page.getByRole("button", { name: "Agregar Vehículo" }).click();
    const dialog = page.getByRole("dialog");
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

    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(widths.content).toBeLessThanOrEqual(widths.viewport);
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

    const cancelledResponse = await page.request.put(`/api/backend/Routes/${routeId}/status`, {
      headers,
      data: { status: 3 },
    });
    expect(cancelledResponse.status()).toBe(204);
    const cancelledRouteResponse = await page.request.get(`/api/backend/Routes/${routeId}`, { headers });
    expect(cancelledRouteResponse.status()).toBe(200);
    expect((await cancelledRouteResponse.json()).status).toBe(3);

    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.getByRole("button", { name: "Historial de Rutas", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Historial de Rutas" })).toBeVisible();
    await page.getByRole("button", { name: "Canceladas", exact: true }).click();
    const historyHeading = page.getByRole("heading", { name: updatedName, exact: true });
    await expect(historyHeading).toBeVisible();
    const historyCard = historyHeading.locator("xpath=../../../..");
    await expect(historyCard).toContainText("Cancelada");
    await historyCard.getByRole("button", { name: "Ver Detalles" }).click();
    const historyDialog = page.getByRole("dialog");
    await expect(historyDialog.getByRole("heading", { name: "Detalles de la Ruta" })).toBeVisible();
    await expect(historyDialog).toContainText(updatedName);
    await expect(historyDialog).toContainText("Cancelada");

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

test("Admin crea una ruta desde el mapa móvil y la elimina con confirmación", async ({ page }) => {
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
  const routeName = `E2E QA ruta mapa ${suffix}`;
  let vehicleId: string | undefined;
  let routeId: string | undefined;

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
    await page.getByRole("button", { name: "Nueva ruta", exact: true }).click();
    await page.getByPlaceholder("Ej. Entregas zona norte").fill(routeName);
    await page.getByPlaceholder("Productos, cantidad o instrucciones para el conductor").fill("Recogida y entrega de prueba E2E");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("heading", { name: "Construye el recorrido" })).toBeVisible();

    const map = page.locator(".leaflet-container");
    await page.getByRole("button", { name: "Seleccionando" }).waitFor();
    await clickMapAwayFromMarkers(map);
    const origin = page.getByPlaceholder("¿Desde dónde sale?");
    await expect(page.getByTestId("origin-point-0")).not.toContainText(/Ubicación pendiente|NaN/);
    await origin.fill("Origen E2E desde mapa");
    await page.getByRole("button", { name: "Agregar parada" }).click();
    await page.getByRole("button", { name: "Seleccionando" }).waitFor();
    await clickMapAwayFromMarkers(map);
    const stopOne = page.getByPlaceholder("Parada 1");
    await expect(page.getByTestId("stop-point-0")).not.toContainText(/Ubicación pendiente|NaN/);
    await stopOne.fill("Recogida E2E");
    await page.getByRole("combobox", { name: "Tipo de operación de la parada 1" }).selectOption("pickup");
    await page.getByRole("button", { name: "Agregar parada" }).click();
    await page.getByRole("button", { name: "Seleccionando" }).waitFor();
    await clickMapAwayFromMarkers(map);
    const stopTwo = page.getByPlaceholder("Parada 2");
    await expect(page.getByTestId("stop-point-1")).not.toContainText(/Ubicación pendiente|NaN/);
    await stopTwo.fill("Entrega y recogida E2E");
    await page.getByRole("combobox", { name: "Tipo de operación de la parada 2" }).selectOption("pickup_and_delivery");
    const destinationRow = page.getByPlaceholder("¿A dónde llega?").locator("xpath=../..");
    await destinationRow.getByRole("button", { name: "Ubicar" }).click();
    await page.getByRole("button", { name: "Seleccionando" }).waitFor();
    await clickMapAwayFromMarkers(map);
    const destination = page.getByPlaceholder("¿A dónde llega?");
    await expect(page.getByTestId("destination-point-0")).not.toContainText(/Ubicación pendiente|NaN/);
    await destination.fill("Destino E2E desde mapa");

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
    await page.getByRole("button", { name: "Crear ruta", exact: true }).click();
    const createResponse = await createRoutePromise;
    expect(createResponse.status()).toBe(201);
    routeId = (await createResponse.json()).id as string;

    const persistedResponse = await page.request.get(`/api/backend/Routes/${routeId}`, { headers });
    expect(persistedResponse.status()).toBe(200);
    const persistedRoute = await persistedResponse.json();
    expect(persistedRoute.name).toBe(routeName);
    const persistedPoints = persistedRoute.points as Array<{ name?: string; operation: number | string }>;
    expect(persistedPoints).toHaveLength(4);
    expect(persistedPoints.map((point) => point.name)).toEqual([
      "Origen E2E desde mapa",
      "Recogida E2E",
      "Entrega y recogida E2E",
      "Destino E2E desde mapa",
    ]);
    expect(persistedPoints.some((point) => point.operation === 1 || point.operation === "Pickup")).toBe(true);
    expect(persistedPoints.some((point) => point.operation === 3 || point.operation === "PickupAndDelivery")).toBe(true);

    const routeHeading = page.getByRole("heading", { name: routeName, exact: true });
    await expect(routeHeading).toBeVisible();
    const routeCard = routeHeading.locator("xpath=../../../..");
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
    if (routeId) await page.request.delete(`/api/backend/Routes/${routeId}`, { headers }).catch(() => undefined);
    if (vehicleId) await page.request.delete(`/api/backend/Vehicles/${vehicleId}`, { headers }).catch(() => undefined);
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

test("Logistics ve rutas pero no vehículos ni administración de equipo", async ({ page, browser }) => {
  test.skip(!email || !password || !driverEmail || !driverPassword || !driverIdFixture, "Requiere fixtures Admin y Driver del runner.");

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

  const promote = await page.request.put(`/api/backend/Users/${driver!.id}/role`, {
    headers,
    data: { roleName: "Logistics" },
  });
  expect(promote.status()).toBe(200);

  const logisticsContext = await browser.newContext();
  const logisticsPage = await logisticsContext.newPage();
  try {
    await logisticsPage.setViewportSize({ width: 390, height: 844 });
    await logisticsPage.goto("/login");
    await logisticsPage.getByLabel("Correo electrónico").fill(driverEmail!);
    await logisticsPage.getByRole("textbox", { name: "Contraseña" }).fill(driverPassword!);
    await logisticsPage.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(logisticsPage).toHaveURL(/\/dashboard$/);
    await logisticsPage.getByRole("button", { name: "Abrir menú" }).click();
    await expect(logisticsPage.getByRole("button", { name: "Gestión de Rutas", exact: true })).toBeVisible();
    await expect(logisticsPage.getByRole("button", { name: "Gestión de Vehículos", exact: true })).toHaveCount(0);
    await expect(logisticsPage.getByRole("button", { name: "Gestión de Equipo", exact: true })).toHaveCount(0);

    const logisticsToken = await logisticsPage.evaluate(() => {
      const serialized = localStorage.getItem("auth_tokens");
      return serialized ? JSON.parse(serialized).accessToken as string : null;
    });
    expect(logisticsToken).toBeTruthy();
    const logisticsHeaders = { Authorization: `Bearer ${logisticsToken}` };
    const [routesResponse, vehiclesResponse] = await Promise.all([
      logisticsPage.request.get("/api/backend/Routes", { headers: logisticsHeaders }),
      logisticsPage.request.get("/api/backend/Vehicles", { headers: logisticsHeaders }),
    ]);
    expect(routesResponse.status()).toBe(200);
    expect(vehiclesResponse.status()).toBe(403);
  } finally {
    await logisticsContext.close();
    await page.request.put(`/api/backend/Users/${driver!.id}/role`, {
      headers,
      data: { roleName: "Driver" },
    }).catch(() => undefined);
  }
});

test("Driver sólo ve su operación y la API protege recursos administrativos", async ({ page }) => {
  test.skip(!driverEmail || !driverPassword, "Requiere fixture Driver del runner.");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(driverEmail!);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(driverPassword!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
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

  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
});

test("un Admin de otra empresa no puede consultar ni modificar recursos de flota ajenos", async ({ page }) => {
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
    if (routeId) await page.request.delete(`/api/backend/Routes/${routeId}`, { headers: ownerHeaders }).catch(() => undefined);
    if (vehicleId) await page.request.delete(`/api/backend/Vehicles/${vehicleId}`, { headers: ownerHeaders }).catch(() => undefined);
  }
});

test("Admin crea un Driver desde Equipo y gestiona edición, baja y reactivación", async ({ page }) => {
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
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Gestión de Equipo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Gestión de Equipo" })).toBeVisible();

  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9);
  const firstName = `E2E QA ${suffix}`;
  const lastName = "Chofer UI";
  const emailAddress = `fletflow.e2e.driver.ui.${suffix}@example.test`;
  const documentNumber = `E2EQA${suffix}`;
  await page.getByRole("button", { name: "Crear Usuario" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("Juan").fill(firstName);
  await dialog.getByPlaceholder("Pérez").fill(lastName);
  await dialog.getByRole("textbox", { name: "jperez", exact: true }).fill(`e2e${suffix}`);
  await dialog.getByPlaceholder("jperez@empresa.com").fill(emailAddress);
  await dialog.getByPlaceholder("DNI / ID").fill(documentNumber);
  await dialog.getByPlaceholder("999999999").fill("0990000000");

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

  await page.getByRole("button", { name: "Gestionar choferes" }).click();
  const driverName = page.getByText(`${firstName} ${lastName}`, { exact: true });
  await expect(driverName).toBeVisible();
  const driverCard = driverName.locator("xpath=../..");
  await driverCard.getByRole("button", { name: "Editar" }).click();
  await page.getByRole("textbox", { name: "Nombres del conductor" }).fill(`${firstName} editado`);

  const updateDriverPromise = page.waitForResponse((response) =>
    response.url().includes(`/api/backend/Drivers/${driverId}`) &&
    response.request().method() === "PUT",
  );
  await driverCard.getByRole("button", { name: "Guardar cambios" }).click();
  expect((await updateDriverPromise).status()).toBe(200);
  const updatedDriver = await page.request.get(`/api/backend/Drivers/${driverId}`, { headers });
  expect(updatedDriver.status()).toBe(200);
  expect((await updatedDriver.json()).firstName).toBe(`${firstName} editado`);

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
    .getByRole("heading", { name: `e2e${suffix}`, exact: true })
    .locator("xpath=../../../..");
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

  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
});
