import { expect, test } from "@playwright/test";

const email = process.env.FLETFLOW_E2E_ADMIN_EMAIL;
const password = process.env.FLETFLOW_E2E_ADMIN_PASSWORD;

test("Admin busca conductores en la pantalla operativa a 320 y 768 px", async ({ page }) => {
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
  const response = await page.request.get("/api/backend/Drivers?onlyActive=true", { headers });
  expect(response.status()).toBe(200);
  const drivers = await response.json() as Array<{ id: string; documentNumber: string }>;
  test.skip(drivers.length === 0, "La cuenta QA requiere un conductor activo para comprobar el filtro.");

  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Gestión de Conductores", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Gestión de Conductores" })).toBeVisible();
  const search = page.getByRole("searchbox", { name: "Buscar conductores" });
  const result = page.getByTestId(`managed-driver-${drivers[0].id}`);

  await page.setViewportSize({ width: 320, height: 844 });
  await search.fill(drivers[0].documentNumber);
  await expect(result).toBeVisible();
  await expect(result).toContainText(drivers[0].documentNumber);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await search.fill("conductor-sin-coincidencias-fletflow");
  await expect(page.getByText("No hay conductores que coincidan con la búsqueda.")).toBeVisible();
  await search.fill("");
  await expect(result).toBeVisible();

  await page.setViewportSize({ width: 768, height: 1024 });
  await search.fill(drivers[0].documentNumber);
  await expect(result).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
