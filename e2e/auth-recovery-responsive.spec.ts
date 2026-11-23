import { expect, test } from "@playwright/test";

test("pantallas de recuperación, restablecimiento y activación son claras y responsive", async ({ page }) => {
  for (const viewport of [{ width: 320, height: 844 }, { width: 768, height: 1024 }]) {
    await page.setViewportSize(viewport);

    await page.goto("/recovery/password");
    await expect(page.getByRole("heading", { name: "Recuperemos tu contraseña" })).toBeVisible();
    await expect(page.getByLabel("*Correo electrónico")).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar" })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);

    await page.goto("/reset-password?token=responsive-ui-fixture");
    await expect(page.getByRole("heading", { name: "Crea una nueva contraseña" })).toBeVisible();
    await expect(page.getByText("Token listo", { exact: true })).toBeVisible();
    await expect(page.getByText(/token[s]? de 12 caracteres/i)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);

    await page.goto("/activate-account?token=responsive-ui-fixture");
    await expect(page.getByRole("heading", { name: "Activa tu cuenta creando tu nueva contraseña" })).toBeVisible();
    await expect(page.getByText("Token listo", { exact: true })).toBeVisible();
    await expect(page.getByText(/token de 12 caracteres/i)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/reset-password?token=responsive-ui-fixture");
  await expect(page.getByText("Seguro y temporal", { exact: true })).toBeVisible();
  await page.goto("/activate-account?token=responsive-ui-fixture");
  await expect(page.getByText("Seguro y temporal", { exact: true })).toBeVisible();
});
