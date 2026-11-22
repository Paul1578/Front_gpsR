import { expect, test } from "@playwright/test";

const email = process.env.FLETFLOW_E2E_ADMIN_EMAIL;
const password = process.env.FLETFLOW_E2E_ADMIN_PASSWORD;

test("Admin busca miembros y conductores usando datos reales del equipo", async ({ page }) => {
  test.skip(!email || !password, "Requiere cuenta QA Admin.");

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
  const teamResponse = await page.request.get("/api/backend/Users/my-team", { headers });
  expect(teamResponse.status()).toBe(200);
  const teamUsers = await teamResponse.json() as Array<{ id: string; username: string }>;
  test.skip(teamUsers.length === 0, "La cuenta QA no tiene miembros cargados para buscar.");

  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Gestión de Equipo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Gestión de Equipo" })).toBeVisible();
  const teamSearch = page.getByRole("searchbox", { name: "Buscar miembros del equipo" });
  await teamSearch.fill(teamUsers[0].username);
  await expect(page.getByTestId(`team-user-${teamUsers[0].id}`)).toBeVisible();
  await teamSearch.fill("miembro-sin-coincidencias-fletflow");
  await expect(page.getByText("No hay miembros que coincidan con la búsqueda.")).toBeVisible();
  await teamSearch.fill("");
  await expect(page.getByTestId(`team-user-${teamUsers[0].id}`)).toBeVisible();

  const driversResponse = await page.request.get("/api/backend/Drivers?onlyActive=true", { headers });
  expect(driversResponse.status()).toBe(200);
  const drivers = await driversResponse.json() as Array<{ id: string; firstName: string; lastName: string; documentNumber: string }>;
  test.skip(drivers.length === 0, "La cuenta QA no tiene conductores activos para buscar.");

  await page.getByRole("button", { name: "Gestionar choferes" }).click();
  const driverSearch = page.getByRole("searchbox", { name: "Buscar choferes" });
  const driverCard = page.getByTestId(`team-driver-${drivers[0].id}`);
  await driverSearch.fill(drivers[0].documentNumber);
  await expect(driverCard).toBeVisible();
  await expect(driverCard).toContainText(`Doc: ${drivers[0].documentNumber}`);
  await driverSearch.fill("documento-sin-coincidencias-fletflow");
  await expect(page.getByText("No hay choferes que coincidan con la búsqueda")).toBeVisible();
  await driverSearch.fill("");
  await expect(driverCard).toBeVisible();

  await page.setViewportSize({ width: 320, height: 844 });
  const mobileDimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  expect(mobileDimensions.document).toBeLessThanOrEqual(mobileDimensions.viewport);
  await page.getByRole("button", { name: "Ocultar choferes" }).click();
  await teamSearch.fill(teamUsers[0].username);
  await expect(page.getByTestId(`team-user-${teamUsers[0].id}`)).toBeVisible();

  await page.setViewportSize({ width: 768, height: 1024 });
  const tabletDimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  expect(tabletDimensions.document).toBeLessThanOrEqual(tabletDimensions.viewport);
  await page.getByRole("button", { name: "Gestionar choferes" }).click();
  await driverSearch.fill(drivers[0].documentNumber);
  await expect(driverCard).toBeVisible();
  await expect(driverCard).toContainText(`Doc: ${drivers[0].documentNumber}`);
});
