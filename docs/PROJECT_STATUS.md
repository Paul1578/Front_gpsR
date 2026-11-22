# Estado del proyecto

Fecha de actualización: 2026-11-21.

## Ramas

- Frontend: `refactor/route-builder`.
- Backend relacionado: `chore/stabilize-fleet-platform`.
- `main` no se modifica directamente.

## Estado actual

- Constructor visual de rutas con origen, paradas intermedias múltiples, destino y operación recogida/entrega/ambas.
- Ejecución Driver conectada a estado y evidencia persistida por parada; fin de ruta valida estado y evidencia.
- Mapa usa GPS real del navegador o posición guardada; se eliminó movimiento ficticio.
- `npm run lint`, `npm run build` y `npm audit` correctos (0 vulnerabilidades reportadas); coordinadas ficticias y notificaciones de muestra retiradas.
- Backend .NET 8 y suite actual correctos: 45/45; MySQL activo y migración tenant aplicada.
- E2E HTTP/MySQL probó ruta con recogida+entrega, evidencia, GPS y cierre; filas temporales borradas.
- Chrome headless confirmó creación real de ruta en la UI (cuatro pasos): mapa con marcadores A/B/1, asignación de vehículo y conductor, revisión, guardado y lectura autenticada de los 3 puntos con operación `PickupAndDelivery` persistida.
- Alta de Driver envía datos completos en una sola operación y muestra aviso si el servidor no pudo entregar correo.
- Equipo permite editar datos de Driver y darlo de baja/reactivarlo; inactivos aparecen bajo demanda. Miembros inactivos siguen disponibles para reactivación tras recargar.
- Cambio de rol usa una operación API transaccional y la UI muestra el resultado; los permisos se determinan por rol.
- Chrome Admin CRUD confirmó alta/edición de vehículo y alta de Driver, asignación y desasignación del vehículo desde Gestionar choferes. SMTP sin credenciales muestra aviso explícito.
- Se detectó y corrigió en backend la policy de rutas que excluía Logistics; el rol ahora existe en seed y responde 200 en rutas, mientras User queda en 403.
- Chrome Admin comprobó ciclo de equipo: crear Manager, cambiar rol a Logistics, persistencia tras recarga, desactivar/reactivar; la prueba DB quedó limpia. UI ahora sólo comunica éxito si la API confirma rol/estado; permisos son por rol y ya no aparece un editor local engañoso.
- E2E Driver en Chrome móvil: iniciar ruta, agregar evidencia persistente, completar parada/ruta; API confirmó vehículo disponible. Otro Driver quedó bloqueado de la ruta ajena.
- Login responsive y dashboard móvil comprobados en Chrome headless (390×844, sin overflow); creación completa de rutas comprobada en escritorio.
- Tablet 768×1024 comprobada en dashboard, equipo, vehículos, lista de rutas y constructor; sin overflow, el clic del mapa colocó el origen.
- SMTP no operativo mientras falten credenciales válidas.
- Rol API `User` mapea a cuenta sin permisos operativos; ya no hereda permisos de Logistics ni provoca llamadas 403 en dashboard.
- Alta y edición de rutas delegan la asignación del vehículo al comando backend en el mismo commit de la ruta.
- Listado incluye búsqueda/filtros por estado, vehículo y conductor; guardar bloquea dobles envíos y borrar respeta resultado de API.
- Errores de carga de rutas/vehículos se muestran en vez de presentar cifras cero como datos válidos; Dashboard y Rutas permiten reintentar.
- Panel administrativo identifica el alcance de empresa y creación evalúa `result.ok`/estado de invitación correctamente.
- `npm run lint`, `npm run build`, `npm audit --audit-level=low`: correctos (0 vulnerabilidades); dashboard local responde 200.
- El usuario confirmó que la app móvil nativa queda para una fase posterior; responsive web sí está dentro de esta fase.
- Revisión independiente de riesgos UX integrada: ubicación inexistente eliminada, errores de seguimiento visibles con reintento, geometría aproximada etiquetada y timeout en restauración de sesión.
- Chrome E2E Admin: edición de conductor persistida, baja, filtro “Mostrar bajas” y reactivación persistida; viewport 390×844 sin overflow horizontal.
- Chrome E2E User: aviso de permisos operativos, controles Equipo/Rutas ocultos y API devuelve 403 para ambos recursos.
- Chrome E2E Logistics: menú de Rutas visible, Equipo/Vehículos ocultos; API Routes 200 y Vehicles 403.
- Chrome E2E Vehicle: crear, buscar/sin resultados, editar con persistencia y baja lógica; API conserva el histórico inactivo fuera de la lista activa.
- Verificación final 2026-11-21: lint, build Next de producción y `npm audit --audit-level=low` correctos (0 vulnerabilidades); backend relacionado pasa 45/45 pruebas Release.
- CI backend ahora corre `dotnet test` después del build.
- CI frontend añadido para instalar desde lockfile, auditar dependencias, ejecutar ESLint y compilar Next.js en Node 22.
- Suite Playwright repetible añadida: login negativo, CRUD Admin de vehículo móvil, edición de ruta preservando la operación con Driver de equipo visible, y permisos User verificados en UI/API; ejecución autenticada local 4/4 y fixtures retirados físicamente por runner protegido.
- Suite Playwright ampliada y repetida: 5/5. A 390×844, Admin recorre los cuatro pasos de edición de ruta, conserva `PickupAndDelivery`, cancela la ruta y valida Historial/filtro/detalle. También crea/edita/da de baja/reactiva un Driver desde Equipo; User recibe 403 y UI oculta operaciones. Cleanup MySQL confirmó cero fixtures.
- Alta de usuario ahora cierra el modal tras un POST exitoso y no deja que un error de refresco revierta visualmente la confirmación. Cambiar rol Driver↔Logistics refresca los perfiles Driver y mantiene la lista consistente. El rate limit de API en loopback está deshabilitado sólo en Development; fuera de Development continúa activo.
- E2E API autenticado de cierre: registro ignora rol Admin, API Admin 200, Vehicle POST/list 201/200, otro tenant recibe 404 y lista sin datos ajenos, rol User 403; cleanup QA completado.
- Frontend y API reiniciados con artefactos actuales: `/dashboard`, `/login`, `/` y Swagger 200; proxy protegido 401.

