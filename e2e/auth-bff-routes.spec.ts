import { expect, test } from "@playwright/test";
import { POST as logoutPost } from "../src/app/api/auth/logout/route";
import { POST as logoutAllPost } from "../src/app/api/auth/logout-all/route";
import { POST as refreshPost } from "../src/app/api/auth/refresh/route";

const origin = "http://127.0.0.1:3000";

function request(path: string, headers: Record<string, string>) {
  return new Request(`${origin}${path}`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", ...headers },
    body: "{}",
  });
}

async function withBackendResponse<T>(status: number, run: () => Promise<T>) {
  const originalFetch = globalThis.fetch;
  const originalApiUrl = process.env.FLETFLOW_API_URL;
  process.env.FLETFLOW_API_URL = "http://fletflow-api.test";
  globalThis.fetch = (async () => new Response(JSON.stringify({ message: "Respuesta de prueba" }), {
    status,
    headers: { "Content-Type": "application/json" },
  })) as typeof fetch;
  try {
    return await run();
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiUrl === undefined) delete process.env.FLETFLOW_API_URL;
    else process.env.FLETFLOW_API_URL = originalApiUrl;
  }
}

test("refresh 401 no borra una cookie que otra pestaña pudo rotar", async () => {
  await withBackendResponse(401, async () => {
    const response = await refreshPost(request("/api/auth/refresh", {
      Cookie: "fletflow_refresh=refresh-anterior",
    }));
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

test("logout-all 401 conserva la cookie porque el servidor no revocó sesiones", async () => {
  await withBackendResponse(401, async () => {
    const response = await logoutAllPost(request("/api/auth/logout-all", {
      Authorization: "Bearer access-expirado",
      Cookie: "fletflow_refresh=refresh-vigente",
    }));
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

test("logout limpia la cookie local aunque la API no confirme revocación", async () => {
  await withBackendResponse(503, async () => {
    const response = await logoutPost(request("/api/auth/logout", {
      Authorization: "Bearer access-vigente",
      Cookie: "fletflow_refresh=refresh-vigente",
    }));
    expect(response.status).toBe(503);
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("fletflow_refresh=");
    expect(cookie).toContain("Max-Age=0");
  });
});
