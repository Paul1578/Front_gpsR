import { expect, readAccessToken, test } from "./fixtures";

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

  const token = await readAccessToken(page);
  expect(token).toBeTruthy();
  const headers = { Authorization: `Bearer ${token}` };
  const teamResponse = await page.request.get("/api/backend/Users/my-team", { headers });
  expect(teamResponse.status()).toBe(200);
  const teamUsers = await teamResponse.json() as Array<{ id: string; username: string }>;
  test.skip(teamUsers.length === 0, "La cuenta QA no tiene miembros cargados para buscar.");

  const teamPageResponsePromise = page.waitForResponse((response) => response.url().includes("/Users/my-team/page") && response.status() === 200);
  const driverPageResponsePromise = page.waitForResponse((response) => response.url().includes("/Drivers/page") && response.status() === 200);
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Gestión de Equipo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Gestión de Equipo" })).toBeVisible();
  const teamPageResponse = await teamPageResponsePromise;
  const teamPageResult = await teamPageResponse.json() as { items: Array<{ id: string; username: string }>; page: number; pageSize: number; totalCount: number; totalPages: number };
  expect(teamPageResult).toMatchObject({ page: 1, pageSize: 25 });
  expect(teamPageResult.totalCount).toBeGreaterThanOrEqual(teamPageResult.items.length);
  const driverPageResponse = await driverPageResponsePromise;
  const driverPageResult = await driverPageResponse.json() as { items: Array<{ id: string; documentNumber: string }>; page: number; pageSize: number; totalCount: number; totalPages: number };
  expect(driverPageResult).toMatchObject({ page: 1, pageSize: 25 });
  expect(driverPageResult.totalCount).toBeGreaterThanOrEqual(driverPageResult.items.length);
  if (teamPageResult.totalPages > 1) {
    await expect(page.getByText(`Página 1 de ${teamPageResult.totalPages}`)).toBeVisible();
    await page.getByRole("button", { name: "Página siguiente" }).click();
    await expect(page.getByText(`Página 2 de ${teamPageResult.totalPages}`)).toBeVisible();
    await page.getByRole("button", { name: "Página anterior" }).click();
  }
  const teamSearch = page.getByRole("searchbox", { name: "Buscar miembros del equipo" });
  const teamSearchResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname.includes("/Users/my-team/page") &&
      url.searchParams.get("search") === teamUsers[0].username &&
      response.status() === 200;
  });
  await teamSearch.fill(teamUsers[0].username);
  const teamSearchResponse = await teamSearchResponsePromise;
  const searchedTeamPage = await teamSearchResponse.json() as { items: Array<{ id: string }>; totalCount: number };
  expect(searchedTeamPage.items.some((member) => member.id === teamUsers[0].id)).toBeTruthy();
  await expect(page.getByTestId(`team-user-${teamUsers[0].id}`)).toBeVisible();
  await teamSearch.fill("miembro-sin-coincidencias-fletflow");
  await expect(page.getByText("No hay miembros que coincidan con la búsqueda.")).toBeVisible();
  await teamSearch.fill("");
  await expect(page.getByTestId(`team-user-${teamUsers[0].id}`)).toBeVisible();
  const teamFilterResponsePromise = page.waitForResponse((response) => response.url().includes("/Users/my-team/page") && response.url().includes("role=Driver") && response.url().includes("isActive=true") && response.status() === 200);
  await page.getByLabel("Filtrar equipo por rol").selectOption("chofer");
  await page.getByLabel("Filtrar equipo por estado").selectOption("true");
  await teamFilterResponsePromise;
  await page.getByLabel("Filtrar equipo por rol").selectOption("");
  await page.getByLabel("Filtrar equipo por estado").selectOption("");

  const driversResponse = await page.request.get("/api/backend/Drivers?onlyActive=true", { headers });
  expect(driversResponse.status()).toBe(200);
  const drivers = await driversResponse.json() as Array<{ id: string; firstName: string; lastName: string; documentNumber: string }>;
  test.skip(drivers.length === 0, "La cuenta QA no tiene conductores activos para buscar.");

  await page.getByRole("button", { name: "Gestionar choferes" }).click();
  if (driverPageResult.totalPages > 1) {
    await expect(page.getByText(`Página 1 de ${driverPageResult.totalPages}`)).toBeVisible();
    await page.getByRole("button", { name: "Página siguiente" }).click();
    await expect(page.getByText(`Página 2 de ${driverPageResult.totalPages}`)).toBeVisible();
    await page.getByRole("button", { name: "Página anterior" }).click();
  }
  const driverSearch = page.getByRole("searchbox", { name: "Buscar choferes" });
  const driverCard = page.getByTestId(`team-driver-${drivers[0].id}`);
  const driverSearchResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname.includes("/Drivers/page") &&
      url.searchParams.get("search") === drivers[0].documentNumber &&
      response.status() === 200;
  });
  await driverSearch.fill(drivers[0].documentNumber);
  const searchedDriverPage = await (await driverSearchResponsePromise).json() as { items: Array<{ id: string }>; totalCount: number };
  expect(searchedDriverPage.items.some((driver) => driver.id === drivers[0].id)).toBeTruthy();
  await expect(driverCard).toBeVisible();
  await expect(driverCard).toContainText(`Doc: ${drivers[0].documentNumber}`);
  await driverSearch.fill("documento-sin-coincidencias-fletflow");
  await expect(page.getByText("No hay choferes que coincidan con la búsqueda o los filtros", { exact: true })).toBeVisible();
  await driverSearch.fill("");
  await expect(driverCard).toBeVisible();
  const inactiveDriversResponsePromise = page.waitForResponse((response) => response.url().includes("/Drivers/page") && response.url().includes("onlyActive=") && response.status() === 200);
  await page.getByRole("button", { name: "Mostrar bajas" }).click();
  await inactiveDriversResponsePromise;
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

test("Gestión de Equipo navega a la siguiente página paginada", async ({ page }) => {
  test.skip(!email || !password, "Requiere cuenta QA Admin.");

  const fixtureUser = (index: number) => ({
    id: `pagination-fixture-${index}`,
    username: `pagination-${index}@fletflow.test`,
    email: `pagination-${index}@fletflow.test`,
    firstName: `Miembro ${index}`,
    lastName: "Fixture",
    isActive: true,
    roles: ["User"],
    isRootAccount: false,
  });

  await page.route("**/Users/my-team/page**", async (route) => {
    const requestedPage = Number(new URL(route.request().url()).searchParams.get("page") ?? "1");
    const items = requestedPage === 1
      ? Array.from({ length: 25 }, (_, index) => fixtureUser(index + 1))
      : [fixtureUser(26)];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items, page: requestedPage, pageSize: 25, totalCount: 26, totalPages: 2 }),
    });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email!);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(password!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Gestión de Equipo", exact: true }).click();

  await expect(page.getByTestId("team-user-pagination-fixture-1")).toBeVisible();
  await expect(page.getByText("Página 1 de 2")).toBeVisible();
  await page.getByRole("button", { name: "Página siguiente" }).click();
  await expect(page.getByTestId("team-user-pagination-fixture-26")).toBeVisible();
  await expect(page.getByText("Página 2 de 2")).toBeVisible();
  await page.getByRole("button", { name: "Página anterior" }).click();
  await expect(page.getByTestId("team-user-pagination-fixture-1")).toBeVisible();
  await expect(page.getByText("Página 1 de 2")).toBeVisible();
});
