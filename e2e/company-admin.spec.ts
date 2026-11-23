import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

const email = process.env.FLETFLOW_E2E_ADMIN_EMAIL;
const password = process.env.FLETFLOW_E2E_ADMIN_PASSWORD;
const delegatedAdminEmail = process.env.FLETFLOW_E2E_DELEGATED_ADMIN_EMAIL;
const delegatedAdminPassword = process.env.FLETFLOW_E2E_DELEGATED_ADMIN_PASSWORD;
const delegatedAdminId = process.env.FLETFLOW_E2E_DELEGATED_ADMIN_ID;
const memberEmail = process.env.FLETFLOW_E2E_USER_EMAIL;

test("Admin ve datos de su empresa y no acciones globales simuladas", async ({ page }) => {
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
  const meResponse = await page.request.get("/api/backend/Auth/me", { headers });
  expect(meResponse.status()).toBe(200);
  expect(await meResponse.json()).toMatchObject({ isRootAccount: true });
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Administración de la empresa", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Administración de la empresa" })).toBeVisible();
  await expect(page.getByText("Actividad del Sistema", { exact: true })).toHaveCount(0);
  await expect(page.getByText("FleetTrack v1.0", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Equipos", exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Crear Usuario", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Crear Nuevo Usuario" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gerente", exact: true })).toBeVisible();
  await expect(page.getByLabel("Correo electrónico")).toHaveAttribute("type", "email");
  await page.getByRole("button", { name: "Chofer", exact: true }).click();
  await expect(page.getByLabel("Documento *")).toBeVisible();
  await expect(page.getByLabel("Teléfono *")).toBeVisible();

  const expectNoHorizontalOverflow = async () => {
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  };
  await page.setViewportSize({ width: 320, height: 844 });
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
  const username = `e2ecompany${suffix.toLowerCase()}`;
  const userEmail = `fletflow.e2e.user.company-admin.${suffix.toLowerCase()}@example.test`;
  const documentNumber = `E2EQA${suffix}`;
  await page.getByPlaceholder("Juan").fill("Chofer QA");
  await page.getByPlaceholder("Pérez").fill("Responsive");
  await page.getByPlaceholder("jperez").fill(username);
  await page.getByLabel("Correo electrónico").fill(userEmail);
  await page.locator('input[type="password"]').fill("Test-password-123!");
  await page.getByLabel("Documento *").fill(documentNumber);
  await page.getByLabel("Teléfono *").fill("0990000000");
  await expectNoHorizontalOverflow();
  await expect(page.getByRole("heading", { name: "Crear Nuevo Usuario" })).toBeVisible();

  await page.setViewportSize({ width: 768, height: 1024 });
  await expectNoHorizontalOverflow();
  await expect(page.getByLabel("Documento *")).toBeVisible();
  await expect(page.getByLabel("Teléfono *")).toBeVisible();

  const createResponsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith("/api/backend/Users") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Crear Usuario", exact: true }).last().click();
  const createResponse = await createResponsePromise;
  expect(createResponse.status()).toBe(200);
  const createdUser = await createResponse.json() as { id: string; role: string; driverId?: string; invitationSent: boolean };
  expect(createdUser.role).toBe("Driver");
  expect(createdUser.driverId).toBeTruthy();
  expect(createdUser.invitationSent).toBe(false);
  await expect(page.getByText("Usuario creado. No se pudo enviar el correo de invitación.")).toBeVisible();

  const usersResponse = await page.request.get("/api/backend/Users/my-team", { headers });
  expect(usersResponse.status()).toBe(200);
  const persistedUser = (await usersResponse.json() as Array<{ id: string; email: string; username: string; roles: string[] }>)
    .find((user) => user.id === createdUser.id);
  expect(persistedUser).toMatchObject({ id: createdUser.id, email: userEmail, username, roles: ["Driver"] });
  const persistedDriver = await page.request.get(`/api/backend/Drivers/${createdUser.driverId}`, { headers });
  expect(persistedDriver.status()).toBe(200);
  expect(await persistedDriver.json()).toMatchObject({ userId: createdUser.id, documentNumber });

  await page.getByRole("button", { name: "Usuarios de la empresa", exact: true }).click();
  await expect(page.getByText(`@${username}`, { exact: false })).toBeVisible();
  await expect(page.locator('select option[value="superadmin"]').first()).toBeEnabled();
  await expect(page.locator('select option[value="gerente"]').first()).toBeEnabled();

  await page.getByRole("button", { name: "Gestión de Datos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Exportar Datos" })).toBeVisible();
  const exportButton = page.getByRole("button", { name: "Exportar Ahora" });
  await expect(exportButton).toBeEnabled();

  const downloadPromise = page.waitForEvent("download");
  await exportButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^fletflow-empresa-\d+\.json$/);
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const exported = JSON.parse(await readFile(downloadPath!, "utf8")) as {
    users: Array<{ usuario?: string }>;
    routes: unknown[];
    vehicles: unknown[];
    exportDate: string;
  };
  expect(exported.users.some((member) => member.usuario === username)).toBe(true);
  expect(Array.isArray(exported.routes)).toBe(true);
  expect(Array.isArray(exported.vehicles)).toBe(true);
  expect(Number.isNaN(Date.parse(exported.exportDate))).toBe(false);
  await expect(page.getByText("Datos exportados exitosamente")).toBeVisible();

  await expect(page.getByText("Importar Datos", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Reiniciar Sistema", { exact: true })).toHaveCount(0);

  await page.setViewportSize({ width: 320, height: 844 });
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});

