# Pruebas frontend

## Comandos y resultados

- Cierre 2026-11-21: lint, build de producción Next y npm audit (`--audit-level=low`) correctos, 0 vulnerabilidades.
- Backend asociado: `dotnet test BackEnd_Gps.sln --configuration Release --no-restore`, 47/47.
- Chrome Admin E2E: editó un conductor, verificó persistencia por API, lo dio de baja, lo encontró con “Mostrar bajas”, lo reactivó y verificó estado. Viewport 390×844 sin overflow.
- Chrome User E2E: el dashboard informa que no tiene permisos operativos y oculta Equipo/Rutas; API Vehicles/Routes respondió 403. E2E previos del constructor/Driver y tenant siguen abajo; fixtures de esta pasada fueron eliminados.
- Chrome Logistics E2E: Manager cambiado a Logistics; rutas visibles y API 200, Equipo/Vehículos ocultos y API Vehicles 403; fixture eliminado.
- Chrome Vehicle E2E: alta, búsqueda y vacío sin coincidencias, edición verificada por API y baja lógica; GET por ID conserva `isActive=false`, `onlyActive=true` lo excluye. Fixture limpiado.
- CI frontend añadido: `npm ci`, `npm audit --audit-level=low`, lint y build en Node 22 para push/PR a `main`.
- Playwright está integrado (`npm run test:e2e`) con cinco escenarios: credenciales inválidas/error legible y layout móvil; CRUD vehículo Admin en 390×844; edición de ruta preservando operación; permisos User en UI/API; CRUD de Driver desde Gestión de Equipo.
- Ejecución autenticada real: 5/5 en Chrome con backend/MySQL. Admin creó/editó/dio de baja vehículo; editó una ruta con Driver de equipo recorriendo los cuatro pasos en viewport 390×844 y la API confirmó `PickupAndDelivery`; canceló esa ruta y la encontró en Historial, filtro “Canceladas” y diálogo de detalles. User no vio operaciones y recibió 403; creó Driver desde UI, verificó el aviso SMTP, editó datos persistidos, lo dio de baja/reactivó y cambió su rol Driver→Logistics→Driver. API confirmó perfil inactivo/activo y la UI ocultó/reincorporó el perfil a la lista de conductores.
- Los casos móviles de rutas y Equipo verifican que no exista overflow horizontal. Runner limpió Admin/User/Driver/vehículo/conductor/ruta; conteos finales cero.
- E2E negativo real: login con credenciales inválidas muestra el error esperado. Viewport 390×844 sin overflow.
- Repetición de cierre 2026-11-21: `npm run lint`, `npm run build` y `npm audit --audit-level=low` pasaron; Next.js 16.4.6 generó las 10 páginas estáticas y npm reportó 0 vulnerabilidades.
- Configuración de navegador: Playwright toma `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` o detecta Chrome del sistema; `npm run test:e2e` sin cuenta ejecuta login negativo y salta explícitamente los tres flujos con credenciales/fixtures.
- Backend hermano repetido en Release: 45/45 pruebas aprobadas, 0 fallidas/omitidas.
- El workflow frontend parsea como YAML y ambos workflows quedan sujetos a ejecución en GitHub Actions al abrir PR/push.
- Health check posterior al reinicio persistente: `/dashboard` 200, Swagger 200, `/api/Routes` sin sesión 401. MySQL: 22 migraciones y cero usuarios, vehículos, conductores o rutas QA; cero refresh tokens activos.

- `npm run lint`: pasa sin diagnósticos.
- `npm run build`: pasa en Next.js 16.4.6.
- `npm audit`: cero vulnerabilidades conocidas en el lockfile actual.
- Chrome headless: login desktop/móvil y dashboard autenticado revisados; dashboard mostró inventario real desde API.
- Dashboard en viewport móvil 390×844: tarjetas en dos columnas, navegación compacta y sin desbordamiento horizontal.
- Chrome headless: en el constructor, el paso 2 entra con Origen seleccionado; clic en mapa actualiza coordenadas y muestra marcador `A`.
- Gestión de equipo distingue usuario creado de invitación enviada; Driver se crea una sola vez con documento/teléfono.
- `curl -i http://localhost:3000/dashboard`: HTTP 200.
- Verificación local final: dashboard/login/root 200; proxy correcto `/api/backend/Routes` devuelve 401 sin sesión, Swagger backend 200.
- Proxy de API protegido sin token: HTTP 401 esperado.
- E2E HTTP/MySQL ejecutado desde backend: recogida, entrega, evidencia, posición y cierre verificados.

