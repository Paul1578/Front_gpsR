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

  const themeSwitch = page.getByRole("switch", { name: "Modo oscuro" });
  await expect(themeSwitch).toHaveAttribute("aria-checked", "false");
  await themeSwitch.click();
  await expect(themeSwitch).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("theme_preference"))).toBe("dark");

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
