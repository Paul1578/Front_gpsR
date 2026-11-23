# Seguridad del frontend

- El frontend no contiene claves JWT, SMTP ni credenciales de base de datos.
- Roles y permisos efectivos los valida el backend; la UI no presenta cambios locales como autorización persistida.
- Al restaurar la sesión, frontend valida el usuario mediante `/Auth/me`; el rol cacheado ya no decide permisos.
- Al cambiar de cuenta, el contexto vacía datos de la cuenta anterior antes de exponer flota al nuevo usuario; backend conserva el aislamiento tenant como control definitivo.
- El alta de vehículos no inventa posición GPS y el mapa muestra únicamente ubicación recibida del navegador o del backend.
- Los errores de API se traducen en mensajes de fallo; el panel no marca éxito cuando la llamada falla.
- El login, refresh, migración de sesión y logout pasan por Route Handlers BFF same-origin. El refresh token vive en cookie `HttpOnly`, `SameSite=Strict`, limitada a `/api/auth`, con `Secure` fuera de `NODE_ENV=development`; las respuestas de login/refresh entregan sólo el access token.
- El access token vive en memoria y se adjunta como Bearer a las llamadas API. La sesión legacy de `localStorage` se migra una vez mediante refresh rotado y luego se elimina; el BFF valida `Origin` contra el host/protocolo de la solicitud y responde `no-store`.
- La rotación en curso se comparte dentro del AuthContext para evitar dos refresh simultáneos. Logout espera un refresh pendiente antes de revocar y cerrar la cookie para evitar que una respuesta tardía restaure la sesión.
- `npm audit --audit-level=low` reporta 0 vulnerabilidades.

## Pendientes

- Rotar en ambientes remotos cualquier credencial que haya aparecido en el historial Git. El JWT y MySQL locales fueron rotados en esta sesión.
- Usar HTTPS y revisar los orígenes CORS permitidos al desplegar.
- El access token se mantiene sólo en memoria; un XSS activo aún podría ejecutar acciones con la sesión abierta, aunque la auditoría estática no encontró un vector XSS explotable. La cookie HttpOnly reduce la exfiltración del refresh token.
- Action `45207209347` verificó cookie Secure/HttpOnly/SameSite/Path/expiración en navegador real con API/MySQL efímeros; el follow-up de concurrencia y errores temporales está en validación.

## Revisión de concurrencia y fallos de autenticación — CORRECCIONES LOCALES, CI PENDIENTE

- Hallazgo alto: refresh rotado concurrentemente entre pestañas podía recibir un 401 tardío y borrar la cookie vigente. El cliente serializa login/migración/refresh/logout/logout-all con Web Locks; el handler refresh ya no borra cookie al recibir 401, y las pestañas detectan cambios de identidad por `currentUser` en `storage` para recargar la sesión verificada por `/Auth/me`.
- Errores de refresh HTTP 5xx/429/red ya no borran sesión activa ni cookie; se informa fallo temporal. En restauración al cargar, el estado cacheado no se autentica: se conserva la cookie y se muestra opción de reintento/recarga.
- `logout-all` sólo borra cookie si backend confirma éxito; 401 y fallos temporales preservan la sesión local para que pueda renovarse/reintentarse. Logout individual siempre limpia cookie local y ahora informa si el servidor no confirmó revocación.
- Playwright añade prueba de restauración concurrente en dos páginas, recuperación tras refresh 503, feedback de error logout/logout-all y pruebas directas de handlers para refresh 401, logout-all 401 y logout backend 503. Las tres pruebas directas pasan localmente; E2E autenticado de estos cambios pendiente de Action.
- Limitación de entorno: la exclusión entre pestañas usa Web Locks API de navegadores modernos; navegadores sin esa API usan el fallback sin coordinación. Mantener navegadores soportados en HTTPS para disponer de Web Locks.