## Flujos cubiertos

- Constructor de rutas de cuatro pasos: origen, paradas múltiples, destino, operación recogida/entrega/ambas.
- `DriverView`: estado visible por parada, notas/fotos persistidas y cierre sujeto a estados/evidencia.
- Edición conserva operación de puntos; el mapper conserva evidencia incluso en origen/destino.
- El mapa no simula GPS: usa geolocalización del navegador o la última ubicación persistida.
- Se retiraron porcentajes/usuarios falsos del dashboard y login; ahora se presentan conteos reales y textos de producto.

## Limitaciones

Chrome verificó login Admin y Driver, alta/edición de vehículo, gestión de usuarios/roles, creación de ruta y operación Driver móvil. Este pase también verificó visualmente edición/baja/filtro/reactivación Driver y límites del rol User. Faltan los CRUD y roles visuales no enumerados y otras vistas responsive.

La revisión independiente de frontend también pasó lint/build: eliminó una llamada a endpoint de ubicación inexistente, agregó estados de error/reintento al seguimiento, timeout de sesión y etiqueta para geometría vial estimada.

Para repetir la matriz completa: usar sólo una base local/QA descartable, iniciar API Development y web local, crear bootstrap Admin temporal `fletflow.e2e.admin.<id>@example.test`, definir `FLETFLOW_E2E_ADMIN_EMAIL/PASSWORD`, marcar `FLETFLOW_E2E_ALLOW_MUTATIONS=true` y ejecutar `Back_GPS/scripts/run-e2e-local.sh`. El runner rechaza destinos web/API no locales, provisiona el User QA e invalida la activación sólo en la base QA; elimina los fixtures por prefijos exclusivos. No conectar a producción: los endpoints implementan baja lógica y los registros requieren limpieza física para no quedar mezclados.
# Validación final del constructor (2026-11-20)

- Navegador Chrome real con sesión Admin QA: alta completa desde Gestión de Rutas, selección de origen, destino y parada mediante clics en el mapa; marcadores `A`, `B`, `1` visibles.
- Se seleccionó `pickup_and_delivery`, vehículo y conductor, se revisó el resumen y se creó desde el botón `Crear ruta`.
- API autenticada confirmó ruta persistida con 3 puntos y operaciones `[None, PickupAndDelivery, None]`. El listado mostró “Ruta creada correctamente”. Datos QA borrados en MySQL y verificados en cero.
- Resolución de la prueba: crear e inspeccionar rutas desde el navegador había quedado pendiente; el recorrido fue completado hasta la persistencia y lectura de la operación.
- Chrome Admin Gestión de Vehículos/Equipo: alta y edición de vehículo, alta de Driver con documento/teléfono, asignar y quitar vehículo; alta de Manager, cambiarlo a Logistics, recargar y confirmar el rol persistido, desactivar y reactivar. La UI reportó SMTP no enviado con claridad. SQL confirmó cero cuentas/vehículos/Drivers QA al terminar.
- El primer intento de la automatización de equipo no cambió la selección de Driver a Manager y el formulario mostró correctamente “Para chofer indica documento y teléfono”. La prueba se ajustó para seleccionar la tarjeta por texto y verificar la selección antes de enviar; el alta Manager pasó.
- Driver E2E en Chrome, viewport 390×844: login, ruta asignada visible, iniciar ruta, iniciar parada, agregar nota, recargar y confirmar persistencia, completar parada y ruta. Sin overflow horizontal; sin GPS mostró estado explícito.
- API verificó al terminar: `Completed`, punto `Completed` con evidencia, vehículo `Available`. La ruta incluye resumen de placa/marca/modelo para mostrar el vehículo sin habilitar al Driver el listado de toda la flota.
- Segundo Driver del mismo tenant: no recibe rutas en la lista; detalle ajeno 403 y cambio de estado ajeno 404.
- Tablet 768×1024: dashboard, vehículo, equipo, rutas y paso 2 del constructor sin overflow horizontal; un clic real en el mapa colocó el origen `A` y actualizó las coordenadas a `-0.28152, -78.39294`.

