import { expect, test } from "./fixtures";

const email = process.env.FLETFLOW_E2E_ADMIN_EMAIL;
const password = process.env.FLETFLOW_E2E_ADMIN_PASSWORD;
const allowMutations = process.env.FLETFLOW_E2E_ALLOW_MUTATIONS === "true";

test("la preferencia de tema se guarda y persiste al recargar", async ({ page }) => {
  test.skip(!email || !password || !allowMutations, "Requiere cuenta Admin QA y API/MySQL descartables.");

  await page.addInitScript(() => {
    if (localStorage.getItem("theme_preference") === null) {
      localStorage.setItem("theme_preference", "light");
    }
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email!);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(password!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Mi Perfil", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mi Perfil" })).toBeVisible();

  await page.setViewportSize({ width: 320, height: 720 });
  const profileBounds = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(profileBounds.document).toBeLessThanOrEqual(profileBounds.viewport);
  const mobileProfile = page.getByRole("heading", { name: "Mi Perfil" });
  const mobileProfileBounds = await mobileProfile.boundingBox();
  expect(mobileProfileBounds).not.toBeNull();
  expect(mobileProfileBounds!.x + mobileProfileBounds!.width).toBeLessThanOrEqual(320);

  const themeSwitch = page.getByRole("switch", { name: "Modo oscuro" });
  await expect(themeSwitch).toHaveAttribute("aria-checked", "false");
  await themeSwitch.click();
  await expect(themeSwitch).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("theme_preference"))).toBe("dark");

  const passwordToggle = page.getByRole("button", { name: "Cambiar contraseña", exact: true });
  const toggleBounds = await passwordToggle.boundingBox();
  expect(toggleBounds).not.toBeNull();
  expect(toggleBounds!.x + toggleBounds!.width).toBeLessThanOrEqual(320);
  await passwordToggle.click();
  const passwordForm = page.locator("form").filter({ has: page.getByPlaceholder("Contraseña actual") });
  await expect(passwordForm).toBeVisible();
  for (const placeholder of ["Contraseña actual", "Nueva contraseña", "Confirmar nueva contraseña"]) {
    const field = page.getByPlaceholder(placeholder);
    await expect(field).toBeVisible();
    const bounds = await field.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  }
  await passwordToggle.click();

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Mi Perfil", exact: true }).click();
  const persistedSwitch = page.getByRole("switch", { name: "Modo oscuro" });
  await expect(persistedSwitch).toHaveAttribute("aria-checked", "true");

  await persistedSwitch.click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("theme_preference"))).toBe("light");
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});
