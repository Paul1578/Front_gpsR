import {
  callBackend,
  invalidBodyResponse,
  invalidOriginResponse,
  jsonResponse,
  readJson,
  setRefreshCookie,
  verifySameOrigin,
} from "../_lib";

export async function POST(request: Request) {
  if (!verifySameOrigin(request)) return invalidOriginResponse();
  const body = await readJson(request);
  if (typeof body?.email !== "string" || typeof body.password !== "string") return invalidBodyResponse();

  const result = await callBackend("login", { body: { email: body.email, password: body.password } });
  if (!result.ok) return result.response;

  const response = jsonResponse(result.access);
  if (!result.refreshToken || !result.refreshExpiration || !setRefreshCookie(response, result.refreshToken, result.refreshExpiration)) {
    return jsonResponse({ message: "La API devolvió una expiración de refresh token inválida." }, 502);
  }
  return response;
}
