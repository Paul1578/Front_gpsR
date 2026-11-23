import {
  callBackend,
  clearRefreshCookie,
  getCookieValue,
  invalidOriginResponse,
  jsonResponse,
  REFRESH_COOKIE,
  setRefreshCookie,
  verifySameOrigin,
} from "../_lib";

export async function POST(request: Request) {
  if (!verifySameOrigin(request)) return invalidOriginResponse();
  const refreshToken = getCookieValue(request, REFRESH_COOKIE);
  if (!refreshToken) return jsonResponse({ message: "La sesión de renovación no está disponible." }, 401);

  const result = await callBackend("refresh", { body: { refreshToken } });
  if (!result.ok) {
    if (result.response.status === 401) clearRefreshCookie(result.response);
    return result.response;
  }

  const response = jsonResponse(result.access);
  if (!result.refreshToken || !result.refreshExpiration || !setRefreshCookie(response, result.refreshToken, result.refreshExpiration)) {
    return jsonResponse({ message: "La API devolvió una expiración de refresh token inválida." }, 502);
  }
  return response;
}
