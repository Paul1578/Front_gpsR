import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

const email = process.env.FLETFLOW_E2E_ADMIN_EMAIL;
const password = process.env.FLETFLOW_E2E_ADMIN_PASSWORD;
let createdDriverId: string | undefined;
let accessToken: string | undefined;

test.afterEach(async ({ page }) => {
  if (!createdDriverId || !accessToken) return;
  const cleanup = await page.request.put(`/api/backend/Drivers/${createdDriverId}/status`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { isActive: false },
  });
  expect(cleanup.status()).toBe(204);
  createdDriverId = undefined;
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

  accessToken = (await page.evaluate(() => {
    const serialized = localStorage.getItem("auth_tokens");
    return serialized ? JSON.parse(serialized).accessToken as string : null;
  })) ?? undefined;
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
  createdDriverId = driver.id;

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