## Pendiente

1. Completar E2E visual de otras vistas y acciones restantes; Historial ya tiene prueba móvil de filtro/detalle, pero todavía no se cubre cada vista ni cada acción de equipo/rutas.
2. Configurar SMTP con credenciales vigentes; las credenciales DB/JWT locales ya fueron rotadas en backend. Validar cualquier entorno remoto por separado.
3. Ejecutar en GitHub el E2E frontend+API/MySQL ahora integrado al workflow con fixtures efímeros; ampliar vistas/acciones responsive aún no cubiertas. Mover fotos de JSON a almacenamiento de objetos antes de producción a escala.

## Actualización de cierre E2E — 2026-11-21

- Creación visual de ruta desde mapa móvil cubre origen, dos paradas con operaciones recogida y recogida+entrega, destino, asignación de recursos, orden persistido y borrado confirmado desde la UI. Suite Playwright Chrome/API/MySQL: 7/7.
- El test encontró un nombre de parada colapsado a ancho cero en móvil. La fila ahora envuelve controles y mantiene un mínimo editable de 130 px.
- CI incluye una comprobación Playwright responsive no mutante del inicio de sesión. Los E2E autenticados no están conectados aún a CI.
- Pendientes precisados: otras vistas/acciones responsive, matriz autenticada HTTP/tenant en CI y credenciales SMTP vigentes.

## Aislamiento entre empresas — verificación HTTP/MySQL — 2026-11-21

- Playwright provisiona un segundo tenant QA raíz y verifica que el Admin de esa empresa no vea Vehicles, Drivers ni Routes de la primera.
- En HTTP real, lecturas por ID y cambios/bajas cruzados de Vehicle, Driver y Route devuelven 404; crear una ruta con vehículo/conductor ajenos también devuelve 404.
- Las posiciones se prueban con una ubicación persistida: el tenant propietario recibe la posición; el otro obtiene `[]` (200) y no puede registrar posiciones (404).
- Suite Chrome/API/MySQL final: **8/8**; cleanup SQL dejó cero cuentas, vehículos, conductores, rutas QA y refresh tokens activos.

## Verificación final de esta continuación — 2026-11-21

