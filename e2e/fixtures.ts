import { expect, test as base, type Locator, type Page, type Request, type Route } from "@playwright/test";

const MOCK_ACCESS_COOKIE = "fletflow_e2e_mock_access";

async function fulfillMockAuth(route: Route, accessToken: string) {
  const encoded = encodeURIComponent(accessToken);
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: {
      "Cache-Control": "no-store",
      "Set-Cookie": `${MOCK_ACCESS_COOKIE}=${encoded}; Path=/api/auth; HttpOnly; SameSite=Strict`,
    },
    body: JSON.stringify({ accessToken }),
  });
}

async function legacyMockToken(page: Page) {
  try {
    return await page.evaluate(() => {
      const value = localStorage.getItem("auth_tokens");
      if (!value) return null;
      const parsed = JSON.parse(value) as { accessToken?: unknown };
      return typeof parsed.accessToken === "string" ? parsed.accessToken : null;
    });
  } catch {
    return null;
  }
}

export const test = base.extend({
  page: async ({ page }, useFixture) => {
    await page.route("**/api/auth/migrate", async (route) => {
      const legacyToken = await legacyMockToken(page);
      if (legacyToken) return fulfillMockAuth(route, legacyToken);
      return route.fallback();
    });
    await page.route("**/api/auth/refresh", async (route) => {
      const cookieHeader = route.request().headers().cookie ?? "";
      const mockCookie = cookieHeader
        .split(";")
        .map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith(`${MOCK_ACCESS_COOKIE}=`));
      if (mockCookie) {
        const token = decodeURIComponent(mockCookie.slice(MOCK_ACCESS_COOKIE.length + 1));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "Cache-Control": "no-store" },
          body: JSON.stringify({ accessToken: token }),
        });
        return;
      }
      const legacyToken = await legacyMockToken(page);
      if (legacyToken) return fulfillMockAuth(route, legacyToken);
      return route.fallback();
    });
    // Playwright fixtures expose a `use` callback; this is not a React Hook.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await useFixture(page);
  },
});

export { expect };
export type { Locator, Request };

export async function readAccessToken(page: Page): Promise<string> {
  const response = await page.evaluate(async () => {
    const result = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
    });
    return { ok: result.ok, status: result.status, body: await result.json() as { accessToken?: unknown } };
  });
  if (!response.ok) {
    throw new Error(`No se pudo obtener un access token de prueba: HTTP ${response.status}`);
  }
  if (typeof response.body.accessToken !== "string") {
    throw new Error("La ruta de sesión no devolvió un access token.");
  }
  return response.body.accessToken;
}