## Verificación 2026-11-21

- `npm run lint`: correcto, sin diagnósticos.
- `npm run build`: correcto, páginas Next.js generadas.
- `npm audit --audit-level=low`: 0 vulnerabilidades.
- API Development Swagger 200; endpoint protegido sin token 401; frontend `/dashboard` 200.
- Backend xUnit 43/43 y Release build sin warnings; incluye prueba de asignación de vehículo y creación de ruta en el mismo commit.
- E2E Chrome/MySQL de Driver y User ejecutados después: cambios de Driver persisten; User no ve navegación de flota y obtiene 403.
- E2E visual Admin para gestión de conductores y E2E User se completaron con cuentas temporales en esta pasada; el smoke API también se ejecutó y todos los fixtures se limpiaron.
- La aplicación móvil nativa queda para después por decisión del usuario; el requisito actual es responsive web.

## Cierre extendido — 2026-11-21

- Playwright autenticado: **7/7** en Chrome/API/MySQL. Nuevo caso en 390×844 crea ruta desde el constructor con clics de mapa, dos operaciones de parada, asignación, lectura de cuatro puntos por API y eliminación mediante el diálogo; limpieza SQL confirmó cero filas QA.
- La primera repetición detectó que el nombre de parada no tenía ancho visible en 390 px. Se corrigió el layout flexible y la prueba completa pasó.
- CI ejecuta la prueba Playwright no mutante `formulario de inicio de sesión se adapta a móvil sin desbordarse`; el mismo caso pasó localmente con el servidor Next de producción.
- El runner local exige frontend y API ya iniciados antes de provisionar fixtures. Tras iniciar Next en `127.0.0.1:3000`, la ejecución protegida pasó.

### Cruces entre empresas por HTTP/MySQL

- Se provisionaron dos cuentas Admin raíz con tenants separados y un Driver/ruta/vehículo sólo en el tenant A.
- Tenant B obtiene listados aislados; Vehicle, Driver y Route ajenos devuelven 404 al leer, editar, cambiar estado o borrar. Crear una ruta en B enlazando vehículo/Driver de A devuelve 404.
- La ruta de A se puso en progreso y se guardó una posición. A lee una posición; B obtiene colección vacía (`200 []`) y su escritura de posición recibe 404.
- Suite Playwright completa autenticada: **8/8**. La consulta SQL final confirmó cero fixtures y cero refresh tokens activos.

### CI autenticado frontend/API/MySQL

