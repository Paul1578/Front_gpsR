import { expect, test, type Locator } from "@playwright/test";
import { randomUUID } from "node:crypto";

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
      headers: { Authorization: `Bearer ${await page.evaluate(() => JSON.parse(localStorage.getItem("auth_tokens") ?? "{}").accessToken)}` },
    });
    expect(vehicleAfterReactivation.status()).toBe(200);
    expect((await vehicleAfterReactivation.json()).isActive).toBe(true);
    await expect(page.locator(".grid > div").filter({ hasText: plate })).toContainText("FleetFlow QA Editado Browser test");

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
    await page.getByRole("button", { name: "Agregar parada" }).click();
    const temporaryStop = page.getByTestId("stop-point-2");
    await temporaryStop.getByRole("button", { name: "Eliminar parada" }).click();
    await expect(page.getByTestId("stop-point-2")).toHaveCount(0);
    await page.getByTestId("stop-point-1").getByRole("button", { name: "Subir parada" }).click();
    await expect(page.getByPlaceholder("Parada 1")).toHaveValue("Entrega y recogida E2E");
    await expect(page.getByPlaceholder("Parada 2")).toHaveValue("Recogida E2E");
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

test("Admin crea una ruta con parada operativa en tablet sin desbordamiento", async ({ page }) => {
  test.skip(!email || !password || !driverIdFixture || !allowMutations, "Requiere cuenta QA Admin y FLETFLOW_E2E_ALLOW_MUTATIONS=true.");

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
  const routeName = `E2E QA tablet ${suffix}`;
  let vehicleId: string | undefined;
  let routeId: string | undefined;
  const driverBeforeResponse = await page.request.get(`/api/backend/Drivers/${driverIdFixture}`, { headers });
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
    const vehicleResponse = await page.request.post("/api/backend/Vehicles", {
      headers,
      data: { plate: `E2EQA${suffix}`, brand: "FleetFlow QA", model: "Tablet route", year: 2025 },
    });
    expect(vehicleResponse.status()).toBe(201);
    vehicleId = (await vehicleResponse.json()).id as string;

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
    await page.getByRole("button", { name: "Seleccionando" }).waitFor();
    await clickMapAwayFromMarkers(map);
    await page.getByPlaceholder("Parada 1").fill("Recogida y entrega tablet QA");
    await page.getByRole("combobox", { name: "Tipo de operación de la parada 1" }).selectOption("pickup_and_delivery");
    const destinationRow = page.getByPlaceholder("¿A dónde llega?").locator("xpath=../..");
    await destinationRow.getByRole("button", { name: "Ubicar" }).click();
    await page.getByRole("button", { name: "Seleccionando" }).waitFor();
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
    await expect(page.getByText("Recogida y entrega tablet QA")).toBeVisible();
    await expectNoHorizontalOverflow();

    const createResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/backend/Routes") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Crear ruta", exact: true }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.status()).toBe(201);
    routeId = (await createResponse.json()).id as string;

    const persistedResponse = await page.request.get(`/api/backend/Routes/${routeId}`, { headers });
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
      const cleanupRoute = await page.request.delete(`/api/backend/Routes/${routeId}`, { headers }).catch(() => null);
      if (!cleanupRoute || ![200, 204, 404].includes(cleanupRoute.status())) {
        cleanupIssues.push(`No se pudo retirar la ruta tablet temporal: HTTP ${cleanupRoute?.status() ?? "sin respuesta"}`);
      }
    }
    if (vehicleId) {
      const currentDriverResponse = await page.request.get(`/api/backend/Drivers/${driverIdFixture}`, { headers }).catch(() => null);
      if (currentDriverResponse?.status() === 200) {
        const currentVehicleId = (await currentDriverResponse.json()).vehicleId as string | null;
        if (currentVehicleId === vehicleId) {
          const restoreAssignment = originalDriverVehicleId
            ? await page.request.put(`/api/backend/Drivers/${driverIdFixture}/assign-vehicle`, { headers, data: { vehicleId: originalDriverVehicleId } })
            : await page.request.put(`/api/backend/Drivers/${driverIdFixture}/unassign-vehicle`, { headers });
          if (restoreAssignment.status() !== 204) cleanupIssues.push(`No se pudo restaurar el vehículo anterior del Driver: HTTP ${restoreAssignment.status()}`);
        }
      } else {
        cleanupIssues.push(`No se pudo verificar la asignación del Driver: HTTP ${currentDriverResponse?.status() ?? "sin respuesta"}`);
      }
      const cleanupVehicle = await page.request.delete(`/api/backend/Vehicles/${vehicleId}`, { headers }).catch(() => null);
      if (!cleanupVehicle || ![200, 204, 404].includes(cleanupVehicle.status())) {
        cleanupIssues.push(`No se pudo retirar el vehículo tablet temporal: HTTP ${cleanupVehicle?.status() ?? "sin respuesta"}`);
      }
    }
    expect(cleanupIssues, "El cleanup tablet debe retirar ruta/vehículo y restaurar el Driver").toEqual([]);
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