test("Admin delegado no puede crear ni promover usuarios al rol Admin en Administración heredada", async ({ page }) => {
  // La prueba abre el contenido directamente desde la barra lateral desktop.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.endsWith("/Auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "delegated-company-admin-id",
          email: "delegated-admin@example.test",
          username: "delegated-admin",
          firstName: "Admin delegado",
          roles: ["Admin"],
          isRootAccount: false,
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
          id: "delegated-company-member-id",
          email: "member@example.test",
          username: "company-member",
          firstName: "Miembro",
          lastName: "Empresa",
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
    const payload = btoa(JSON.stringify({
      nameid: "delegated-company-admin-id",
      owner_id: "root-company-account-id",
      role: "Admin",
    })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    localStorage.setItem("auth_tokens", JSON.stringify({
      accessToken: `e30.${payload}.test-signature`,
      refreshToken: "company-admin-delegated-test-refresh-token",
    }));
  });

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Administración de la empresa", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Administración de la empresa" })).toBeVisible();

  await page.getByRole("button", { name: "Crear Usuario", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Crear Nuevo Usuario" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gerente", exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Usuarios de la empresa", exact: true }).click();
  await expect(page.getByText("@company-member", { exact: false })).toBeVisible();
  const roleSelect = page.getByRole("combobox");
  await expect(roleSelect).toHaveCount(1);
  await expect(roleSelect.locator('option[value="superadmin"]')).toHaveCount(0);
  await expect(roleSelect.locator('option[value="gerente"]')).toHaveCount(0);
});

test("Admin delegado real no ve ni puede crear/promover otro Admin", async ({ page }) => {
  test.skip(
    !delegatedAdminEmail || !delegatedAdminPassword || !delegatedAdminId || !memberEmail,
    "Requiere fixtures de Admin delegado y miembro en MySQL descartable.",
  );

  const loginResponse = await page.request.post("/api/backend/Auth/login", {
    data: { email: delegatedAdminEmail, password: delegatedAdminPassword },
  });
  expect(loginResponse.status()).toBe(200);
  const login = await loginResponse.json() as { token?: string; accessToken?: string };
  const token = login.token ?? login.accessToken;
  expect(token).toBeTruthy();
  const headers = { Authorization: `Bearer ${token}` };

  const identityResponse = await page.request.get("/api/backend/Auth/me", { headers });
  expect(identityResponse.status()).toBe(200);
  expect(await identityResponse.json()).toMatchObject({ id: delegatedAdminId, isRootAccount: false, roles: ["Admin"] });

  const teamResponse = await page.request.get("/api/backend/Users/my-team", { headers });
  expect(teamResponse.status()).toBe(200);
  const team = await teamResponse.json() as Array<{ id: string; email: string; roles: string[] }>;
  const member = team.find((user) => user.email.toLowerCase() === memberEmail!.toLowerCase());
  expect(member).toBeTruthy();
  expect(member?.roles).toContain("User");

  const deniedAdminEmail = `fletflow.e2e.admin.denied.${Date.now()}@example.test`;
  const newAdminResponse = await page.request.post("/api/backend/Users", {
    headers,
    data: {
      username: "Denied delegated Admin",
      email: deniedAdminEmail,
      password: "Denied-Admin-Password-2026!",
      roleName: "Admin",
    },
  });
  expect(newAdminResponse.status()).toBe(403);

  const promotionResponse = await page.request.put(`/api/backend/Users/${member!.id}/role`, {
    headers,
    data: { roleName: "Admin" },
  });
  expect(promotionResponse.status()).toBe(403);
  const persistedTeamResponse = await page.request.get("/api/backend/Users/my-team", { headers });
  expect(persistedTeamResponse.status()).toBe(200);
  const persistedUsers = await persistedTeamResponse.json() as typeof team;
  const persistedMember = persistedUsers.find((user) => user.id === member!.id);
  expect(persistedMember?.roles).toEqual(["User"]);
  expect(persistedUsers.some((user) => user.email === deniedAdminEmail)).toBe(false);

  // Usa el menú móvil explícitamente; "Abrir menú" sólo existe bajo el breakpoint.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(delegatedAdminEmail!);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(delegatedAdminPassword!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const browserToken = await page.evaluate(() => {
    const serialized = localStorage.getItem("auth_tokens");
    return serialized ? JSON.parse(serialized).accessToken as string : null;
  });
  expect(browserToken).toBeTruthy();
  const browserIdentityResponse = await page.request.get("/api/backend/Auth/me", {
    headers: { Authorization: `Bearer ${browserToken}` },
  });
  expect(browserIdentityResponse.status()).toBe(200);
  expect(await browserIdentityResponse.json()).toMatchObject({ id: delegatedAdminId, isRootAccount: false });

  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Administración de la empresa", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Administración de la empresa" })).toBeVisible();
  await page.getByRole("button", { name: "Crear Usuario", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Crear Nuevo Usuario" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gerente", exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Usuarios de la empresa", exact: true }).click();
  await expect(page.locator('select option[value="superadmin"]')).toHaveCount(0);
  await expect(page.locator('select option[value="gerente"]')).toHaveCount(0);
});

