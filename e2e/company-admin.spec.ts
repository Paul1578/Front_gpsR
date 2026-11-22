import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

const email = process.env.FLETFLOW_E2E_ADMIN_EMAIL;
const password = process.env.FLETFLOW_E2E_ADMIN_PASSWORD;

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
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Administración de la empresa", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Administración de la empresa" })).toBeVisible();
  await expect(page.getByText("Actividad del Sistema", { exact: true })).toHaveCount(0);
  await expect(page.getByText("FleetTrack v1.0", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Equipos", exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Crear Usuario", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Crear Nuevo Usuario" })).toBeVisible();
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

  await page.getByRole("button", { name: "Gestión de Datos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Exportar Datos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Exportar Ahora" })).toBeVisible();
  await expect(page.getByText("Importar Datos", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Reiniciar Sistema", { exact: true })).toHaveCount(0);

  await page.setViewportSize({ width: 320, height: 844 });
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
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