- Frontend: lint, build Next.js de producción, `npm audit --audit-level=low` (0 vulnerabilidades), Playwright autenticado 8/8 y `git diff --check` correctos.
- Backend: Release 48/48, build con 0 warnings/0 errors, auditoría NuGet sin vulnerables y `git diff --check` limpio.
- Servicios locales: dashboard 200, Swagger 200, endpoint protegido sin sesión 401. `.env.local` tiene modo 0600.
- MySQL: 22 migraciones; cero usuarios/vehículos/Drivers/rutas QA y cero refresh tokens activos.
- La misión sigue en curso: faltan E2E autenticado en CI, más vistas/acciones responsive y configuraciones externas de SMTP/producción.

## CI API/MySQL actualizado — 2026-11-21

- El workflow del backend ahora levanta MySQL 8 y ejecuta un smoke HTTP autenticado cross-tenant para Vehicles, Drivers, Routes y RoutePositions. La ejecución equivalente local pasó en una base descartable aislada; el workflow remoto aún no ha corrido porque las ramas feature no están publicadas.
- Frontend: workflow ahora clona la rama backend de estabilización, levanta MySQL/API aislados y corre los ocho escenarios Playwright autenticados, además de lint/build/audit. La ejecución local de ese runner pasó 8/8; falta publicar ramas y comprobar Actions.
- SMTP requiere credenciales vigentes del entorno. App nativa móvil pospuesta por el usuario; web responsive continúa en alcance.
- PRs borrador publicados: frontend #2, backend #5. Backend Actions pasó; primer frontend run reveló precheck de Next prematuro y actions con runtime Node 20 deprecado; correcciones ya empujadas están pendientes de nueva ejecución.

## Actualización CI y mapa — 2026-11-21

- Playwright autenticado local Chrome/API/MySQL volvió a pasar **8/8** en una base efímera; el cleanup eliminó el esquema. El caso móvil valida origen, dos paradas y destino, incluyendo recogida y recogida+entrega.
- Se corrigió la falsa seguridad de la aserción de coordenadas y se estabilizó el encuadre del mapa durante las selecciones. Lint y build de producción pasan.
- Pendiente: publicar los cambios para que Actions repita el frontend; ampliar pruebas visuales de CRUD, roles y vistas responsive no cubiertas. SMTP requiere credenciales externas vigentes. App nativa móvil pospuesta por decisión del usuario.

## Cobertura de roles, tablet y errores API — 2026-11-21

- Equipo ya distingue errores de `/Users/my-team` y `/Drivers` de resultados vacíos; ambas vistas permiten reintentar y cierran correctamente el estado de carga.
- Playwright amplió pruebas reales: tablet 768×1024, roles User/Driver/Logistics, denegaciones API y fallo/recuperación de carga. Suite autenticada **12/12** con Chrome/API/MySQL; fixtures en base descartable eliminados.
- Aún faltan otras pantallas/acciones responsive y CRUD; se mantienen como trabajo activo. SMTP requiere credenciales externas. Móvil nativo se hará después por decisión del usuario.
- El workflow remoto frontend terminó verde: run `44974312596` para commit `4b60bf1` (12 casos Playwright autenticados, audit, lint y build). Debe repetirse al actualizar el backend con la protección de concurrencia recién añadida.
- El backend publicó `90da59a` en `chore/stabilize-fleet-platform`, incluyendo locks para concurrencia de rutas/vehículos/Drivers; Actions frontend debe usar este commit en su checkout cruzado y volver a validar.

## Actualización — Historial, filtros y asignación de flota — 2026-11-21

- Historial ahora resuelve conductores por `driverId`, distingue planificación de timestamps reales y permite reintentar errores de API.
- Playwright añadió filtros combinados/búsqueda/limpieza de rutas y asignación/desasignación de vehículo con verificación de persistencia. E2E local Chrome/API/MySQL: **13/13**; base temporal limpiada. Lint y build local correctos.
- Próximo paso inmediato: publicar cambios y verificar Actions sobre el commit exacto. Pendientes de alcance: aumentar cobertura CRUD y responsive de vistas restantes; el contrato no define rol Super Admin global. SMTP requiere credenciales externas; aplicación nativa móvil pospuesta por el usuario.

## Estabilización adicional de cuentas, rutas y CRUD de vehículos — 2026-11-21

