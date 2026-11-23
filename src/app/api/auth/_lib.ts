import { NextResponse } from "next/server";

export const REFRESH_COOKIE = "fletflow_refresh";
const COOKIE_PATH = "/api/auth";

type BackendAuthResponse = {
  Token?: unknown;
  Expiration?: unknown;
  RefreshToken?: unknown;
  RefreshTokenExpiration?: unknown;
  token?: unknown;
  expiration?: unknown;
  refreshToken?: unknown;
  refreshTokenExpiration?: unknown;
};

type BackendError = {
  message?: unknown;
  error?: unknown;
  title?: unknown;
  status?: unknown;
  statusCode?: unknown;
};

export type AccessPayload = {
  accessToken: string;
  expiration: string;
};

export function jsonResponse(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export function verifySameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    const parsedOrigin = new URL(origin);
    if (origin !== parsedOrigin.origin) return false;

    // Next development may canonicalize request.url to localhost even when the
    // browser connected through 127.0.0.1. Behind TLS proxies, forwarded host
    // and protocol represent the public request origin.
    const requestUrl = new URL(request.url);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",", 1)[0]?.trim();
    const host = request.headers.get("host")?.split(",", 1)[0]?.trim();
    const expectedHost = forwardedHost || host || requestUrl.host;
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim();
    const expectedProtocol = forwardedProtocol || requestUrl.protocol.slice(0, -1);
    return parsedOrigin.host.toLowerCase() === expectedHost.toLowerCase() &&
      parsedOrigin.protocol === `${expectedProtocol}:`;
  } catch {
    return false;
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

export function invalidOriginResponse() {
  return jsonResponse({ message: "Origen de solicitud no permitido." }, 403);
}

export function invalidBodyResponse() {
  return jsonResponse({ message: "El cuerpo de la solicitud no es válido." }, 400);
}

export async function callBackend(
  endpoint: "login" | "refresh" | "logout" | "logout-all",
  options: { body?: unknown; accessToken?: string } = {},
) {
  const baseUrl = process.env.FLETFLOW_API_URL ?? "http://localhost:5046";
  let url: URL;
  try {
    url = new URL(baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Invalid API protocol");
  } catch {
    return {
      ok: false as const,
      response: jsonResponse({ message: "La API de FletFlow no está configurada correctamente." }, 500),
    };
  }

  url.pathname = `${url.pathname.replace(/\/$/, "")}/api/Auth/${endpoint}`;
  url.search = "";
  url.hash = "";

  const headers = new Headers({ Accept: "application/json" });
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.accessToken) headers.set("Authorization", `Bearer ${options.accessToken}`);

  let backendResponse: Response;
  try {
    backendResponse = await fetch(url, {
      method: "POST",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return {
      ok: false as const,
      response: jsonResponse({ message: "No fue posible conectar con la API de FletFlow." }, 502),
    };
  }

  const raw = await backendResponse.text();
  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    parsed = { message: raw };
  }

  if (!backendResponse.ok) {
    const error = isRecord(parsed) ? (parsed as BackendError) : {};
    const message = firstString(error.message, error.title, error.error) ?? "La solicitud de autenticación no pudo completarse.";
    return {
      ok: false as const,
      response: jsonResponse({ message: redact(message, [options.accessToken, getBodyRefreshToken(options.body)]) }, backendResponse.status),
    };
  }

  if (!isRecord(parsed)) {
    return { ok: false as const, response: jsonResponse({ message: "Respuesta inválida de la API de FletFlow." }, 502) };
  }
  const auth = parsed as BackendAuthResponse;
  if (endpoint === "login" || endpoint === "refresh") {
    const accessToken = firstString(auth.Token, auth.token);
    const expiration = firstString(auth.Expiration, auth.expiration);
    const refreshToken = firstString(auth.RefreshToken, auth.refreshToken);
    const refreshExpiration = firstString(auth.RefreshTokenExpiration, auth.refreshTokenExpiration);
    if (
      !accessToken ||
      !expiration ||
      !refreshToken ||
      !refreshExpiration
    ) {
      return { ok: false as const, response: jsonResponse({ message: "Respuesta de autenticación incompleta." }, 502) };
    }
    return {
      ok: true as const,
      access: { accessToken, expiration } satisfies AccessPayload,
      refreshToken,
      refreshExpiration,
      response: jsonResponse({ accessToken, expiration }),
    };
  }

  const success = parsed as BackendError;
  return {
    ok: true as const,
    response: jsonResponse({ message: firstString(success.message) ?? "Operación completada." }),
  };
}

export function setRefreshCookie(response: NextResponse, token: string, expiration: string) {
  const expires = new Date(expiration);
  if (!Number.isFinite(expires.getTime()) || expires.getTime() <= Date.now()) return false;

  response.cookies.set({
    name: REFRESH_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "strict",
    path: COOKIE_PATH,
    expires,
  });
  return true;
}

export function clearRefreshCookie(response: NextResponse) {
  response.cookies.set({
    name: REFRESH_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "strict",
    path: COOKIE_PATH,
    expires: new Date(0),
    maxAge: 0,
  });
}

export function getCookieValue(request: Request, name: string): string | null {
  const raw = request.headers.get("cookie");
  if (!raw) return null;
  for (const item of raw.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0 || item.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(item.slice(separator + 1).trim()) || null;
    } catch {
      return null;
    }
  }
  return null;
}

export function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstString(...values: unknown[]): string | null {
  return values.find((value): value is string => typeof value === "string" && value.length > 0) ?? null;
}

function getBodyRefreshToken(body: unknown): string | undefined {
  return isRecord(body) && typeof body.refreshToken === "string" ? body.refreshToken : undefined;
}

function redact(message: string, secrets: Array<string | undefined>): string {
  return secrets.reduce<string>((result, secret) => secret ? result.split(secret).join("[redacted]") : result, message);
}
