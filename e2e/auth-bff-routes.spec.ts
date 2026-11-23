import { expect, test } from "@playwright/test";
import { POST as logoutPost } from "../src/app/api/auth/logout/route";
import { POST as logoutAllPost } from "../src/app/api/auth/logout-all/route";
import { POST as refreshPost } from "../src/app/api/auth/refresh/route";
import { callBackend, verifySameOrigin } from "../src/app/api/auth/_lib";

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
  process.env.FLETFLOW_API_URL = "https://fletflow-api.test";
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

test("la validación de origen ignora encabezados forwarded falsificables", () => {
  const forged = new Request("https://fleetflow.example/api/auth/login", {
    method: "POST",
    headers: {
      Origin: "https://attacker.example",
      Host: "fleetflow.example",
      "X-Forwarded-Host": "attacker.example",
      "X-Forwarded-Proto": "https",
    },
  });
  expect(verifySameOrigin(forged)).toBe(false);
});

test("producción rechaza una API remota configurada por HTTP antes de enviar credenciales", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiUrl = process.env.FLETFLOW_API_URL;
  const originalNodeEnv = process.env.NODE_ENV;
  let fetchAttempted = false;
  Reflect.set(process.env, "NODE_ENV", "production");
  process.env.FLETFLOW_API_URL = "http://api.example.test";
  globalThis.fetch = (async () => {
    fetchAttempted = true;
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  try {
    const result = await callBackend("login", { body: { email: "qa@example.test", password: "not-a-real-secret" } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(500);
    expect(fetchAttempted).toBe(false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiUrl === undefined) delete process.env.FLETFLOW_API_URL;
    else process.env.FLETFLOW_API_URL = originalApiUrl;
    if (originalNodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Reflect.set(process.env, "NODE_ENV", originalNodeEnv);
  }
});

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
