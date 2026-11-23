import { expect, readAccessToken, test } from "./fixtures";

const managerEmail = process.env.FLETFLOW_E2E_MANAGER_MAP_EMAIL;
const managerPassword = process.env.FLETFLOW_E2E_MANAGER_MAP_PASSWORD;
const routeDriverId = process.env.FLETFLOW_E2E_MAP_ROUTE_DRIVER_ID;
const fixtureSuffix = process.env.FLETFLOW_E2E_MAP_FIXTURE_SUFFIX?.toUpperCase();
const allowMutations = process.env.FLETFLOW_E2E_ALLOW_MUTATIONS === "true";

type RouteRecord = { id: string; name: string; vehicleId: string; vehiclePlate?: string; vehicleBrand?: string; vehicleModel?: string; isActive: boolean };
type VehicleRecord = { id: string; plate: string };
type DriverRecord = { id: string; vehicleId: string | null };

test("Manager selecciona ruta y vehículo reales en mapa desktop, tablet y móvil web", async ({ page, request }) => {
  test.skip(
    !managerEmail || !managerPassword || !routeDriverId || !fixtureSuffix || !allowMutations,
    "Requiere fixture dedicado Manager/Driver QA y API/MySQL descartables con FLETFLOW_E2E_ALLOW_MUTATIONS=true.",
  );

  test.setTimeout(90_000);
  page.setDefaultTimeout(8_000);
  // DELETE conserva la unicidad histórica de placas desactivadas; cada retry
  // necesita su propia placa para no chocar con el fixture del intento previo.
  const attemptSuffix = `${fixtureSuffix ?? "MISSING"}${Date.now().toString().slice(-4)}`;
  const routeName = `E2E QA ruta mapa Manager ${attemptSuffix}`;
  const vehiclePlate = `E2EQA${attemptSuffix}`;
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(managerEmail!);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(managerPassword!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const accessToken = await readAccessToken(page);
  expect(accessToken).toBeTruthy();
  const headers = { Authorization: `Bearer ${accessToken}` };
  let vehicleId: string | undefined;
  let routeId: string | undefined;
  const assertStatus = async (response: { status(): number; text(): Promise<string> }, expected: number, operation: string) => {
    const body = response.status() === expected ? "" : `: ${await response.text()}`;
    expect(response.status(), `${operation} respondió HTTP ${response.status()}${body}`).toBe(expected);
  };

  const removePriorAttempt = async () => {
    const routesResponse = await request.get("/api/backend/Routes", { headers });
    await assertStatus(routesResponse, 200, "Lectura de rutas para limpiar un retry previo");
    const oldRoutes = await routesResponse.json() as RouteRecord[];
    for (const route of oldRoutes.filter((item) => item.name === routeName)) {
      const deleted = await request.delete(`/api/backend/Routes/${route.id}`, { headers });
      expect([200, 204, 404]).toContain(deleted.status());
    }

    const driverResponse = await request.get(`/api/backend/Drivers/${routeDriverId}`, { headers });
    await assertStatus(driverResponse, 200, "Lectura de Driver QA para limpiar retry previo");
    const driver = await driverResponse.json() as DriverRecord;
    if (driver.vehicleId) {
      const unassigned = await request.put(`/api/backend/Drivers/${routeDriverId}/unassign-vehicle`, { headers });
      expect(unassigned.status()).toBe(204);
    }

    const vehiclesResponse = await request.get("/api/backend/Vehicles", { headers });
    await assertStatus(vehiclesResponse, 200, "Lectura de vehículos para limpiar retry previo");
    const oldVehicles = await vehiclesResponse.json() as VehicleRecord[];
    for (const vehicle of oldVehicles.filter((item) => item.plate === vehiclePlate)) {
      const deleted = await request.delete(`/api/backend/Vehicles/${vehicle.id}`, { headers });
      expect([200, 204, 404]).toContain(deleted.status());
    }
  };

  try {
    await removePriorAttempt();

    const managerVehiclesResponse = await request.get("/api/backend/Vehicles", { headers });
    await assertStatus(managerVehiclesResponse, 200, "GET de vehículos como Manager");
    const managerRoutesResponse = await request.get("/api/backend/Routes", { headers });
    await assertStatus(managerRoutesResponse, 200, "GET de rutas como Manager");

    const createdVehicleResponse = await request.post("/api/backend/Vehicles", {
      headers,
      data: { plate: vehiclePlate, brand: "FleetFlow QA", model: "Mapa Manager", year: 2025 },
    });
    await assertStatus(createdVehicleResponse, 201, "Creación de vehículo QA como Manager");
    const createdVehicle = await createdVehicleResponse.json() as VehicleRecord;
    vehicleId = createdVehicle.id;

    const createdRouteResponse = await request.post("/api/backend/Routes", {
      headers,
      data: {
        name: routeName,
        cargoDescription: "Ruta real para validar el mapa de Manager",
        vehicleId,
        driverId: routeDriverId,
        points: [
          { lat: -0.180653, lng: -78.467834, name: `Origen ${fixtureSuffix}`, operation: 0, status: 0 },
          { lat: -0.195, lng: -78.48, name: `Destino ${fixtureSuffix}`, operation: 0, status: 0 },
        ],
      },
    });
    await assertStatus(createdRouteResponse, 201, "Creación de ruta QA como Manager");
    const createdRoute = await createdRouteResponse.json() as RouteRecord;
    routeId = createdRoute.id;
    expect(createdRoute).toMatchObject({ name: routeName, vehicleId, isActive: true });

    const persistedVehicleResponse = await request.get(`/api/backend/Vehicles/${vehicleId}`, { headers });
    await assertStatus(persistedVehicleResponse, 200, "Lectura persistida del vehículo QA");
    expect(await persistedVehicleResponse.json()).toMatchObject({ id: vehicleId, plate: vehiclePlate });
    const persistedRouteResponse = await request.get(`/api/backend/Routes/${routeId}`, { headers });
    await assertStatus(persistedRouteResponse, 200, "Lectura persistida de la ruta QA");
    expect(await persistedRouteResponse.json()).toMatchObject({ id: routeId, name: routeName, vehicleId });

    let osrmRequests = 0;
    await page.route("https://router.project-osrm.org/**", async (route) => {
      osrmRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          code: "Ok",
          routes: [{
            geometry: {
              type: "LineString",
              // El punto intermedio permite verificar que el mapa dibujó la
              // geometría de carretera recibida, no sólo la línea directa.
              coordinates: [
                [-78.467834, -0.180653],
                [-78.473, -0.184],
                [-78.48, -0.195],
              ],
            },
          }],
        }),
      });
    });
    const routesRead = page.waitForResponse((response) =>
      new URL(response.url()).pathname.endsWith("/api/backend/Routes") && response.request().method() === "GET",
    );
    await page.getByRole("button", { name: "Mapa en Tiempo Real", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Mapa de rutas" })).toBeVisible();
    const browserRoutesResponse = await routesRead;
    await assertStatus(browserRoutesResponse, 200, "Carga de rutas del mapa en sesión Manager");
    const browserRoutes = await browserRoutesResponse.json() as RouteRecord[];
    expect(browserRoutes.some((route) => route.id === routeId && route.vehicleId === vehicleId)).toBe(true);

    const map = page.locator(".leaflet-container");
    await expect(map).toBeVisible();
    await expect.poll(() => osrmRequests).toBeGreaterThan(0);
    const routeList = page.locator("aside").filter({ hasText: "Rutas planificadas" });
    const routeButton = routeList.getByRole("button").filter({ hasText: routeName });
    await expect(routeButton).toBeVisible();
    await routeButton.click();
    await expect(page.getByText("Trayecto por carretera calculado.", { exact: true })).toBeVisible();
    const selectedSummary = page.getByText("Ruta seleccionada", { exact: true }).locator("..");
    await expect(selectedSummary).toContainText(routeName);
    await expect(selectedSummary).toContainText(`Vehículo: ${vehiclePlate} · FleetFlow QA Mapa Manager`);
    await expect.poll(() => map.locator(".leaflet-marker-icon").count()).toBeGreaterThanOrEqual(4);
    await expect(routeButton).toContainText(`Vehículo: ${vehiclePlate} · FleetFlow QA Mapa Manager`);

    for (const viewport of [
      { name: "desktop", width: 1365, height: 900 },
      { name: "tablet", width: 768, height: 1024 },
      { name: "móvil web", width: 390, height: 844 },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await expect(map).toBeVisible();
      await expect(selectedSummary).toContainText(routeName);
      await expect(selectedSummary).toContainText(`Vehículo: ${vehiclePlate} · FleetFlow QA Mapa Manager`);
      await expect(routeButton).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        main: document.querySelector("main")?.clientWidth ?? 0,
        mainContent: document.querySelector("main")?.scrollWidth ?? 0,
      }));
      expect(dimensions.document, `desbordamiento horizontal en ${viewport.name}`).toBeLessThanOrEqual(dimensions.viewport);
      expect(dimensions.mainContent, `contenido de main desbordado en ${viewport.name}`).toBeLessThanOrEqual(dimensions.main);
    }
  } finally {
    await removePriorAttempt();
    if (routeId) {
      const deleted = await request.delete(`/api/backend/Routes/${routeId}`, { headers });
      expect([200, 204, 404]).toContain(deleted.status());
    }
    if (routeDriverId) {
      const driverResponse = await request.get(`/api/backend/Drivers/${routeDriverId}`, { headers });
      if (driverResponse.ok() && (await driverResponse.json() as DriverRecord).vehicleId) {
        const unassigned = await request.put(`/api/backend/Drivers/${routeDriverId}/unassign-vehicle`, { headers });
        expect(unassigned.status()).toBe(204);
      }
    }
    if (vehicleId) {
      const deleted = await request.delete(`/api/backend/Vehicles/${vehicleId}`, { headers });
      expect([200, 204, 404]).toContain(deleted.status());
    }
  }
});
