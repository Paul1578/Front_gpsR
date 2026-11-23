import {
  callBackend,
  invalidBodyResponse,
  invalidOriginResponse,
  jsonResponse,
  readJson,
  setRefreshCookie,
  verifySameOrigin,
} from "../_lib";

/** Rota y migra un refresh token legado desde el almacenamiento del cliente a una cookie HttpOnly. */
export async function POST(request: Request) {
  if (!verifySameOrigin(request)) return invalidOriginResponse();
  const body = await readJson(request);
  if (typeof body?.refreshToken !== "string" || body.refreshToken.length === 0) return invalidBodyResponse();

  const result = await callBackend("refresh", { body: { refreshToken: body.refreshToken } });
  if (!result.ok) return result.response;

  const response = jsonResponse(result.access);
  if (!result.refreshToken || !result.refreshExpiration || !setRefreshCookie(response, result.refreshToken, result.refreshExpiration)) {
    return jsonResponse({ message: "La API devolvió una expiración de refresh token inválida." }, 502);
  }
  return response;
}