test("Administración distingue fallos de carga de una empresa vacía y permite reintentar", async ({ page }) => {
  test.skip(!email || !password, "Requiere cuenta QA Admin.");

  let shouldFailUsers = true;
  let shouldFailFleet = true;
  await page.route("**/api/backend/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const isTeamRead = route.request().method() === "GET" && pathname.endsWith("/Users/my-team");
    const isFleetRead = route.request().method() === "GET" && (pathname.endsWith("/Vehicles") || pathname.endsWith("/Routes"));
    if ((shouldFailUsers && isTeamRead) || (shouldFailFleet && isFleetRead)) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "Servicio temporalmente no disponible" }),
      });
      return;
    }
    await route.continue();
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email!);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(password!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Administración de la empresa", exact: true }).click();
  await page.getByRole("button", { name: "Resumen", exact: true }).click();

  await expect(page.getByText("No se pudo cargar el equipo. Revisa la conexión e inténtalo de nuevo.")).toBeVisible();
  await expect(page.getByText("No se pudieron cargar las rutas.")).toBeVisible();
  await expect(page.getByText("No se pudieron cargar los vehículos.")).toBeVisible();

  await page.getByRole("button", { name: "Gestión de Datos", exact: true }).click();
  await expect(page.getByRole("button", { name: "Exportar Ahora" })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Resumen de Datos" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Resumen de Datos" }).locator("..").getByText("—", { exact: true })).toHaveCount(3);

  await page.getByRole("button", { name: "Usuarios de la empresa", exact: true }).click();
  const retryUsersButton = page.getByRole("button", { name: "Reintentar", exact: true });
  await expect(retryUsersButton).toBeVisible();
  shouldFailUsers = false;
  await retryUsersButton.click();
  await expect(page.getByText("No se pudo cargar el equipo. Revisa la conexión e inténtalo de nuevo.")).toHaveCount(0);

  await page.getByRole("button", { name: "Resumen", exact: true }).click();
  await expect(page.getByText("No se pudieron cargar las rutas.")).toBeVisible();
  await expect(page.getByText("No se pudieron cargar los vehículos.")).toBeVisible();
  const retryFleetButton = page.getByRole("button", { name: "Reintentar", exact: true }).first();
  await expect(retryFleetButton).toBeVisible();
  shouldFailFleet = false;
  await retryFleetButton.click();
  await expect(page.getByText("No se pudieron cargar las rutas.")).toHaveCount(0);
  await expect(page.getByText("No se pudieron cargar los vehículos.")).toHaveCount(0);
  await page.getByRole("button", { name: "Gestión de Datos", exact: true }).click();
  await expect(page.getByRole("button", { name: "Exportar Ahora" })).toBeEnabled();
});
