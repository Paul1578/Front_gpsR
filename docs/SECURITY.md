# Seguridad del frontend

- El frontend no contiene claves JWT, SMTP ni credenciales de base de datos.
- Roles y permisos efectivos los valida el backend; la UI no presenta cambios locales como autorización persistida.
- Al restaurar la sesión, frontend valida el usuario mediante `/Auth/me`; el rol cacheado ya no decide permisos.
- Al cambiar de cuenta, el contexto vacía datos de la cuenta anterior antes de exponer flota al nuevo usuario; backend conserva el aislamiento tenant como control definitivo.
- El alta de vehículos no inventa posición GPS y el mapa muestra únicamente ubicación recibida del navegador o del backend.
- Los errores de API se traducen en mensajes de fallo; el panel no marca éxito cuando la llamada falla.
- `npm audit --audit-level=low` reporta 0 vulnerabilidades.

## Pendientes

- Los tokens de acceso todavía se guardan en `localStorage`; migrar a cookies HttpOnly requiere soporte backend y decisión de despliegue.
- Rotar en ambientes remotos cualquier credencial que haya aparecido en el historial Git. El JWT y MySQL locales fueron rotados en esta sesión.
- Usar HTTPS y revisar los orígenes CORS permitidos al desplegar.
