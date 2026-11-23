import { expect, test } from "./fixtures";

test("Mapa reintenta la carga y muestra nombres legibles de vehículo y conductor", async ({ page }) => {
  let failRoutes = true;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.endsWith("/Auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "map-retry-admin", email: "admin@example.test", username: "admin", firstName: "Admin", roles: ["Admin"], isActive: true }),
      });
      return;
    }

    if (request.method() === "GET" && url.pathname.endsWith("/Routes/assignment-options")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          vehicles: [{ id: "map-retry-vehicle", plate: "QA-PLATE-01", brand: "Fleet", model: "Van", year: 2025, status: 0, isActive: true }],
          drivers: [{ id: "map-retry-driver", firstName: "Ana", lastName: "Chofer", userId: null, isAvailable: true }],
        }),
      });
      return;
    }

    if (request.method() === "GET" && ["/Vehicles", "/Drivers", "/Users/my-team"].some((path) => url.pathname.endsWith(path))) {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }

    if (request.method() === "GET" && url.pathname.endsWith("/Routes")) {
      if (failRoutes) {
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Servicio temporalmente no disponible" }) });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([{
            id: "map-retry-route",
            name: "Ruta QA ciudad",
            vehicleId: "map-retry-vehicle",
            vehiclePlate: "QA-PLATE-01",
            vehicleBrand: "Fleet",
            vehicleModel: "Van",
            driverId: "map-retry-driver",
            origin: { latitude: -0.18, longitude: -78.48, name: "Origen QA" },
            destination: { latitude: -0.2, longitude: -78.5, name: "Destino QA" },
            points: [],
            status: 0,
            isActive: true,
          }]),
        });
      }
      return;
    }

    if (request.method() === "GET" && url.pathname.endsWith("/Routes/map-retry-route/positions")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }

    await route.fallback();
  });

  await page.addInitScript(() => {
    localStorage.setItem("auth_tokens", JSON.stringify({ accessToken: "playwright-test-access-token", refreshToken: "playwright-test-refresh-token" }));
  });

  const authResponsePromise = page.waitForResponse((response) => new URL(response.url()).pathname.endsWith("/Auth/me"));
  await page.goto("/dashboard");
  expect((await authResponsePromise).status()).toBe(200);
  await expect(page.getByRole("heading", { name: /Bienvenido/ })).toBeVisible();
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Mapa en Tiempo Real", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mapa de rutas" })).toBeVisible();

  const routeError = page.getByRole("alert").filter({ hasText: "No se pudieron cargar las rutas" });
  await expect(routeError).toBeVisible();
  failRoutes = false;
  const recoveredRoutes = page.waitForResponse((response) =>
    response.request().method() === "GET" && new URL(response.url()).pathname.endsWith("/Routes") && response.status() === 200,
  );
  await routeError.getByRole("button", { name: "Reintentar" }).click();
  await recoveredRoutes;

  const routeCard = page.locator("aside").getByRole("button").filter({ hasText: "Ruta QA ciudad" });
  await expect(routeCard).toBeVisible();
  await expect(routeCard).toContainText("QA-PLATE-01");
  await expect(routeCard).toContainText("Ana Chofer");
  const selectedRouteInfo = page.getByText("Ruta seleccionada", { exact: true }).locator("..");
  await expect(selectedRouteInfo).toContainText("QA-PLATE-01");
  await expect(selectedRouteInfo).toContainText("Ana Chofer");
});