- Workflow frontend provisiona MySQL 8, extrae el backend público desde `chore/stabilize-fleet-platform`, ejecuta build/tests backend, arranca API con credenciales efímeras y corre el runner Playwright completo.
- `scripts/run-e2e-local.sh` acepta configuración MySQL por variables, usa el cliente host y limita en CI las DB a `fletflow_ci*`; servicios locales se limitan a loopback.
- Repetición local del runner en base nueva: Playwright Chrome **8/8**. Cleanup confirmado y esquema temporal descartado.
- No se afirma ejecución en GitHub Actions: falta publicar las ramas y abrir/ejecutar sus PR.
- Las ramas se publicaron y abrieron PRs borrador (#2 frontend, #5 backend). Backend Actions pasó. Primer frontend Actions pasó todas las fases previas, pero el runner abortó porque Next aún no estaba iniciado; `playwright.config.ts` lo inicia en CI. El precheck ya se corrigió; nueva ejecución pendiente.

## E2E adicional de rutas, historial y asignaciones — 2026-11-21

- Comando: `npm run lint`, `npm run build` y `scripts/run-e2e-local.sh` con Chrome, API real y MySQL desechable.
- Resultado: lint/build correctos; Playwright autenticado **13/13**. Se cubrieron filtros combinados de rutas, búsqueda sin coincidencias, limpieza, asociación del conductor al historial, fechas planificadas frente a reales, error 503/reintento y asignar/quitar vehículo al Driver con comprobación de `vehicleId` persistido.
- La corrida usó `fletflow_ci_validation_16`; el cleanup descartó la base. Primera invocación con URL que incluía `/api` abortó en prevalidación y está documentada en `ERROR_LOG.md`; la repetición pasó usando el origen API.
- El test de error/reintento del Historial comprueba estado móvil de 390×844 sin overflow. Native mobile permanece fuera de alcance por decisión del usuario.
- Resultado remoto previo: frontend Actions `44976408960` pasó para commit `1c8856a` con la suite anterior (12 escenarios). Esta iteración 13/13 local está pendiente de publicarse y verificar en Actions.

## Verificación de autorización, concurrencia y recuperación de vehículos — 2026-11-21

- Backend Release: `dotnet test BackEnd_Gps.sln -c Release --no-restore -m:1`: **50/50**; build Release: 0 warnings/0 errores. NuGet vulnerability audit previo permanece limpio.
- En MySQL temporal `fletflow_ci_validation_stab20261121`, `smoke-tenant-http.sh` confirmó aislamiento de tenant y que desactivar una cuenta invalida access y refresh tokens (401). `smoke-route-concurrency.sh` confirmó 409 para rutas/vehículos/Driver incompatibles, inicio rechazado con vehículo inactivo, ciclo de baja/reactivación, dos escrituras concurrentes en paradas sin pérdida y estados persistidos. Ambos esquemas se eliminaron mediante trap.
- Frontend lint/build correctos; `npm audit --audit-level=low`: cero vulnerabilidades. Playwright autenticado sobre Chrome/API/MySQL: **14/14**, incluyendo mensaje de error de alta, baja/reactivación de usuario Driver, gestión móvil de vehículos con reactivación, mapa/equipo en móvil/tablet, filtros, reordenar/quitar paradas e Historial. E2E limpió fixtures y se descartó el esquema temporal.
- Una corrida intermedia obtuvo 13/14 por una carrera del propio mock 503 del Historial; se corrigió sincronizando respuesta inicial y resultado esperado. Repetición final completa: 14/14.
- La corrida de backend remota nueva y la de frontend para este lote quedan pendientes de publicar los commits siguientes.

## Corte de roles y sesiones — 2026-11-21

- `npm run lint`, `npm run build` y `npm audit --omit=dev`.
- Runner `Back_GPS/scripts/run-e2e-local.sh`, API y MySQL temporales: **14/14 Playwright**. Incluye crear una cuenta `User`, comprobar el arreglo de roles persistido, error simulado de `POST /Auth/logout-all` sin cerrar la sesión local, y overflow de perfil/equipo/mapa en móvil/tablet.
- El cleanup retiró los fixtures QA y descartó el esquema. Backend smoke de tenant/roles y concurrencia también pasó en su DB aislada.
- Actions remoto para estos cambios locales: pendiente de commit/push y ejecución.
- Backend MySQL autenticado verificó también que registro público no eleva rol (Admin pedido → User/403) y logout-all invalida el refresh (200→401).

## Resultado remoto final — 2026-11-21

- Frontend Actions run `44982243409` completado `success` en SHA `6e37c4d`; incluye checks publicados y E2E integrado.
- Backend Actions run `44982244087` completado `success` en SHA `4cf62a3`; suite local posterior ampliada a 54/54 con recovery/activación.
- Localmente frontend lint/build/audit y Playwright autenticado Chrome/API/MySQL 14/14 pasaron.

## Estado de usuario en equipo — 2026-11-21

- El E2E de Gestión de Equipo ahora crea una cuenta `User`, la desactiva y reactiva desde botones de UI, y comprueba el estado persistido usando `GET /Users/my-team` después de cada operación.
- Validación previa a CI: lint, build y `git diff --check` completados correctamente; Actions pendiente para el SHA siguiente.

- Resultado de Actions `44982723150`: `success` para `96caf15`. El caso de alta/estado/reactivación de User y el resto de Playwright autenticado pasaron contra el backend de la rama y MySQL descartable.
