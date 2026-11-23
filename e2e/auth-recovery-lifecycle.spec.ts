import { expect, test } from "./fixtures";

const resetEmail = process.env.FLETFLOW_E2E_RESET_EMAIL;
const resetPassword = process.env.FLETFLOW_E2E_RESET_PASSWORD;
const resetToken = process.env.FLETFLOW_E2E_RESET_TOKEN;
const activateEmail = process.env.FLETFLOW_E2E_ACTIVATE_EMAIL;
const activatePassword = process.env.FLETFLOW_E2E_ACTIVATE_PASSWORD;
const activateToken = process.env.FLETFLOW_E2E_ACTIVATE_TOKEN;

test("restablece contraseña desde la UI, acepta la nueva clave y consume el token", async ({ page }) => {
  test.skip(!resetEmail || !resetPassword || !resetToken, "Requiere fixture token de reset en MySQL desechable.");
  const newPassword = "Reset-QA-Password-2026!";

  const initialLogin = await page.request.post("/api/backend/Auth/login", {
    data: { email: resetEmail, password: resetPassword },
  });
  expect(initialLogin.status()).toBe(200);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/reset-password?token=${resetToken}`);
  await expect(page.getByText("Token listo", { exact: true })).toBeVisible();
  await page.getByLabel("Nueva contraseña").fill(newPassword);
  await page.getByLabel("Confirmar contraseña").fill(newPassword);

  const resetResponsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith("/api/backend/Auth/reset-password") &&
    response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Actualizar contraseña" }).click();
  const resetResponse = await resetResponsePromise;
  expect(resetResponse.status()).toBe(200);
  await expect(page.getByText(/Tu contraseña fue actualizada/)).toBeVisible();

  const replayResponse = await page.request.post("/api/backend/Auth/reset-password", {
    data: { token: resetToken, newPassword, confirmNewPassword: newPassword },
  });
  expect(replayResponse.status()).toBe(401);

  const oldPasswordLogin = await page.request.post("/api/backend/Auth/login", {
    data: { email: resetEmail, password: resetPassword },
  });
  expect(oldPasswordLogin.status()).toBe(401);
  const newPasswordLogin = await page.request.post("/api/backend/Auth/login", {
    data: { email: resetEmail, password: newPassword },
  });
  expect(newPasswordLogin.status()).toBe(200);
});

test("activa una cuenta desde la UI, establece contraseña y consume el enlace", async ({ page }) => {
  test.skip(!activateEmail || !activatePassword || !activateToken, "Requiere fixture token de activación en MySQL desechable.");
  const newPassword = "Activate-QA-Password-2026!";

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/activate-account?token=${activateToken}`);
  await expect(page.getByText("Token listo", { exact: true })).toBeVisible();
  await page.getByLabel("Nueva contraseña").fill(newPassword);
  await page.getByLabel("Confirmar contraseña").fill(newPassword);

  const activationResponsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith("/api/backend/Auth/activate-account") &&
    response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Activar cuenta" }).click();
  const activationResponse = await activationResponsePromise;
  expect(activationResponse.status()).toBe(200);
  await expect(page.getByText(/Cuenta activada, ahora puedes iniciar sesión/)).toBeVisible();

  const replayResponse = await page.request.post("/api/backend/Auth/activate-account", {
    data: { token: activateToken, newPassword, confirmNewPassword: newPassword },
  });
  expect(replayResponse.status()).toBe(401);

  const oldPasswordLogin = await page.request.post("/api/backend/Auth/login", {
    data: { email: activateEmail, password: activatePassword },
  });
  expect(oldPasswordLogin.status()).toBe(401);
  const newPasswordLogin = await page.request.post("/api/backend/Auth/login", {
    data: { email: activateEmail, password: newPassword },
  });
  expect(newPasswordLogin.status()).toBe(200);
});