- La baja de usuario revoca refresh tokens y JWT consulta que la cuenta siga activa; `/Auth/refresh` rechaza usuarios dados de baja. Smoke real confirmó 401 en access y refresh ya emitidos.
- Backend evita iniciar ruta con vehículo inactivo, borrar ruta en progreso, desasignar Driver en curso o dar de baja vehículo ligado a conductor/ruta activa. Updates concurrentes de paradas ahora se serializan por ruta.
- Vehículos dados de baja pueden reactivarse desde API y UI; la interfaz lista las bajas con error/reintento. E2E verificó persistencia.
- Gestión de Equipo muestra el mensaje real del API al fallar alta en vez de atribuir todo a usuario duplicado.
- Validación local actual: backend Release **50/50**, build 0 warnings/0 errors; smoke tenant/auth e invariantes/concurrencia MySQL aprobados; frontend lint/build y npm audit (0 vulnerabilidades) correctos; Playwright Chrome/API/MySQL **14/14**, base descartada.
- Commit anterior `dc8b697` pasó Frontend Actions run `44977358352`; este conjunto posterior aún debe commit/push y validar Actions en ambas ramas.
- Pendientes: matriz HTTP exhaustiva de roles Manager/Logistics/Driver en mutaciones, CRUD y responsive de vistas/acciones aún no recorridas; Super Admin global no está definido por el backend. SMTP necesita credenciales externas válidas; app nativa móvil está pospuesta.

## Corte adicional de validación — 2026-11-21

- Gestión de Equipo permite asignar el rol `Usuario` al crear o cambiar una cuenta.
- Mi Perfil informa errores de `logout-all` y conserva la sesión local cuando el backend no confirma la revocación.
- Playwright autenticado Chrome/API/MySQL: **14/14**; rol Usuario creado y verificado en persistencia, perfil responsive y error de revocación cubiertos. Base efímera descartada.
- Lint, build Next.js y auditoría npm sin vulnerabilidades confirmados después del último cambio de selector; Playwright final autenticado pasó 14/14.
- Pendiente validar este SHA en Actions y continuar cobertura de otros CRUD/responsive; SMTP requiere credenciales externas y la app nativa está pospuesta. La misión sigue abierta.
- Backend HTTP smoke extendido y pasado: Manager crea flota/ruta y edita rutas; Logistics puede gestionar rutas pero no vehículos/conductores; User/Driver no crean rutas. MySQL temporal se descartó.
- Registro público con intento Admin queda como User (403 en flota); logout-all real responde 200 y revoca refresh (401).

## CI final de la rama — 2026-11-21

- GitHub Actions frontend run `44982243409` finalizó `success` para `6e37c4d`; Actions backend run `44982244087` también pasó para `4cf62a3`.
- Frontend local: lint, build, audit de producción y Playwright autenticado Chrome/API/MySQL 14/14 aprobados. Backend: suite Release 54/54 tras agregar pruebas de recovery.
- La misión sigue abierta: ampliar pantallas y operaciones CRUD/responsive aún no cubiertas; SMTP requiere configuración externa. Móvil nativo pospuesto por decisión del usuario.

## Ampliación de lifecycle del equipo — 2026-11-21

- Playwright ahora crea un usuario `User` desde Gestión de Equipo, cambia su estado a inactivo/reactivado desde UI y comprueba ambas escrituras vía `/Users/my-team`.
- `npm run lint`, `npm run build` y `git diff --check` pasaron localmente. CI integrado ejecutará este caso contra Chrome/API/MySQL desechables tras publicar el commit.
- Misión activa; queda recorrer otras pantallas y estados responsive no cubiertos.

## Resultado del lifecycle de User en CI — 2026-11-21

- Run frontend Actions `44982723150` terminó `success` para `96caf15`; validó lint, build y Playwright integrado con API/MySQL temporal, incluyendo crear User, darlo de baja y reactivarlo desde UI con persistencia.

- Verificación posterior a la actualización backend `cff33c6`: Actions frontend `44983346765` pasó lint/build/audit, 1/1 responsive browser y **14/14** Playwright autenticado contra Chrome/API/MySQL. Incluyó la migración y las nuevas operaciones del equipo.

- Actions frontend `44983694110` terminó `success` para `0236c49` contra backend actualizado: responsive browser **1/1**, Playwright Chrome/API/MySQL **14/14**, lint/build/audit verdes.
