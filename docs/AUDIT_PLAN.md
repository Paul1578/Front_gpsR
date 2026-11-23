# Auditoría integral de FletFlow

## Corte adicional — 2026-11-23

- Front `78b7974` pasó Action [`45259999638`](https://github.com/Paul1578/Front_gpsR/actions/runs/45259999638): 69 E2E, axe 2/2, responsive, audit/lint/build, backend 165 xUnit y API/MySQL. Backend docs HEAD `5c53dd0` pasó [`45259991285`](https://github.com/Paul1578/Back_GPS/actions/runs/45259991285).
- Front `0bb20c8` publicado; Action integrada [`45263308491`](https://github.com/Paul1578/Front_gpsR/actions/runs/45263308491) pasó build, lint, audit, responsive y axe, mientras ejecuta E2E autenticado/API/MySQL. Incluye corrección del baseline 503 y pruebas accionables de filtros de ruta a 320 px.
- Un cambio local en proceso cubre Perfil expandido a 320 px, añade labels/`autocomplete` a campos de contraseña y corrige tildes; lint/build/discovery pasan y el diff espera una Action integrada. La prueba real depende del entorno CI con credenciales QA y MySQL efímera.
- Admin delegado real combina UI restringida, 403 de creación/promoción y persistencia sin cambios. Responsive de Equipo ya maneja búsquedas/filtros reales y paginación en dispositivos estrechos. Continuar con Perfil/contenido largo y revisar cada superficie CRUD contra estados de error y vacío.
- Auditoría backend read-only revisó controladores y regla unlink. El owner nulo se interpreta como cuenta raíz; un Admin delegado heredado con owner nulo es una precondición condicional ya documentada en backend `docs/SECURITY.md`, no un caso confirmado en los datos actuales.
- Mantener abierta la misión; después de probar este lote en CI continuar con los casos anteriores y actualizar el corte, changelog, handoff y registro de errores.

Estado: los flujos principales de flota, roles/tenant, rutas con operaciones, seguimiento, evidencia y responsive web están implementados y comprobados en CI. Front `52aa90b` pasó **69/69 E2E**, axe **2/2**, responsive, audit/lint/build y Backend Release/xUnit **165/165** en Action [`45254654316`](https://github.com/Paul1578/Front_gpsR/actions/runs/45254654316). Backend `a1c78df` pasó migration smoke, tenant SQL-like/API/MySQL, concurrencia, rate limit y Release/xUnit en [`45253546602`](https://github.com/Paul1578/Back_GPS/actions/runs/45253546602) y [`45253557375`](https://github.com/Paul1578/Back_GPS/actions/runs/45253557375); HEAD documental posterior `4993e3c` también se validó en sus Actions.

## Corte vigente — 2026-11-23

- Ramas de trabajo: Front `refactor/route-builder` y Backend `chore/stabilize-fleet-platform`; `main` permanece intacta.
- Decisiones confirmadas: sólo la cuenta raíz crea/promueve Admin; se permiten rutas de traslado sin operaciones; cada parada admite recogida, entrega o ambas; unlink conserva Driver y se bloquea con rutas pendientes/en progreso; la app nativa se pospone y la web responsive permanece en alcance.
- La Action vigente [`45254654316`](https://github.com/Paul1578/Front_gpsR/actions/runs/45254654316) probó Front `52aa90b`: **69/69 E2E**, axe **2/2**, responsive **1/1**, audit/lint/build, Backend Release/xUnit **165/165**, API/MySQL y teardown.
- Backend `74d2f3c` y Front `bb9f679` implementan listas de rutas sin payload Base64 de imágenes y lectura completa bajo demanda. Backend Release/xUnit **158/158**, smokes HTTP/MySQL y Front **53/53 E2E**, responsive, audit/lint/build pasan en Actions [`45190701729`](https://github.com/Paul1578/Back_GPS/actions/runs/45190701729), [`45192161720`](https://github.com/Paul1578/Back_GPS/actions/runs/45192161720) y [`45192189779`](https://github.com/Paul1578/Front_gpsR/actions/runs/45192189779).
- Front `13669f3` refleja en sus tipos que las fotos de los DTO de lista tienen `content=null`. Action [`45193357694`](https://github.com/Paul1578/Front_gpsR/actions/runs/45193357694) pasó: **53/53 E2E autenticados**, responsive **1/1**, audit/lint/build, Backend Release/xUnit **158/158**, smokes API/MySQL y cleanup.
- El flujo prueba que la lista omite Base64 y el detalle conserva la foto; Historial y Mi Ruta cargan el detalle bajo demanda. Suite local: 19 passed y 34 omitidos por requerir credenciales/fixtures, cubiertos en CI.
- Pendientes externos de despliegue: credenciales SMTP vigentes; configurar IPs reales del ingress y volumen/certificado de Data Protection; distribución del contador rate limit si se despliegan varias réplicas; validar despliegue productivo. Móvil nativo está fuera de esta fase por decisión del usuario.
- Los errores recientes del fixture Logistics y confirmación de baja Manager se resolvieron y documentaron en `docs/ERROR_LOG.md`; la repetición integrada completa pasó.
- Los errores nuevos de baseline obsoleto del E2E de perfil, nombres accesibles/microcopy y cobertura móvil extendida quedan documentados en `docs/ERROR_LOG.md` con causa y prevención.
- Criterios funcionales de esta fase: compilación, ejecución local, CRUD de flota, permisos/tenant, rutas/paradas, seguimiento/evidencia, estados UI y responsive cubiertos por pruebas locales y Actions; revisar `TESTING.md` para evidencia específica.
- Pendientes externos: conseguir credenciales SMTP vigentes; decidir y configurar dominio/TLS, IPs reales del ingress, volumen protegido y persistente de Data Protection, además de rate limit distribuido si se habilitan varias réplicas. No se puede verificar despliegue productivo sin esos recursos. Móvil nativo quedó fuera de esta fase por decisión del usuario.
- Errores de implementación y pruebas anteriores, con causas, correcciones y prevención, están registrados en `ERROR_LOG.md`; las entradas antiguas son historial, no pendientes vigentes salvo que se repitan en esta sección.
- Hallazgo de configuración local: el fallback del proxy Next estaba en `:5048` pese a que el perfil ASP.NET usa `:5046`; ahora está alineado y existe `.env.example` sin secretos. Action [`45195812271`](https://github.com/Paul1578/Front_gpsR/actions/runs/45195812271) pasó audit/lint/build, responsive 1/1, 53/53 E2E, backend 158/158, API/MySQL y cleanup.

## Alcance

Se auditan dos repositorios relacionados:

- Frontend: `/home/leonardo/Front_gpsR`
- Backend: `/home/leonardo/Back_GPS`

El trabajo se realiza en ramas separadas de `main`:

- Frontend: `refactor/route-builder`
- Backend: `chore/stabilize-fleet-platform`

## Orden de trabajo

1. Auditoría de arquitectura y reglas de negocio.
2. Recuperación del entorno local y compilación reproducible.
3. Contrato real entre frontend y backend.
4. Seguridad y autorización por empresa/rol.
5. Modelo operativo de rutas y paradas: recogida, entrega o ambas.
6. Flujos principales: usuarios, vehículos, conductores, rutas y seguimiento.
7. Pruebas automatizadas y funcionales.
8. Documentación de errores, decisiones y operación local.

## Criterios de cierre

- Backend compilando y ejecutándose contra MySQL.
- Frontend compilando y ejecutándose contra la API real.
- CRUD principal persistido en base de datos.
- Permisos comprobados por rol y empresa.
- Una ruta puede contener múltiples paradas con operación combinable.
- Estados de carga, error, vacío y confirmación visibles.
- Pruebas documentadas y errores conocidos registrados.

## Alcance móvil confirmado

El usuario aclaró que la app móvil nativa queda para después. Esta fase requiere web responsive en escritorio/tablet/móvil. El stack real del repositorio es Next.js 16 + React 19, no React Native/React Native Web; no se hará una migración de stack durante este refactor.

## Actualización integrada — 2026-11-22

### Corte actual de las ramas — 2026-11-22

- Backend `52d7e46` pasó Action `45066082294` con build/xUnit 107/107 y registro neutral; documentación `029011e` pasó `45066471076` con HTTP/MySQL tenant y concurrencia.
- Front `57e44c6` pasó Action `45066249833`: audit/lint/build, responsive 1/1, backend 107/107, E2E API/MySQL 33/33 y cleanup.
- Backend `7614ad5` amplía localmente el smoke MySQL de vehículo: edición, estado operativo separado de `IsActive`, baja y reactivación; smoke efímero, bash syntax y cleanup pasaron. CI pendiente.
- Front agrega búsquedas de equipo/conductores, hace accesible al Admin de empresa el panel acotado a tenant (sin import/reset/logs falsos) y prueba edición/cancelación de rutas a 320/768. Lint/build/audit y discovery 35 pasan; E2E autenticado del nuevo lote pendiente.
- Sigue sin resolver la política de promoción a Admin delegado; no cambiarla sin decisión. También continúa cobertura HTTP/MySQL de vínculo manual User↔Driver. SMTP/infra productiva son externos y app nativa está aplazada.

- Front `50bf9d0` Action `45058535602`: audit/lint/build, responsive **1/1**, backend Release/xUnit, Playwright API/MySQL **33/33** y cleanup pasaron.
- Backend `22c2fb6` Action `45058536309`: Release build/xUnit, aislamiento tenant HTTP/MySQL, concurrencia y cleanup pasaron. Localmente xUnit **99/99** y smokes tenant/concurrency exit 0.
- Cerrados este pase: Manager crea desde UI una ruta multi-punto con Delivery y la persiste; constructor móvil 320/tablet 768; alta Manager/Logistics responsive; edición/estado User a 320; logout no revoca refresh ajeno.
- Continúan abiertos otros recorridos CRUD/roles/responsive, Super Admin y privilegio de Admin delegado sin política acordada, y preparación de despliegue. No declarar completa la misión.

## Resumen de la misión

El texto completo quedó disponible el 2026-11-21. Incluye arquitectura, seguridad, aislamiento tenant, CRUD, responsive, E2E y documentación. SMTP real es la limitación funcional externa acordada; las tareas de pruebas y preparación para producción pendientes quedan listadas abajo.

## Resultados verificados 2026-11-21

- Frontend lint/build/audit npm correctos; backend Release 45/45; DB local 22 migraciones.
- E2E API autenticado: registro ignora rol Admin solicitado; Admin crea/lista vehículo, otro tenant obtiene 404 y listado aislado, User recibe 403. Fixtures QA limpiados.
- Runtime frontend/API: rutas protegidas anónimas 401, dashboard/login/Swagger 200.
- Dos revisiones independientes reales (backend y frontend) completadas. Límite de hilos impidió crear cinco agentes.
- Chrome E2E autenticado cubrió Vehicle create/search/edit/baja lógica; Driver edit/baja/filtro/reactivación; User sin controles/403; Manager→Logistics con Rutas 200 y Vehicles 403. Equipo 390×844 sin overflow. E2E previos cubren constructor y Driver operativo.

## Pendiente

- Configurar y validar el despliegue real: dominio/TLS, IPs confiables del ingress, volumen persistente y protegido de Data Protection, y rate limiting distribuido antes de escalar a varias réplicas.
- Envío real de correo requiere credenciales SMTP válidas; recuperación y activación conservan el flujo y registran fallos sin afirmar envío.
- App nativa pospuesta por solicitud del usuario; responsive web permanece en alcance.

## Validación integrada — 2026-11-23

- El constructor de rutas y búsqueda geográfica está validado en Action `45092540906` (Front, 40/40 E2E).
- El smoke HTTP/MySQL cubre recogida, entrega y operación combinada con evidencia por parada. CI integrado vigente valida el conjunto con backend Release/xUnit 165/165 y frontend 67/67.
- El usuario confirmó permitir traslados sin recogida/entrega; la regla está documentada en `BUSINESS_RULES.md`.

## Hallazgos corregidos y controles de despliegue — 2026-11-23

- Front: corregidos detalle incompleto de operaciones del Historial, vacío mostrado durante carga y respuesta antigua de polling/foco; casos focales locales y Actions integradas vigentes pasan.
- Seguridad backend: contraseñas nuevas requieren mínimo 12 caracteres y el login tiene límite específico por IP sin bloqueo de cuenta; verificar evidencia vigente en `SECURITY.md`/`TESTING.md`.
- Infraestructura Data Protection y despliegue productivo siguen pendientes de verificación.
