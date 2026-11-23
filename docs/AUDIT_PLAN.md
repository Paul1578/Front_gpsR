# Auditoría integral de FletFlow

Estado: en curso; funcionalidades principales implementadas y verificadas con tareas de aceptación enumeradas al final.

## Corte vigente — 2026-11-23

- El usuario confirmó que sólo la cuenta raíz puede crear/promover al rol Admin. Backend `be84496` expone `isRootAccount` en `/Auth/me`; Action `45090274537` pasó pruebas Release 113/113 y smoke HTTP/MySQL.
- Front `e262180` aplica la visibilidad de “Gerente” con ese campo. Action `45090273209` falló **39/40** sólo por locator E2E exacto: la traza muestra la opción visible con nombre accesible compuesto. Selector corregido para aceptar descripción y assert de identidad raíz añadido; integración aprobada en `45091340306` (40/40).
- Front `9d84562` pasó Action `45091340306` con **40/40 E2E**, checks responsive, audit, lint/build y backend Release/xUnit. El selector root-only y `/Auth/me` se validaron en navegador real.
- La aplicación móvil nativa queda para después; esta fase requiere web responsive. SMTP real depende de credenciales externas actualizadas.
- La auditoría y los criterios funcionales siguen abiertos. Este corte reemplaza las notas antiguas que indicaban que la política Admin delegado esperaba decisión.
- Auditoría adicional de rutas: final review omitía orden/detalle/tipo operativo por parada y el buscador permitía que una respuesta antigua alcanzara otro punto. Fixes locales en revisión añaden secuencia visible, coordenadas, cancelación/invalidación por destino, cobertura de búsqueda vacía/error/tardía y retry tras error al crear. CI aún pendiente.
- Decisión de negocio pendiente del usuario: si rutas sin operaciones (sólo traslado) son válidas. No endurecer el backend hasta definirlo. Ampliar también el ciclo integrado de varias paradas hasta cierre.

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

- Completar casos visuales menos frecuentes de rutas, historial y permisos; los CRUD Vehicle/Driver y roles User/Logistics ya tienen E2E representativo.
- SMTP real, credenciales y configuración HTTPS de producción; antes de escalar, cookies HttpOnly, rate limiting distribuido y object storage.
- App nativa pospuesta por solicitud del usuario; responsive web permanece en alcance.

## Validación siguiente — 2026-11-23

- El constructor de rutas y búsqueda geográfica está validado en Action `45092540906` (Front, 40/40 E2E).
- Se amplió el smoke HTTP/MySQL del backend para completar recogida, entrega y operación combinada con evidencia por parada; ejecución local en entorno desechable pasó. Falta Action para el nuevo SHA.
- La decisión de permitir rutas sin recogidas/entregas sigue pendiente de respuesta. Mantener la validación actual sin cambios hasta recibirla.

## Hallazgos corregidos / controles pendientes — 2026-11-23

- Front: corregidos detalle incompleto de operaciones del Historial, vacío mostrado durante carga y respuesta antigua de polling/foco; E2E local 2/2 y build/lint correctos. Nueva Action integrada pendiente.
- Seguridad backend: las validaciones permiten contraseña nueva de 6 caracteres y el limitador genérico da 60 requests/min por IP, sin control específico de login/cuenta. Revisar endurecimiento sin introducir bloqueo de cuentas explotable para denegación de servicio.
- Infraestructura Data Protection y despliegue productivo siguen pendientes de verificación.
