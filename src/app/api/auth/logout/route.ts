import {
  callBackend,
  clearRefreshCookie,
  getBearerToken,
  getCookieValue,
  invalidOriginResponse,
  jsonResponse,
  REFRESH_COOKIE,
  verifySameOrigin,
} from "../_lib";

export async function POST(request: Request) {
  if (!verifySameOrigin(request)) return invalidOriginResponse();
  const accessToken = getBearerToken(request);
  const refreshToken = getCookieValue(request, REFRESH_COOKIE);
  if (!accessToken || !refreshToken) {
    const response = jsonResponse({ message: "Sesión cerrada." });
    clearRefreshCookie(response);
    return response;
  }

  const result = await callBackend("logout", {
    accessToken,
    body: { refreshToken },
  });
  clearRefreshCookie(result.response);
  return result.response;
}
