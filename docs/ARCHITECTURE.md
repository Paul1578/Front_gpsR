# Arquitectura frontend

- Next.js/React con componentes de dominio en `src/Components/fleet`.
- Contextos para autenticación, tema y estado de flota.
- Servicios HTTP en `src/services`.
- Mapas con Leaflet y React-Leaflet.

El frontend consume la API ASP.NET Core del repositorio hermano. Los tipos de transporte deben estar separados de los modelos de UI y mapearse en un único lugar.

El flujo de ruta debe representar `origin`, `stops[]` y `destination` sin duplicar origen/destino dentro de las paradas de UI.

## Sesión y acceso a la API

- `src/Context/AuthContext.tsx` conserva el access token sólo en memoria; borra cualquier `auth_tokens` legado de `localStorage`.
- Los Route Handlers de `src/app/api/auth/` aíslan la respuesta de autenticación del backend: el refresh token se guarda en una cookie HttpOnly y el navegador recibe sólo el access token.
- Los endpoints de refresh rotan el token mediante ASP.NET. Una sesión legacy se migra por `/api/auth/migrate`; después las llamadas normales conservan el contrato Bearer hacia `/api/backend`.
- Los Route Handlers exigen `Origin` same-origin y respuestas `no-store`. Logout y logout-all limpian la cookie y revocan refresh tokens con el backend.

## Edición de miembros de equipo — 2026-11-22

AuthContext.updateUserProfile envía nombre, apellido y username a PUT /Users/{id}/profile. Email es inmutable desde Gestión de Equipo. Tras éxito, equipo y Drivers se refrescan independientemente; un fallo de refresco se informa como sincronización incompleta y no oculta que el guardado ocurrió.

### Concurrencia de sesión entre pestañas

- `AuthContext` usa la Web Locks API para serializar mutaciones de la cookie de sesión en el mismo origen y comparte cambios de identidad mediante el evento `storage`; cada pestaña vuelve a validar el usuario con `/Auth/me`.
- Un 401 de refresh no elimina cookie desde el BFF porque puede ser una respuesta tardía de una rotación concurrente. `logout-all` elimina cookie sólo tras respuesta 2xx; logout individual limpia el navegador siempre y muestra advertencia si el backend no confirma revocación.
- Ante refresh temporal 5xx/429/conectividad, una sesión activa se conserva para reintentar. Una restauración inicial no autentica desde datos cacheados; conserva cookie y orienta a recargar.
