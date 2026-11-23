# Seguridad del frontend

## Verificación vigente — 2026-11-23

- Front `4f59b19` pasó Action integrada [`45266610856`](https://github.com/Paul1578/Front_gpsR/actions/runs/45266610856): 69/69 E2E autenticados, axe, responsive, audit/lint/build, API/MySQL y cleanup; Backend xUnit 165/165. Incluye login/refresh/logout concurrente y controles de sesión BFF.
- Auditoría de forwarded headers/transporte: el BFF ignora `X-Forwarded-Host/Proto`, aplica allowlist de orígenes en producción y rechaza HTTP a API remota. Pruebas directas 5/5 y flujo integrado cubierto por la Action actual.

- El frontend no contiene claves JWT, SMTP ni credenciales de base de datos.
- Roles y permisos efectivos los valida el backend; la UI no presenta cambios locales como autorización persistida.
- Al restaurar la sesión, frontend valida el usuario mediante `/Auth/me`; el rol cacheado ya no decide permisos.
- Al cambiar de cuenta, el contexto vacía datos de la cuenta anterior antes de exponer flota al nuevo usuario; backend conserva el aislamiento tenant como control definitivo.
- El alta de vehículos no inventa posición GPS y el mapa muestra únicamente ubicación recibida del navegador o del backend.
- Los errores de API se traducen en mensajes de fallo; el panel no marca éxito cuando la llamada falla.
- El login, refresh, migración de sesión y logout pasan por Route Handlers BFF same-origin. El refresh token vive en cookie `HttpOnly`, `SameSite=Strict`, limitada a `/api/auth`, con `Secure` fuera de `NODE_ENV=development`; las respuestas de login/refresh entregan sólo el access token.
- El access token vive en memoria y se adjunta como Bearer a las llamadas API. La sesión legacy de `localStorage` se migra una vez mediante refresh rotado y luego se elimina. En producción, el BFF sólo acepta orígenes exactos de `FLETFLOW_AUTH_ALLOWED_ORIGINS`; en desarrollo contrasta `Origin` con `Host` y URL, ignorando `X-Forwarded-*`.
- En producción el BFF rechaza API remota configurada por HTTP; sólo permite loopback HTTP para despliegues locales/co-localizados. Las API remotas deben usar HTTPS.
- La rotación en curso se comparte dentro del AuthContext para evitar dos refresh simultáneos. Logout espera un refresh pendiente antes de revocar y cerrar la cookie para evitar que una respuesta tardía restaure la sesión.
- `npm audit --audit-level=low` reporta 0 vulnerabilidades.

## Pendientes

- Rotar en ambientes remotos cualquier credencial que haya aparecido en el historial Git. El JWT y MySQL locales fueron rotados en esta sesión.
- Usar HTTPS y revisar los orígenes CORS permitidos al desplegar.
- El access token se mantiene sólo en memoria; un XSS activo aún podría ejecutar acciones con la sesión abierta, aunque la auditoría estática no encontró un vector XSS explotable. La cookie HttpOnly reduce la exfiltración del refresh token.
- Action histórica `45216891336` pasó **65/65 E2E**, incluyendo login concurrente de cuentas, restauración cross-tab, errores BFF, y cookie Secure/HttpOnly/SameSite/Path; la validación integrada más reciente está arriba.

## Revisión de concurrencia, fallos de autenticación y transporte — VALIDADA EN CI/local

- Hallazgo alto: refresh rotado concurrentemente entre pestañas podía recibir un 401 tardío y borrar la cookie vigente. El cliente serializa login/migración/refresh/logout/logout-all con Web Locks; el handler refresh ya no borra cookie al recibir 401, y las pestañas detectan cambios de identidad por `currentUser` en `storage` para recargar la sesión verificada por `/Auth/me`.
- Errores de refresh HTTP 5xx/429/red ya no borran sesión activa ni cookie; se informa fallo temporal. En restauración al cargar, el estado cacheado no se autentica: se conserva la cookie y se muestra opción de reintento/recarga.
- `logout-all` sólo borra cookie si backend confirma éxito; 401 y fallos temporales preservan la sesión local para que pueda renovarse/reintentarse. Logout individual siempre limpia cookie local y ahora informa si el servidor no confirmó revocación.
- Playwright cubre restauración concurrente, recuperación tras refresh 503, feedback logout/logout-all, login simultáneo de cuentas distintas y ausencia de Web Locks; handlers cubren refresh 401, logout-all 401 y logout 503. La cobertura integrada más reciente está en Action [`45266610856`](https://github.com/Paul1578/Front_gpsR/actions/runs/45266610856).
- Requisito de navegador: la exclusión entre pestañas usa Web Locks API en origen seguro. Si no está disponible, las operaciones de autenticación fallan de forma cerrada y piden actualizar el navegador; no se envía login/refresh sin coordinación.
- Segunda revisión: se encontró que el fallback anterior ejecutaba mutaciones sin lock cuando Web Locks no existía, y faltaba cubrir logins simultáneos de distintas cuentas. Ahora falla cerradamente; ambos escenarios E2E pasaron en Action `45216891336`. Logout individual con API caída sólo puede cerrar la sesión local y advertir que revocación remota no fue confirmada; no es posible revocar mientras el backend no responde.
- Auditoría adicional de forwarded headers/API transport: el BFF dejó de confiar en `X-Forwarded-Host/Proto`, exige lista allowlist en producción y rechaza HTTP a API remota. Tests directos **5/5** y cobertura E2E integrada ya validada en [`45266610856`](https://github.com/Paul1578/Front_gpsR/actions/runs/45266610856).
