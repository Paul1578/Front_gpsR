import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

const adminEmail = process.env.FLETFLOW_E2E_ADMIN_EMAIL;
const adminPassword = process.env.FLETFLOW_E2E_ADMIN_PASSWORD;
const managerEmail = process.env.FLETFLOW_E2E_DRIVER_EMAIL;
const managerPassword = process.env.FLETFLOW_E2E_DRIVER_PASSWORD;
const managerDriverId = process.env.FLETFLOW_E2E_DRIVER_ID;
const routeDriverId = process.env.FLETFLOW_E2E_ROUTE_DRIVER_ID;
const allowMutations = process.env.FLETFLOW_E2E_ALLOW_MUTATIONS === "true";

type AuthTokens = { accessToken: string };
type RouteRecord = { id: string; name: string; vehicleId: string; isActive: boolean };
type VehicleRecord = { id: string; plate: string };
type DriverRecord = { id: string; vehicleId: string | null };

test("Manager selecciona y visualiza ruta y vehículo de API en desktop, tablet y móvil web", async ({ browser, page, request }) => {
  test.skip(
    !adminEmail || !adminPassword || !managerEmail || !managerPassword || !managerDriverId || !routeDriverId || !allowMutations,
    "Requiere fixtures Admin/Driver QA, Driver de ruta y API/MySQL descartables con FLETFLOW_E2E_ALLOW_MUTATIONS=true.",
  );

  test.setTimeout(90_000);
  page.setDefaultTimeout(8_000);

  const suffix = randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
  const routeName = `E2E QA ruta mapa Manager ${suffix}`;
  const routeEmail = managerEmail!;
  let vehicleId: string | undefined;
  let routeId: string | undefined;
  let managerUserId: string | undefined;
  let originalRouteDriverVehicleId: string | null | undefined;
  let roleChanged = false;

  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(adminEmail!);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(adminPassword!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const adminToken = await page.evaluate(() => {
    const serialized = localStorage.getItem("auth_tokens");
    return serialized ? (JSON.parse(serialized) as AuthTokens).accessToken : null;
  });
  expect(adminToken).toBeTruthy();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  const assertStatus = async (response: { status(): number; text(): Promise<string> }, expected: number, operation: string) => {
    const body = response.status() === expected ? "" : `: ${await response.text()}`;
    expect(response.status(), `${operation} respondió HTTP ${response.status()}${body}`).toBe(expected);
  };

  try {
    const teamResponse = await request.get("/api/backend/Users/my-team", { headers: adminHeaders });
    await assertStatus(teamResponse, 200, "Consulta de equipo para ubicar el fixture Driver");
    const team = await teamResponse.json() as Array<{ id: string; driverId?: string; roles?: string[] }>;
    const managerFixture = team.find((member) => member.driverId === managerDriverId);
    expect(managerFixture, "El Driver QA debe pertenecer al equipo de la cuenta Admin").toBeTruthy();
    expect(managerFixture!.roles).toContain("Driver");
    managerUserId = managerFixture!.id;

    const roleResponse = await request.put(`/api/backend/Users/${managerUserId}/role`, {
      headers: adminHeaders,
      data: { roleName: "Manager" },
    });
    await assertStatus(roleResponse, 200, "Asignación temporal de rol Manager");
    roleChanged = true;

    const routeDriverResponse = await request.get(`/api/backend/Drivers/${routeDriverId}`, { headers: adminHeaders });
    await assertStatus(routeDriverResponse, 200, "Lectura del Driver QA de ruta");
    originalRouteDriverVehicleId = (await routeDriverResponse.json() as DriverRecord).vehicleId;

    const managerContext = await browser.newContext({ viewport: { width: 1365, height: 900 } });
    const managerPage = await managerContext.newPage();
    try {
      await managerPage.goto("/login");
      await managerPage.getByLabel("Correo electrónico").fill(routeEmail);
      await managerPage.getByRole("textbox", { name: "Contraseña" }).fill(managerPassword!);
      await managerPage.getByRole("button", { name: "Iniciar sesión" }).click();
      await expect(managerPage).toHaveURL(/\/dashboard$/);

      const managerToken = await managerPage.evaluate(() => {
        const serialized = localStorage.getItem("auth_tokens");
        return serialized ? (JSON.parse(serialized) as AuthTokens).accessToken : null;
      });
      expect(managerToken).toBeTruthy();
      const managerHeaders = { Authorization: `Bearer ${managerToken}` };

      const managerVehiclesResponse = await request.get("/api/backend/Vehicles", { headers: managerHeaders });
      await assertStatus(managerVehiclesResponse, 200, "GET de vehículos como Manager");
      const managerRoutesResponse = await request.get("/api/backend/Routes", { headers: managerHeaders });
      await assertStatus(managerRoutesResponse, 200, "GET de rutas como Manager");

      const createdVehicleResponse = await request.post("/api/backend/Vehicles", {
        headers: managerHeaders,
        data: {
          plate: `E2EQA${suffix}`,
          brand: "FleetFlow QA",
          model: "Mapa Manager",
          year: 2025,
        },
      });
      await assertStatus(createdVehicleResponse, 201, "Creación del vehículo QA como Manager");
      const createdVehicle = await createdVehicleResponse.json() as VehicleRecord;
      vehicleId = createdVehicle.id;
      expect(vehicleId).toBeTruthy();

      const createdRouteResponse = await request.post("/api/backend/Routes", {
        headers: managerHeaders,
        data: {
          name: routeName,
          cargoDescription: "Ruta real para validar el mapa de Manager",
          vehicleId,
          driverId: routeDriverId,
          points: [
            { lat: -0.180653, lng: -78.467834, name: `Origen ${suffix}`, operation: 0, status: 0 },
            { lat: -0.195, lng: -78.48, name: `Destino ${suffix}`, operation: 0, status: 0 },
          ],
        },
      });
      await assertStatus(createdRouteResponse, 201, "Creación de ruta QA como Manager");
      const createdRoute = await createdRouteResponse.json() as RouteRecord;
      routeId = createdRoute.id;
      expect(createdRoute).toMatchObject({ id: expect.any(String), name: routeName, vehicleId, isActive: true });

      const persistedVehicleResponse = await request.get(`/api/backend/Vehicles/${vehicleId}`, { headers: managerHeaders });
      await assertStatus(persistedVehicleResponse, 200, "Lectura del vehículo QA como Manager");
      const persistedVehicle = await persistedVehicleResponse.json() as VehicleRecord;
      expect(persistedVehicle).toMatchObject({ id: vehicleId, plate: `E2EQA${suffix}` });

      const persistedRouteResponse = await request.get(`/api/backend/Routes/${routeId}`, { headers: managerHeaders });
      await assertStatus(persistedRouteResponse, 200, "Lectura de la ruta QA como Manager");
      expect(await persistedRouteResponse.json()).toMatchObject({ id: routeId, name: routeName, vehicleId });

      // OSRM sólo aporta geometría vial opcional; mantener el fallback determinista.
      await managerPage.route("https://router.project-osrm.org/**", async (route) => {
        await route.fulfill({ status: 503, body: "OSRM no disponible para la prueba" });
      });
      await managerPage.getByRole("button", { name: "Abrir menú" }).click();
      await expect(managerPage.getByRole("button", { name: "Mapa en Tiempo Real", exact: true })).toBeVisible();

      const routesRead = managerPage.waitForResponse((response) =>
        new URL(response.url()).pathname.endsWith("/api/backend/Routes") && response.request().method() === "GET",
      );
      await managerPage.getByRole("button", { name: "Mapa en Tiempo Real", exact: true }).click();
      await expect(managerPage.getByRole("heading", { name: "Mapa de rutas" })).toBeVisible();
      const browserRoutesResponse = await routesRead;
      await assertStatus(browserRoutesResponse, 200, "Carga de rutas del mapa en sesión Manager");
      const browserRoutes = await browserRoutesResponse.json() as RouteRecord[];
      expect(browserRoutes.some((route) => route.id === routeId && route.vehicleId === vehicleId)).toBe(true);

      const map = managerPage.locator(".leaflet-container");
      await expect(map).toBeVisible();
      const routeList = managerPage.locator("aside").filter({ hasText: "Rutas planificadas" });
      const routeButton = routeList.getByRole("button").filter({ hasText: routeName });
      await expect(routeButton).toBeVisible();
      await routeButton.click();

      const selectedSummary = managerPage.getByText("Ruta seleccionada", { exact: true }).locator("..");
      await expect(selectedSummary).toContainText(routeName);
      await expect(selectedSummary).toContainText(`Vehículo: ${vehicleId!.slice(0, 8)}…`);
      expect(await map.locator(".leaflet-marker-icon").count()).toBeGreaterThanOrEqual(4);
      await expect(routeButton).toContainText(`Vehículo: ${vehicleId!.slice(0, 8)}…`);

      for (const viewport of [
        { name: "desktop", width: 1365, height: 900 },
        { name: "tablet", width: 768, height: 1024 },
        { name: "móvil web", width: 390, height: 844 },
      ]) {
        await managerPage.setViewportSize({ width: viewport.width, height: viewport.height });
        await expect(map).toBeVisible();
        await expect(selectedSummary).toContainText(routeName);
        await expect(selectedSummary).toContainText(`Vehículo: ${vehicleId!.slice(0, 8)}…`);
        await expect(routeButton).toBeVisible();
        const dimensions = await managerPage.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          document: document.documentElement.scrollWidth,
          main: document.querySelector("main")?.clientWidth ?? 0,
          mainContent: document.querySelector("main")?.scrollWidth ?? 0,
        }));
        expect(dimensions.document, `desbordamiento horizontal en ${viewport.name}`).toBeLessThanOrEqual(dimensions.viewport);
        expect(dimensions.mainContent, `contenido de main desbordado en ${viewport.name}`).toBeLessThanOrEqual(dimensions.main);
      }

      await managerContext.close();
    } finally {
      await managerContext.close().catch(() => undefined);
    }
  } finally {
    const cleanupFailures: string[] = [];
    if (routeId) {
      const deleteRoute = await request.delete(`/api/backend/Routes/${routeId}`, { headers: adminHeaders }).catch(() => null);
      if (!deleteRoute || ![200, 204, 404].includes(deleteRoute.status())) {
        cleanupFailures.push(`No se pudo limpiar la ruta ${routeId}: HTTP ${deleteRoute?.status() ?? "sin respuesta"}`);
      }
    }
    if (originalRouteDriverVehicleId !== undefined) {
      const currentDriver = await request.get(`/api/backend/Drivers/${routeDriverId}`, { headers: adminHeaders }).catch(() => null);
      if (!currentDriver || currentDriver.status() !== 200) {
        cleanupFailures.push(`No se pudo verificar la asignación original del Driver QA: HTTP ${currentDriver?.status() ?? "sin respuesta"}`);
      } else {
        const currentVehicleId = (await currentDriver.json() as DriverRecord).vehicleId;
        if (currentVehicleId !== originalRouteDriverVehicleId) {
          const restoreAssignment = originalRouteDriverVehicleId
            ? await request.put(`/api/backend/Drivers/${routeDriverId}/assign-vehicle`, {
                headers: adminHeaders,
                data: { vehicleId: originalRouteDriverVehicleId },
              }).catch(() => null)
            : await request.put(`/api/backend/Drivers/${routeDriverId}/unassign-vehicle`, { headers: adminHeaders }).catch(() => null);
          if (!restoreAssignment || restoreAssignment.status() !== 204) {
            cleanupFailures.push(`No se pudo restaurar el vehículo original del Driver QA: HTTP ${restoreAssignment?.status() ?? "sin respuesta"}`);
          }
        }
      }
    }
    if (vehicleId) {
      const deleteVehicle = await request.delete(`/api/backend/Vehicles/${vehicleId}`, { headers: adminHeaders }).catch(() => null);
      if (!deleteVehicle || ![200, 204, 404].includes(deleteVehicle.status())) {
        cleanupFailures.push(`No se pudo limpiar el vehículo ${vehicleId}: HTTP ${deleteVehicle?.status() ?? "sin respuesta"}`);
      }
    }
    if (roleChanged) {
      const restoreRole = await request.put(`/api/backend/Users/${managerUserId}/role`, {
        headers: adminHeaders,
        data: { roleName: "Driver" },
      }).catch(() => null);
      if (!restoreRole || restoreRole.status() !== 200) {
        cleanupFailures.push(`No se pudo restaurar el rol Driver: HTTP ${restoreRole?.status() ?? "sin respuesta"}`);
      }
    }
    expect(cleanupFailures, cleanupFailures.join("\n")).toEqual([]);
  }
});
