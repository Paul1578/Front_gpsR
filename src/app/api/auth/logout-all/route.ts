import {
  callBackend,
  clearRefreshCookie,
  getBearerToken,
  invalidOriginResponse,
  jsonResponse,
  verifySameOrigin,
} from "../_lib";

export async function POST(request: Request) {
  if (!verifySameOrigin(request)) return invalidOriginResponse();
  const accessToken = getBearerToken(request);
  if (!accessToken) return jsonResponse({ message: "Token de acceso requerido." }, 401);

  const result = await callBackend("logout-all", { accessToken, body: {} });
  if (result.response.ok || result.response.status === 401) {
    clearRefreshCookie(result.response);
  }
  return result.response;
}
