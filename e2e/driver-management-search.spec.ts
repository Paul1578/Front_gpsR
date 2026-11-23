import { expect, readAccessToken, test } from "./fixtures";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";

const email = process.env.FLETFLOW_E2E_ADMIN_EMAIL;
const password = process.env.FLETFLOW_E2E_ADMIN_PASSWORD;
let createdDriverIds: string[] = [];
let createdVehicleId: string | undefined;
let accessToken: string | undefined;

test.afterEach(async ({ page }) => {
  if (!accessToken) return;
  for (const driverId of createdDriverIds) {
    const currentDriver = await page.request.get(`/api/backend/Drivers/${driverId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!currentDriver.ok()) continue;
    const driver = await currentDriver.json() as { vehicleId?: string | null; isActive?: boolean };
    if (driver.vehicleId) {
      const unassign = await page.request.put(`/api/backend/Drivers/${driverId}/unassign-vehicle`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(unassign.status()).toBe(204);
    }
    if (driver.isActive !== false) {
      const cleanup = await page.request.put(`/api/backend/Drivers/${driverId}/status`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: { isActive: false },
      });
      expect(cleanup.status()).toBe(204);
    }
  }
  createdDriverIds = [];
  if (createdVehicleId) {
    const deleteVehicle = await page.request.delete(`/api/backend/Vehicles/${createdVehicleId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(deleteVehicle.status()).toBe(204);
    createdVehicleId = undefined;
  }
  accessToken = undefined;
});

test("Admin busca conductores en la pantalla operativa a 320 y 768 px", async ({ page }) => {
  test.skip(!email || !password, "Requiere cuenta QA Admin.");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email!);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(password!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  accessToken = await readAccessToken(page);
  expect(accessToken).toBeTruthy();
  const headers = { Authorization: `Bearer ${accessToken}` };
  const documentNumber = `E2E${randomUUID().replaceAll("-", "").slice(0, 17)}`;
  const created = await page.request.post("/api/backend/Drivers", {
    headers,
    data: {
      firstName: "QA Búsqueda",
      lastName: "Temporal",
      documentNumber,
      phoneNumber: "0990000000",
    },
  });
  expect(created.status()).toBe(201);
  const driver = await created.json() as { id: string; documentNumber: string };
  createdDriverIds.push(driver.id);

  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Gestión de Conductores", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Gestión de Conductores" })).toBeVisible();
  const search = page.getByRole("searchbox", { name: "Buscar conductores" });
  const result = page.getByTestId(`managed-driver-${driver.id}`);

  await page.setViewportSize({ width: 320, height: 844 });
  await search.fill(driver.documentNumber);
  await expect(result).toBeVisible();
  await expect(result).toContainText(driver.documentNumber);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await search.fill("conductor-sin-coincidencias-fletflow");
  await expect(page.getByText("No hay conductores que coincidan con la búsqueda.")).toBeVisible();
  await search.fill("");
  await expect(result).toBeVisible();

  await page.setViewportSize({ width: 768, height: 1024 });
  await search.fill(driver.documentNumber);
  await expect(result).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("Admin gestiona un conductor desde la pantalla dedicada a 320 y 768 px", async ({ page }) => {
  test.skip(!email || !password, "Requiere cuenta QA Admin.");

  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email!);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(password!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  accessToken = await readAccessToken(page);
  expect(accessToken).toBeTruthy();
  const headers = { Authorization: `Bearer ${accessToken}` };

  const suffix = randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
  const vehiclePlate = `E2EQA${suffix}V`;
  const vehicleResponse = await page.request.post("/api/backend/Vehicles", {
    headers,
    data: { plate: vehiclePlate, brand: "QA", model: "Responsive", year: 2025 },
  });
  expect(vehicleResponse.status()).toBe(201);
  createdVehicleId = (await vehicleResponse.json() as { id: string }).id;

  // Refresh FleetContext so the selector sees the vehicle provisioned after login.
  await page.reload();
  await expect(page.getByRole("button", { name: "Abrir menú" })).toBeVisible();
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Gestión de Conductores", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Gestión de Conductores" })).toBeVisible();

  const documentNumber = `E2EQA${suffix}D`;
  await page.getByLabel("Nombres del conductor").fill("QA Responsive");
  await page.getByLabel("Apellidos del conductor").fill("Temporal");
  await page.getByLabel("Documento del conductor").fill(documentNumber);
  await page.getByLabel("Teléfono del conductor").fill("0990000000");
  const form = page.getByRole("heading", { name: "Registrar conductor" }).locator("xpath=..");
  await expect(form).toBeVisible();
  const mobileFormBounds = await form.boundingBox();
  expect(mobileFormBounds).not.toBeNull();
  expect(mobileFormBounds!.x).toBeGreaterThanOrEqual(0);
  expect(mobileFormBounds!.x + mobileFormBounds!.width).toBeLessThanOrEqual(320);
  const createDriverResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" && new URL(response.url()).pathname.endsWith("/Drivers"),
  );
  await page.getByRole("button", { name: "Crear conductor" }).click();
  const createDriverResponse = await createDriverResponsePromise;
  expect(createDriverResponse.status()).toBe(201);

  const driversResponse = await page.request.get("/api/backend/Drivers", { headers });
  expect(driversResponse.status()).toBe(200);
  const persistedDrivers = await driversResponse.json() as { id: string; documentNumber: string }[];
  const createdDriver = persistedDrivers.find((driver) => driver.documentNumber === documentNumber);
  expect(createdDriver).toBeTruthy();
  const createdDriverId = createdDriver!.id;
  createdDriverIds.push(createdDriverId);
  const driverCard = page.getByTestId(`managed-driver-${createdDriverId}`);
  await expect(driverCard).toBeVisible();

  await driverCard.getByRole("button", { name: "Editar" }).click();
  await page.getByLabel("Apellidos del conductor").fill("Editado en móvil");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(driverCard).toContainText("Editado en móvil");
  const updatedDriver = await page.request.get(`/api/backend/Drivers/${createdDriverId}`, { headers });
  expect(updatedDriver.status()).toBe(200);
  expect((await updatedDriver.json()).lastName).toBe("Editado en móvil");

  await expect(driverCard.getByRole("option", { name: new RegExp(vehiclePlate) })).toBeAttached();
  await driverCard.getByLabel("Vehículo para QA Responsive").selectOption(createdVehicleId!);
  const assignmentResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "PUT" &&
    new URL(response.url()).pathname.endsWith(`/Drivers/${createdDriverId}/assign-vehicle`),
  );
  await driverCard.getByRole("button", { name: "Asignar" }).click();
  const assignmentResponse = await assignmentResponsePromise;
  expect(assignmentResponse.status(), await assignmentResponse.text()).toBe(204);
  await expect(driverCard).toContainText(vehiclePlate);
  const apiOrigin = (process.env.FLETFLOW_API_URL ?? "http://127.0.0.1:5048").replace(/\/api\/?$/, "").replace(/\/$/, "");
  if (process.env.DB_NAME) {
    const persistedVehicleId = execFileSync("mysql", [
      "--protocol=TCP",
      "--host", process.env.MYSQL_HOST ?? process.env.DB_HOST ?? "127.0.0.1",
      "--port", process.env.MYSQL_PORT ?? process.env.DB_PORT ?? "3306",
      "--user", process.env.MYSQL_USER ?? process.env.DB_USER ?? "root",
      process.env.DB_NAME,
      "--batch",
      "--skip-column-names",
      "-e",
      `SELECT COALESCE(CAST(VehicleId AS CHAR), 'NULL') FROM Drivers WHERE Id='${createdDriverId}';`,
    ], {
      encoding: "utf8",
      env: { ...process.env, MYSQL_PWD: process.env.MYSQL_PWD ?? process.env.DB_PASSWORD ?? "" },
    }).trim();
    expect(persistedVehicleId, "MySQL debe persistir la asignación antes de que el API responda 204").toBe(createdVehicleId);
  }
  const assignedDriverDirect = await page.request.get(`${apiOrigin}/api/Drivers/${createdDriverId}`, { headers });
  expect(assignedDriverDirect.status()).toBe(200);
  expect((await assignedDriverDirect.json()).vehicleId).toBe(createdVehicleId);
  const assignedDriverThroughFrontend = await page.request.get(`/api/backend/Drivers/${createdDriverId}`, { headers });
  expect(assignedDriverThroughFrontend.status()).toBe(200);
  expect((await assignedDriverThroughFrontend.json()).vehicleId).toBe(createdVehicleId);

  await driverCard.getByRole("button", { name: "Quitar" }).click();
  await expect(driverCard).toContainText("Sin vehículo asignado");
  const unassignedDriver = await page.request.get(`/api/backend/Drivers/${createdDriverId}`, { headers });
  expect((await unassignedDriver.json()).vehicleId).toBeNull();

  await page.setViewportSize({ width: 768, height: 1024 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  let statusMutations = 0;
  page.on("request", (request) => {
    if (request.method() === "PUT" && new URL(request.url()).pathname.endsWith(`/Drivers/${createdDriverId}/status`)) {
      statusMutations += 1;
    }
  });
  await driverCard.getByRole("button", { name: "Dar de baja" }).click();
  const deactivateDialog = page.getByRole("alertdialog");
  await expect(deactivateDialog.getByRole("heading", { name: "Confirmar baja del conductor" })).toBeVisible();
  await deactivateDialog.getByRole("button", { name: "Mantener activo" }).click();
  expect(statusMutations, "Cancelar la baja no debe llamar a la API").toBe(0);
  await expect(driverCard).toContainText("Activo");

  await driverCard.getByRole("button", { name: "Dar de baja" }).click();
  const deactivateResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "PUT" && new URL(response.url()).pathname.endsWith(`/Drivers/${createdDriverId}/status`),
  );
  await page.getByRole("alertdialog").getByRole("button", { name: "Sí, dar de baja" }).click();
  expect((await deactivateResponsePromise).status()).toBe(204);
  await expect(driverCard).not.toBeVisible();
  const inactiveDriver = await page.request.get(`/api/backend/Drivers/${createdDriverId}`, { headers });
  expect(inactiveDriver.status()).toBe(200);
  expect((await inactiveDriver.json()).isActive).toBe(false);

  await page.getByRole("button", { name: "Mostrar bajas" }).click();
  await expect(driverCard).toContainText("Inactivo");
  const reactivateResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "PUT" && new URL(response.url()).pathname.endsWith(`/Drivers/${createdDriverId}/status`),
  );
  await driverCard.getByRole("button", { name: "Reactivar" }).click();
  expect((await reactivateResponsePromise).status()).toBe(204);
  await expect(driverCard).toContainText("Activo");

  const persistedDriver = await page.request.get(`/api/backend/Drivers/${createdDriverId}`, { headers });
  expect(persistedDriver.status()).toBe(200);
  expect((await persistedDriver.json()).isActive).toBe(true);

  const tabletDocument = `E2EQA${suffix}T`;
  await page.getByLabel("Nombres del conductor").fill("QA Tablet");
  await page.getByLabel("Apellidos del conductor").fill("Operaciones");
  await page.getByLabel("Documento del conductor").fill(tabletDocument);
  await page.getByLabel("Teléfono del conductor").fill("0990000001");
  const tabletForm = page.getByRole("heading", { name: "Registrar conductor" }).locator("xpath=..");
  const tabletBounds = await tabletForm.boundingBox();
  expect(tabletBounds).not.toBeNull();
  expect(tabletBounds!.x).toBeGreaterThanOrEqual(0);
  expect(tabletBounds!.x + tabletBounds!.width).toBeLessThanOrEqual(768);
  const createTabletDriverPromise = page.waitForResponse((response) =>
    response.request().method() === "POST" && new URL(response.url()).pathname.endsWith("/Drivers"),
  );
  await page.getByRole("button", { name: "Crear conductor" }).click();
  expect((await createTabletDriverPromise).status()).toBe(201);
  const tabletDriversResponse = await page.request.get("/api/backend/Drivers", { headers });
  expect(tabletDriversResponse.status()).toBe(200);
  const tabletDrivers = await tabletDriversResponse.json() as { id: string; documentNumber: string }[];
  const tabletDriver = tabletDrivers.find((item) => item.documentNumber === tabletDocument);
  expect(tabletDriver).toBeTruthy();
  createdDriverIds.push(tabletDriver!.id);
  const tabletCard = page.getByTestId(`managed-driver-${tabletDriver!.id}`);
  await expect(tabletCard).toBeVisible();
  await tabletCard.getByRole("button", { name: "Editar" }).click();
  await page.getByLabel("Apellidos del conductor").fill("Editado en tablet");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(tabletCard).toContainText("Editado en tablet");
  const tabletDriverDetail = await page.request.get(`/api/backend/Drivers/${tabletDriver!.id}`, { headers });
  expect((await tabletDriverDetail.json()).lastName).toBe("Editado en tablet");
  await tabletCard.getByLabel("Vehículo para QA Tablet").selectOption(createdVehicleId!);
  const assignTabletResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "PUT" && new URL(response.url()).pathname.endsWith(`/Drivers/${tabletDriver!.id}/assign-vehicle`),
  );
  await tabletCard.getByRole("button", { name: "Asignar" }).click();
  expect((await assignTabletResponsePromise).status()).toBe(204);
  await expect(tabletCard).toContainText(vehiclePlate);
  const assignedTabletDriver = await page.request.get(`/api/backend/Drivers/${tabletDriver!.id}`, { headers });
  expect((await assignedTabletDriver.json()).vehicleId).toBe(createdVehicleId);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
