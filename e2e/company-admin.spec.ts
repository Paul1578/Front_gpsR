import { expect, test } from "@playwright/test";

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

  let shouldFail = true;
  await page.route("**/api/backend/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const isFleetRead = pathname.endsWith("/Users/my-team") || pathname.endsWith("/Vehicles") || pathname.endsWith("/Routes");
    if (shouldFail && isFleetRead) {
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

  shouldFail = false;
  await page.getByRole("button", { name: "Usuarios de la empresa", exact: true }).click();
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(page.getByText("No se pudo cargar el equipo. Revisa la conexión e inténtalo de nuevo.")).toHaveCount(0);

  await page.getByRole("button", { name: "Resumen", exact: true }).click();
  const retryButtons = page.getByRole("button", { name: "Reintentar", exact: true });
  await retryButtons.first().click();
  await expect(page.getByText("No se pudieron cargar las rutas.")).toHaveCount(0);
  await expect(page.getByText("No se pudieron cargar los vehículos.")).toHaveCount(0);
  await page.getByRole("button", { name: "Gestión de Datos", exact: true }).click();
  await expect(page.getByRole("button", { name: "Exportar Ahora" })).toBeEnabled();
});