test("API deniega mutaciones de flota y administración según el rol", async ({ page }) => {
  test.skip(
    !email || !password || !userEmail || !userPassword || !driverEmail || !driverPassword || !driverIdFixture || !allowMutations,
    "Requiere fixtures QA de Admin, User y Driver y FLETFLOW_E2E_ALLOW_MUTATIONS=true.",
  );

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

    await setFixtureRole("Manager");
    const managerHeaders = await login(driverEmail!, driverPassword!);
    await expectDenied("Manager", userAndRoleMutations(managerHeaders));
  } finally {
    await setFixtureRole("Driver");
  }
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
  test.skip(!email || !password || !driverEmail || !driverPassword || !driverIdFixture || !allowMutations, "Requiere fixtures Admin/Driver y FLETFLOW_E2E_ALLOW_MUTATIONS=true.");

  await page.setViewportSize({ width: 390, height: 844 });
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9);
  const adminLogin = await page.request.post("/api/backend/Auth/login", {
    data: { email, password },
  });
  expect(adminLogin.status()).toBe(200);
  const adminToken = await adminLogin.json();
  const adminHeaders = { Authorization: `Bearer ${adminToken.token ?? adminToken.accessToken}` };
  const plate = `E2EQA${suffix}`;
  const vehicleResponse = await page.request.post("/api/backend/Vehicles", {
    headers: adminHeaders,
    data: { plate, brand: "FleetFlow QA", model: "Driver route", year: 2025 },
  });
  expect(vehicleResponse.status()).toBe(201);
  const vehicleId = (await vehicleResponse.json()).id as string;
  const routeName = `E2E QA ruta conductor ${suffix}`;
  const routeResponse = await page.request.post("/api/backend/Routes", {
    headers: adminHeaders,
    data: {
      name: routeName,
      cargoDescription: "Prueba operativa Driver",
      vehicleId,
      driverId: driverIdFixture,
      points: [
        { lat: -0.18, lng: -78.46, name: "Origen E2E", operation: 0 },
        { lat: -0.19, lng: -78.47, name: "Entrega E2E", operation: 3 },
        { lat: -0.2, lng: -78.48, name: "Destino E2E", operation: 0 },
      ],
    },
  });
  expect(routeResponse.status()).toBe(201);
  const routeId = (await routeResponse.json()).id as string;

  try {
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

  await page.getByRole("button", { name: "Mi Ruta", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mi Ruta Activa" })).toBeVisible();
  await expect(page.getByText(routeName, { exact: true })).toBeVisible();
  const startRoutePromise = page.waitForResponse((response) =>
    response.url().includes(`/api/backend/Routes/${routeId}/status`) &&
    response.request().method() === "PUT",
  );
  await page.getByRole("button", { name: "Iniciar Ruta" }).click();
  expect((await startRoutePromise).status()).toBe(204);

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
  await evidenceDialog.getByRole("button", { name: "Nota" }).click();
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

  const completeRoutePromise = page.waitForResponse((response) =>
    response.url().includes(`/api/backend/Routes/${routeId}/status`) &&
    response.request().method() === "PUT",
  );
  await page.getByRole("button", { name: "Completar", exact: true }).click();
  expect((await completeRoutePromise).status()).toBe(204);
  await expect(page.getByRole("heading", { name: "No tienes rutas asignadas" })).toBeVisible();

  const persistedRoute = await page.request.get(`/api/backend/Routes/${routeId}`, { headers: adminHeaders });
  expect(persistedRoute.status()).toBe(200);
  expect((await persistedRoute.json()).status).toBe(2);
  const persistedVehicle = await page.request.get(`/api/backend/Vehicles/${vehicleId}`, { headers: adminHeaders });
  expect(persistedVehicle.status()).toBe(200);
  expect((await persistedVehicle.json()).status).toBe(0);

  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
  } finally {
    const cleanupRoute = await page.request.get(`/api/backend/Routes/${routeId}`, {
      headers: adminHeaders,
    });
    if (cleanupRoute.ok()) {
      const status = (await cleanupRoute.json()).status;
      if (status === 1 || status === "InProgress") {
        const cancelRoute = await page.request.put(`/api/backend/Routes/${routeId}/status`, {
          headers: adminHeaders,
          data: { status: 3 },
        });
        expect(cancelRoute.status()).toBe(204);
      }
      const deleteRoute = await page.request.delete(`/api/backend/Routes/${routeId}`, {
        headers: adminHeaders,
      });
      expect(deleteRoute.status()).toBe(204);
    }
  }
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

  await page.getByRole("button", { name: "Gestionar choferes" }).click();
  const driverName = page.getByText(`${firstName} ${lastName}`, { exact: true });
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
  const inactiveMemberAfterReload = page
    .getByRole("heading", { name: `e2e${suffix}`, exact: true })
    .locator("xpath=../../../..");
  await expect(inactiveMemberAfterReload.getByRole("button", { name: "Inactivo", exact: true })).toBeVisible();

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
    .getByRole("heading", { name: `user${suffix}`, exact: true })
    .locator("xpath=../../../..");
  const deactivateRegularUserPromise = page.waitForResponse((response) =>
    response.url().includes(`/api/backend/Users/${createdRegularUser.id}/status`) &&
    response.request().method() === "PUT",
  );
  await regularUserCard.getByRole("button", { name: "Activo", exact: true }).click();
  expect((await deactivateRegularUserPromise).status()).toBe(200);
  const inactiveRegularUsers = await page.request.get("/api/backend/Users/my-team", { headers });
  expect((await inactiveRegularUsers.json()).find((member: { id: string }) => member.id === createdRegularUser.id)?.isActive).toBe(false);

  const reactivateRegularUserPromise = page.waitForResponse((response) =>
    response.url().includes(`/api/backend/Users/${createdRegularUser.id}/status`) &&
    response.request().method() === "PUT",
  );
  await regularUserCard.getByRole("button", { name: "Inactivo", exact: true }).click();
  expect((await reactivateRegularUserPromise).status()).toBe(200);
  const activeRegularUsers = await page.request.get("/api/backend/Users/my-team", { headers });
  expect((await activeRegularUsers.json()).find((member: { id: string }) => member.id === createdRegularUser.id)?.isActive).toBe(true);

  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
});
