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

  await page.getByRole("button", { name: "Gestión de Datos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Exportar Datos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Exportar Ahora" })).toBeVisible();
  await expect(page.getByText("Importar Datos", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Reiniciar Sistema", { exact: true })).toHaveCount(0);

  await page.setViewportSize({ width: 320, height: 844 });
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});
