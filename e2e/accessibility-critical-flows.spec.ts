import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

const auditedStandards = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function expectAccessible(page: import("@playwright/test").Page, context: string) {
  const results = await new AxeBuilder({ page }).withTags(auditedStandards).analyze();
  const violations = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    description: violation.help,
    elements: violation.nodes.map((node) => ({ target: node.target, html: node.html, summary: node.failureSummary })),
  }));
  expect(violations, `axe encontró problemas en ${context}: ${JSON.stringify(violations, null, 2)}`).toEqual([]);
}

test("navegación de login y formularios públicos cumplen axe", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
  await expectAccessible(page, "formulario de inicio de sesión");

  await page.getByRole("button", { name: "¿Olvidaste tu contraseña?" }).click();
  await expect(page).toHaveURL(/\/recovery\/password$/);
  await expect(page.getByRole("heading", { name: "Recuperemos tu contraseña" })).toBeVisible();
  await expectAccessible(page, "formulario de recuperación de contraseña");

  await page.getByRole("button", { name: "Volver" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expectAccessible(page, "login tras navegación de regreso");
});

test("navegación autenticada y diálogo de creación de usuario cumplen axe", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.endsWith("/Auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "a11y-admin", email: "admin@example.test", username: "admin", firstName: "Admin", roles: ["Admin"], isActive: true, isRootAccount: true }),
      });
      return;
    }
    if (request.method() === "GET" && url.pathname.endsWith("/Users/my-team/page")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], page: 1, pageSize: 25, totalCount: 0, totalPages: 0 }) });
      return;
    }
    if (request.method() === "GET" && ["/Users/my-team", "/Drivers", "/Drivers/page", "/Vehicles", "/Routes", "/Routes/assignment-options"].some((path) => url.pathname.endsWith(path))) {
      await route.fulfill({ status: 200, contentType: "application/json", body: url.pathname.endsWith("/assignment-options") ? JSON.stringify({ vehicles: [], drivers: [] }) : "[]" });
      return;
    }
    await route.fallback();
  });

  await page.addInitScript(() => {
    localStorage.setItem("auth_tokens", JSON.stringify({ accessToken: "playwright-test-access-token", refreshToken: "playwright-test-refresh-token" }));
  });

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /Bienvenido/ })).toBeVisible();
  await expectAccessible(page, "dashboard autenticado");

  await page.getByRole("button", { name: "Gestión de Equipo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Gestión de Equipo" })).toBeVisible();
  await expectAccessible(page, "navegación a Gestión de Equipo");

  await page.getByRole("button", { name: "Crear Usuario", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Crear Nuevo Usuario" })).toBeVisible();
  await expectAccessible(page, "diálogo de creación de usuario");

  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("button", { name: "Mi Perfil", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mi Perfil" })).toBeVisible();
  await expectAccessible(page, "Mi Perfil");
  await page.getByRole("button", { name: "Cambiar contraseña", exact: true }).click();
  await expectAccessible(page, "formulario de cambio de contraseña en Mi Perfil");

  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await expectAccessible(page, "confirmación de cierre de sesión");
});
