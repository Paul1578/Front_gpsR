# 2026-11-22 — Correcciones de QA para administración de empresa

## Actualización posterior — cobertura de asignación y mapa

- Backend Action `45085910280` pasó build, xUnit, aislamiento multiempresa HTTP/MySQL y concurrencia; Front Action `45085920993` llegó a E2E tras audit/lint/build/responsive verdes.
- Front Action `45085920993` terminó **39/39 E2E** y responsive **1/1**; el E2E Manager mapa corrió y pasó. El fix estable de sufijo de retry aún debe probarse en nueva Action.
- Front Action `45086519736` confirmó **39/39 E2E** con el sufijo estable de mapa, responsive **1/1** y cleanup.
- Front Action `45086827516` pasó **39/39 E2E** y responsive **1/1** con la cobertura adicional de cancelar baja Vehicle.
- Gestión de vehículos identifica su tarjeta por VehicleId y da nombre accesible al botón de baja; el E2E añade cancelación de confirmación y usa selectores semánticos.
- `UpdateDriverCommand` ahora comparte el bloqueo de asignación y re-lee el Driver antes de guardar para preservar cambios concurrentes de `VehicleId`.
- Alta Driver desde administración se verifica con User y perfil Driver persistidos; la lista omite `ID:` vacío si el DTO no trae identificación.
- Búsqueda E2E de choferes usa ID de Driver y `data-testid` por registro; se añade E2E Manager mapa desktop/tablet/móvil web con fixtures API.
- Validación Front local: lint/build/discovery 39/diff-check pasan. xUnit Release y CI integrada pendientes.
- Actions `45084368342` y `45084699175` pasaron los otros **38 E2E**, incluidos alta empresa, búsqueda responsive y CRUD/asignación SQL Driver; el test Manager mapa se está aislando de fixture compartido y la navegación responsive.
- El fixture Manager mapa reutiliza un sufijo estable del runner para que un retry tras reinicio de worker pueda limpiar recursos del intento anterior.

- Resolución integrada en Action `45076629351` (`2147be7`): **37/37 E2E**, responsive **1/1**, audit/lint/build y cleanup API/MySQL correctos. Los fallos 503 de usuarios y flota permanecen independientes hasta sus respectivos reintentos.
- El panel Driver se prueba sin mutaciones a 320/768 px; los estados de error no se convierten en ceros.

## 2026-11-22 — CRUD de pantalla dedicada de conductores — asignación persistida en investigación

- Auditoría encontró que `DriversManagement` ofrecía alta, edición, asignación, desasignación y baja/reactivación pero su E2E sólo hacía búsqueda.
- Se agregó un flujo a 320/768 px y verificación de persistencia con API autenticada. Lint/build y discovery 38 pasan local; falta Action integrada.
- Action `45078351055` ejecutó 37/38; el fallo fue un Vehicle creado después de hidratar FleetContext. Se agregó reload del dashboard antes de navegar al CRUD; nueva Action pendiente.
- Action `45079269083` ejecutó 37/38; el locator por documento coincidía con otras tarjetas al repetir el texto de placa en sus selectores. Se diferenció placa/documento y el test ahora ubica por ID leído desde API.
- Action `45080069469` falló la lectura persistida posterior a una asignación; `45080342001` terminó success con ese caso marcado flaky (fallo inicial, retry aprobado). El siguiente test compara el GET directo del API con el acceso vía rewrite Next para aislar el origen.
- Action `45081264602` mostró que falla también el GET directo (no es la rewrite). El nuevo E2E consulta `Drivers.VehicleId` en el MySQL temporal para decidir si la pérdida ocurre al escribir o al leer.
- Action `45081992619` confirmó VehicleId NULL en SQL tras 204; configuración temporal CI a un worker diagnostica si tests concurrentes alteran fixtures compartidos.

## 2026-11-22 — Alta Driver desde Administración de la empresa

- `SuperAdminView` tenía formulario, pero E2E sólo comprobaba campos y responsive. El flujo ahora crea Driver con email/documento únicos, comprueba respuesta API, estado SMTP no enviado, persistencia User↔Driver y aparición en lista; Action pendiente.

- Corregidos selectores/secuencia del E2E de fallos 503, que buscaba exportar en el tab equivocado y duplicaba un retry conjunto.
- El resumen de exportación muestra carga/error con ellipsis o raya y no ceros no verificados. AuthContext ignora respuestas de solicitudes de usuarios obsoletas.
- La Action `45072706025` del SHA anterior terminó **35/37**; detectó también que Gestión de Equipo podía perder el error de Drivers cuando se solapaban dos cargas. La vista ahora consume el error compartido de FleetContext además del error local.
- Verificación local: lint y build correctos; discovery Playwright 37. E2E integrado completo pendiente en una Action del parche actual.
- Action `45073324431` sobre `147ba89` pasó **36/37**; el único fallo fue un conteo global de guiones (siete en toda la página vs. tres en la tarjeta). Locator acotado a “Resumen de Datos”; nueva Action requerida.
- Action `45074489447` sobre `00f3b7c` pasó **36/37**; el único fallo esperaba cero alertas ARIA y capturaba el toast de bienvenida. El E2E ahora espera sólo la desaparición de los errores de carga específicos; ejecutar Action nueva.
- Action `45075092805` sobre `ae34fa9` pasó **36/37**; al volver a Resumen después del retry User, rutas/vehículos ya se habían recuperado automáticamente y su retry no existía. E2E reordenado para reintentar primero esos recursos en Resumen, luego Usuarios.
- Action `45075805793` para `067793e` pasó **36/37**; el retry de flota también disparó el refresco de Users y quitó su botón. E2E ahora ejecuta el retry de Users primero, luego verifica recuperación de flota.
- El mock de la prueba ahora mantiene fallos independientes para Users y para Routes/Vehicles, evitando que refrescos automáticos entre endpoints devuelvan 200 antes del retry específico. Nueva Action pendiente.
- E2E de administración ahora completa los campos Driver y comprueba formulario/overflow a 320 y 768 px; prueba responsive de este caso pendiente.
- Action `45075980605` sobre `4eec893` pasó **36/37**; el caso responsive nuevo pasó, el único fallo fue que el botón retry de flota desapareció al recuperar recursos por una recarga de contexto. El mock queda ahora separado por grupos de endpoints.

# 2026-11-22 — Sincronización de edición parcial de vehículo

- Si se guardan atributos de vehículo pero el endpoint de estado falla, la lista ahora refleja inmediatamente los atributos ya persistidos y conserva el estado anterior; el mensaje explica claramente el resultado parcial.
- E2E integrado fuerza 409 sólo en el cambio de estado, comprueba UI y API, y sigue probando cambios válidos, baja y reactivación. Action de `ad4a678` reportó 36/37 por selector de “Resumen de Datos”; locator acotado en el siguiente cambio. Acción para este parche aún pendiente.

# 2026-11-22 — Estados de carga y error en administración de empresa

- Administración distingue carga/fallo de consultas User, Route y Vehicle; muestra reintentos, no presenta errores como conteos cero y bloquea exportación parcial.
- Al crear usuario actualiza la lista y avisa si el alta fue exitosa pero falló el refresco. E2E simula HTTP 503 y comprueba recuperación.
- Lint/build/audit/discovery 37 y diff-check locales pasan. Action integrada de este cambio pendiente.

# 2026-11-22 — Administración de empresa sin relaciones de equipo ficticias

- Se retiró la pestaña “Equipos” y los detalles calculados con `teamId`, que la API no guarda ni devuelve. La creación ya no promete asignación a equipo.
- El formulario de alta pide correo electrónico; al elegir Chofer exige documento y teléfono para que el backend pueda crear la cuenta y el perfil operativo.
- E2E `company-admin` comprueba la ausencia de Equipos, el campo email y los campos requeridos del Driver. Commit `340eb55` pasó Action `45072015727`: 36/36 E2E, responsive 1/1, backend xUnit 111/111, audit/lint/build y cleanup.

# 2026-11-22 — Registro duplicado validado desde UI — Action aprobada

- E2E de registro ahora repite desde el formulario una cuenta de empresa ya existente. Confirma la respuesta neutral idéntica, mensaje visible y redirección a Login; conserva el intento API directo.
- Correo duplicado no revela el estado de la cuenta ni crea sesión automáticamente.
- Action `45071113746` sobre `5d4e290` pasó: **36/36 E2E**, responsive **1/1**, backend xUnit **110/110**, audit/lint/build y cleanup.

# 2026-11-22 — Cierre de parada sin evidencia podía bloquear la ruta — FIX LOCAL APROBADO; CI PENDIENTE

- Auditoría detectó que API aceptaba `InProgress→Completed`/`Pending→Skipped` sin evidencia aunque `AddPointEvidence` luego rechaza paradas cerradas; la ruta podía quedar imposible de finalizar. La interfaz bloqueaba completar, pero permitía omitir sin evidencia.
- Backend exige evidencia antes de completar u omitir; UI deshabilita Omitir hasta adjuntar evidencia. Unit tests **110/110**, smoke HTTP/MySQL descartable exit 0 y cleanup sin fixtures.
- Lint/build/audit 0/discovery 36 pasan local. E2E API verifica HTTP 400 y estado sin cambios, luego sigue el flujo positivo; Actions de ambos repos nuevos pendientes.

# 2026-11-22 — Búsqueda operativa de conductores y selectores E2E robustos

- Gestión de Conductores permite buscar por nombre, apellido, documento y teléfono, sin sensibilidad a mayúsculas ni tildes; mantiene el filtro de inactivos y distingue vacío real de búsqueda sin resultados.
- E2E nuevo valida consulta real por documento, vacío, limpieza y responsive a 320/768 px. Suite descubierta: 36 casos.
- Action `45067692881` pasó backend 107/107, audit/lint/build y responsive, pero falló 1 de 35 E2E: el test del ciclo Driver usaba placeholders ambiguos después de añadir búsquedas. Cambiados a textbox con nombre accesible; Action `45068474426` pasó **36/36 E2E**, backend, responsive, audit/lint/build y cleanup.
- Lint/build, audit (0 vulnerabilidades), discovery (36) y diff-check locales pasan. Action `45069041959` pasó la variante determinista: backend 107/107, audit 0, responsive 1/1 y **36/36 E2E** con API/MySQL descartables.
- El E2E de búsqueda crea un Driver API temporal en su propio tenant y lo desactiva en `afterEach`; no depende de filas preexistentes ni omite el caso por flota vacía.

## 2026-11-22 — Constructor de rutas Manager y cobertura responsive

- `FleetContext` solicita opciones de asignación para el rol Manager; refresco/reintento incluyen el mismo rol.
- E2E real crea y persiste ruta Manager con parada Delivery y comprueba edición/cancelación móvil.
- Alta Manager/Logistics probada a 320/768 px; edición/estado de User a 320 px.
- Etiqueta accesible de salida distingue edición de creación; runner E2E acepta args Playwright.
- Local: 33/33 E2E, lint/build/audit correctos. Incidencias y resoluciones en `ERROR_LOG.md`.
- Action `45058535602` sobre `50bf9d0` pasó responsive 1/1, E2E 33/33, backend Release/xUnit, audit/lint/build y cleanup.

## 2026-11-22 — Constructor de rutas sin ubicaciones ficticias

- El constructor no asigna coordenadas de Quito al escribir el nombre de un origen/destino; mantiene ubicación pendiente hasta selección real y bloquea avanzar sin coordenadas válidas.
- La lista de rutas informa error y reintento cuando falla la carga de opciones de asignación; IDs cuyo nombre no está disponible ya no se anuncian como ausencia de asignación.
- Se corrigió la promesa de disponibilidad en la confirmación de cancelación.
- E2E cubre coordenadas pendientes, recuperación de etiquetas y edición Driver persistida a 768 px. Dos selectores E2E fallidos en Action `45050067540` se corrigieron; causa en `ERROR_LOG.md`.
- Validación local: lint/build, discovery **31**, estados de carga/error **9/9**. Action `45051132073` pasó build/lint/backend/responsive, E2E **29/31**; sus 2 fallos de timeout/viewport están documentados y corregidos localmente, repetición pendiente.

## 2026-11-22 — Fix de Historial para Logistics y cobertura de contraseña

- Historial muestra vehículo desde el DTO de ruta, sin depender del endpoint `/Vehicles` reservado a roles administrativos.
- E2E de Logistics recorre historial/detalle y verifica 320/768 px, incluido el límite del diálogo; el E2E User valida cambio de contraseña, invalidación de sesión anterior y nuevo login.
- Fallos de locator ambiguo y aserción global de alertas corregidos y registrados. Actions `45034387245` pasó 21/21 E2E, responsive 1/1 y cleanup.
- Dashboard Logistics calcula disponibilidad desde opciones de ruta autorizadas y vehículos en ruta desde IDs únicos de rutas activas; errores de esos recursos se muestran como no disponibles. Actions `45035807218` validó el fix junto a 21/21 E2E y responsive 1/1.

## 2026-11-22 — Gestión de perfil de miembros

- Gestión de Equipo incorpora edición de nombres, apellidos y username; correo no editable. Se consulta la API real y se refleja el resultado sincronizado en Drivers.
- E2E verifica persistencia y sincronización User/Driver. Tarjetas tienen selector data-testid estable.
- Dos corridas iniciales dieron 16/18 y 17/18; se corrigieron selectores/mocks y el spec de error pasó 2/2. Playwright final pasó 18/18 en Chrome/API/MySQL; runner terminó con código 0 y DB efímera eliminada.

## 2026-11-22 — Matriz final Driver con tipos nullable

- Actions `45003051160` pasó audit/lint/build, responsive, xUnit y E2E 18/18 con limpieza.

## 2026-11-22 — Regresión nullable de Driver validada

- Actions `45002920723` pasó Playwright API/MySQL 18/18 y cleanup. Cubrió render de perfil sin UserId, bloqueo por inactividad y aislamiento contra ruta de otro Driver. El cambio adicional de tipos nullable `cd7f171` tiene Actions pendiente.

## 2026-11-22 — Contrato Driver con usuario opcional

- Los tipos Front reflejan `UserId` opcional/null como admite backend, y el listado mantiene fallback accesible. Lint/build pasan; integración final pendiente.

## 2026-11-22 — Render seguro de Drivers no vinculados a User

- Gestión de Equipo muestra fallback cuando un Driver no tiene `UserId`, sin bloquear el listado completo. E2E de regresión añadido; CI pendiente.

## 2026-11-22 — Bloquear consulta de detalle para Driver inactivo

- `GET /Routes/{id}` valida conductor activo y asignación mediante `IsCurrentDriverAssigned`. E2E actualizado con detalle/listado/GPS; validación integrada pendiente.

## 2026-11-22 — Matriz de autorización Driver en E2E

- E2E ahora intenta desde Driver las operaciones de ruta, paradas, evidencia y GPS de un recurso asignado a otro conductor, compara persistencia para confirmar ausencia de mutación, y verifica bloqueo GPS con perfil desactivado. Lint/build y discovery 18 correctos; E2E real pendiente de Actions.

## 2026-11-22 — Responsive CRUD de vehículos

- E2E Admin amplía el ciclo de vehículo a 320×844 y 768×1024, incluyendo assert de overflow y encaje de diálogos. El CRUD sigue validando persistencia vía API. Lint/build/discovery 18 correctos localmente; Actions end-to-end pendiente.

# Changelog

## 2026-11-22 — Cobertura responsive de búsqueda en Equipo

- Se amplía el E2E autenticado de búsqueda: miembros interactivos a 320 px, conductores interactivos a 768 px y comprobación de overflow en ambas medidas, conservando el caso de 390 px. Validación Action pendiente.

## 2026-11-22 — Selector evita vehículos ya asignados a otro conductor — VALIDADO

- Gestión de Conductores refleja la regla de exclusividad vigente; el E2E Manager verifica retirada y disponibilidad posterior a desasignar. Actions `45031929936`: responsive 1/1 y Playwright autenticado 20/20, cleanup correcto.

## 2026-11-22 — Feedback de conflicto al asignar Driver — VALIDADO

- E2E confirma que un HTTP 409 muestra el mensaje del servicio y no una confirmación de éxito; luego comprueba la asignación real. Actions `45032626648` pasó 20/20, responsive y cleanup.

## 2026-11-22 — Cambio de contraseña desde Mi Perfil — E2E añadido

- E2E QA cambia la contraseña desde la pantalla, confirma logout, refresh y clave anteriores rechazados y nueva autenticación. Lint/build/discovery 21 pasan local; Actions pendiente.

## 2026-11-21 — E2E móvil de rutas, conductores y roles

- Playwright autenticado pasó 5/5 con frontend, API y MySQL locales; incluye el flujo progresivo de edición/cancelación de ruta, filtro y detalle de Historial a 390×844, y CRUD de Driver desde Gestión de Equipo.
- El caso Driver verifica edición, baja/reactivación y transiciones Driver→Logistics→Driver con sincronización del perfil y la lista.
- Alta confirmada cierra el diálogo aunque falle un refresco posterior; mensaje SMTP no enviado sigue explícito.
- Se documentaron correcciones a selectores Playwright y al test de navegación móvil. Fixtures temporales borrados; conteos QA en cero.
- Frontend lint/build/npm audit correctos; backend hermano 47/47.

## 2026-11-21 — Auditoría E2E de CRUD, roles y respuesta responsive

- Se corrigió el filtro de conductores inactivos para conservar bajas al solicitar todas las filas; cargas concurrentes antiguas ya no pisan la más reciente.
- Chrome E2E completó edición/baja/filtro/reactivación Driver; rol User sin controles y 403; Logistics con Rutas/200 y Vehicles/403; Vehicle alta/búsqueda/edición/baja lógica.
- Viewport de Equipo en 390×844 pasó sin overflow; fixtures temporales limpiados.
- Se verificó que baja de vehículo conserva registro inactivo para historial y lo excluye del listado activo.
- Se añadió workflow frontend con `npm ci`, auditoría npm, lint y build para push/PR a `main`.
- Se agregó Playwright y `npm run test:e2e`; Chrome/MySQL ejecutó login negativo, CRUD Admin móvil, edición de ruta con Driver visible preservando operación y rol User denegado 4/4; el runner local limpia fixtures por prefijos exclusivos.

## 2026-11-21 — Riesgos UX y robustez de sesión

- Se quitó el endpoint de ubicación de vehículo que no existía; el tracking consume posiciones de ruta reales.
- Errores de carga de tracking preservan el último dato visible y ofrecen reintento; geometría de OSRM degradada queda etiquetada como estimada.
- `/Auth/me` y refresh tienen timeout; fallos se presentan claramente al usuario.
- Build/lint de producción y auditoría npm pasan con cero vulnerabilidades.

## 2026-11-21 — Permisos, rutas y sesión

- El rol API `User` ya no hereda los permisos de Logistics; recibe una vista informativa sin funciones operativas.
- La restauración de sesión consulta `/Auth/me` y no confía en el perfil local para decidir permisos.
- Crear/editar rutas sincroniza el vehículo del Driver en la misma unidad de trabajo; se retiró la segunda petición que podía fallar sin notificación.
- El listado permite buscar y filtrar por estado, vehículo y conductor; guarda con bloqueo de doble envío y conserva el diálogo cuando falla el borrado.
- Dashboard y Gestión de Rutas exponen errores de carga con opción de reintento; ya no convierten fallos en cifras cero.
- Panel administrativo describe el alcance de empresa y el alta usa el resultado `{ok, invitationSent}`.
- Verificación: lint/build de frontend, npm audit 0, backend 43/43, Release build y endpoints locales.
- Móvil nativo pospuesto por decisión del usuario; responsive web permanece dentro de esta fase.

## 2026-11-20

- Se creó el constructor de rutas por pasos.
- Se añadió búsqueda de ubicaciones y etiquetas de mapa.
- Se documentó el modelo de paradas de recogida/entrega/ambas.
- Se inició la auditoría integral multiagente.
- Se corrigió la captura de clics del mapa mediante la referencia Leaflet compatible con React-Leaflet 5.
- Se añadieron tipos de operación/estado de parada al modelo frontend y al payload hacia la API.
- Se añadió el selector visible de Entrega, Recogida y Recogida y entrega para paradas.
- El build de producción del frontend quedó verificado correctamente.
- Se registró la deuda pendiente del lint global: 86 errores y 27 advertencias heredadas.
# Cambios 2026-11-20 — Estabilización y constructor de rutas

- Se refactorizó el constructor de rutas para visualizar A, paradas numeradas y B, seleccionar puntos con clic y especificar recogida/entrega/ambas.
- Se eliminó el movimiento GPS ficticio; el conductor sólo registra la ubicación entregada por geolocalización.
- Se tiparon vistas, contextos y cliente de API; el lint global ahora pasa sin diagnósticos.
- Next.js se actualizó a 16.4.6 por vulnerabilidades detectadas; `npm audit` queda en 0 vulnerabilidades.
- El proxy API usa `FLETFLOW_API_URL` configurable. `.env.local` local apunta a API corregida en 5048 y está ignorado por Git.
- `npm run build` y `/dashboard` local responden correctamente.


## 2026-11-21 — Alta y baja de ruta en mapa móvil

- Se añadió E2E que crea rutas desde la UI a 390×844 con clics reales, dos paradas con operaciones distintas, asignación, persistencia y borrado confirmado.
- La prueba encontró y permitió corregir el ancho cero del nombre de parada en móvil.
- CI añade un chequeo Playwright de layout responsive no mutante.
- Resultado: suite Chrome/API/MySQL 7/7; lint/build/npm audit correctos y datos QA retirados.

## 2026-11-21 — Verificación IDOR entre tenants sobre HTTP/MySQL

- Runner local crea dos tenants Admin temporales y limpia ambos al terminar.
- Playwright verifica listados y operaciones cruzadas de Vehicles, Drivers y Routes, y evita enlazar recursos de otra empresa al crear ruta.
- Se persistió GPS de ruta en progreso: propietario lee la posición y tenant ajeno recibe `200 []`; POST de GPS ajeno responde 404.
- Suite autenticada Chrome/API/MySQL pasó 8/8; cero fixtures al cerrar.

## 2026-11-21 — Roles, cierre de sesiones y responsive

- Gestión de Equipo permite crear/cambiar el rol Usuario.
- Mi Perfil informa el fallo de logout-all sin perder la sesión actual.
- Playwright cubre persistencia de rol, error de sesión, vistas responsive y CRUD; Chrome/API/MySQL pasó 14/14 con DB temporal eliminada.

## 2026-11-21 — CI del refactor de rutas

- GitHub Actions frontend y backend pasaron para las ramas feature publicadas (`44982243409`, `44982244087`).
- E2E frontend local contra Chrome/API/MySQL: 14/14; lint, build y audit npm correctos.

## 2026-11-21 — Cobertura de estado de usuarios

- E2E de equipo añade desactivación/reactivación visual de usuario con verificación de persistencia API.

- Actions `44982723150` verificó el ciclo UI de creación, baja y reactivación de User con persistencia MySQL.

- Actions `44983346765` pasó E2E autenticado 14/14 y responsive 1/1 con backend actualizado y MySQL desechable.

- Actions `44983694110` confirmó 14/14 E2E integrados y 1/1 responsive browser.

## 2026-11-21 — Prueba del ciclo operativo de Driver

- E2E móvil cubre ruta asignada, recogida/entrega, evidencia obligatoria y disponibilidad del vehículo al completar.

- Se corrigió E2E Driver: aserción del endpoint de parada alineada a HTTP 200 y cleanup garantizado si falla el flujo; Actions `44985541718` verificó 14/14.

- Dialogs ahora se muestran por encima de controles Leaflet; el E2E Driver verificará evidencia sobre mapa y limpia de forma explícita la ruta temporal.

- Ajustada segunda aserción del E2E Driver al HTTP 200 del endpoint de estado de paradas.

## 2026-11-22 — E2E de paradas, cleanup y responsive

- El constructor E2E agrega, elimina y reordena paradas; la API se comprueba con orden y operaciones exactos tras persistir.
- Cleanup restaura la asignación previa del Driver, cancela rutas activas si la prueba se interrumpe, intenta las operaciones restantes y reporta fallos acumulados.
- Perfil amplía la comprobación responsive a 320×844.
- Actions `44987222908` para `18ca8f0`: backend 57/57, responsive 1/1, Playwright autenticado 14/14, lint/build/audit correctos; Release sin warnings/errores.

## 2026-11-22 — Matriz de permisos y responsive de errores

- Se ampliaron las denegaciones API esperadas para User, Driver, Logistics y Manager; Equipo/Choferes ahora comprueban error/reintento a 390×844.
- Lint, build, diff check y discovery de 15 tests pasan; spec de errores pasa 2/2. Actions `44989454133` para `286b100` terminó success: xUnit 57/57, Playwright 15/15 sin skips, responsive 1/1 y audit/lint/build verdes.
- Backend `029e94d` pasó Actions `44991181335`; se repetirá E2E frontend contra esa versión cruzada final.
# 2026-11-22 — Integración final de las ramas de estabilización

- Frontend `8b59308` ejecutó Actions `44991377967` contra Backend `029e94d`: Release 57/57, audit sin vulnerabilidades, lint/build correctos, responsive 1/1 y Playwright autenticado 15/15 sin skips.
- Las ramas feature quedaron integradas por CI cross-branch; continúan pruebas progresivas de CRUD, permisos y responsive pendientes de cobertura.
# 2026-11-22 — Creación responsive de ruta en tablet

- Se agregó un E2E de Admin que crea por UI una ruta con parada recogida+entrega en 768×1024, verifica la persistencia exacta de sus tres puntos y comprueba overflow en las cuatro etapas.
- Lint, build, discovery de 16 casos y diff check pasan localmente. El CI integrado Chrome/API/MySQL queda pendiente; el cleanup restaura la asignación de Driver y elimina las filas temporales.
- La primera Actions `44991979019` detectó timeout del caso y fragilidad de cleanup ligado a page; solución registrada en `ERROR_LOG.md`, E2E ahora usa request independiente y timeout acotado por fase.
- Actions `44992464372` reveló que tablet utiliza navegación lateral permanente y no el botón móvil; el E2E ya elige directamente la sección de rutas. Suite corregida pendiente de CI.
- Actions `44992803081` encontró que el selector de recursos seguía usando la lista FleetContext previa al POST del vehículo de prueba. Se añadió recarga del dashboard antes de abrir el constructor.
- Actions `44993132771` precisó que revisión resume cantidad/origen/destino y no muestra cada parada; la aserción ahora espera tres puntos y la operación/nombres se verifican desde API después del guardado.
- Actions `44993456874` pasó 16/16 E2E, incluida la ruta tablet, pero detectó que su nombre no entraba al prefijo `E2E QA ruta %` de cleanup SQL. El fixture se renombró para incluirse en la limpieza aislada.
- Actions `44993827707` validó SHA `2932aa0` con backend `029e94d`: 57/57 xUnit, responsive 1/1, E2E 16/16, audit/lint/build y cleanup SQL correctos.
- El E2E CRUD de vehículo ahora cambia estado operativo a mantenimiento y disponible, valida persistencia API/UI tras recarga; su Actions sigue pendiente.
- Actions `44994219944` descubrió que el test esperaba el PUT genérico de edición antes del PUT específico `/status`; el waiter ahora observa exactamente el cambio de estado y payload.
- Actions `44994623654` validó el ciclo vehículo `Disponible→Mantenimiento→Disponible` de punta a punta, con GET de API y recarga, junto a E2E 16/16 y xUnit 57/57.
- La matriz de roles añade el lado permitido de Manager para lecturas y CRUD de vehículo vía API, además de las denegaciones existentes. Actions `44994997016` validó Front `202ec3d` + Back `029e94d`, E2E 16/16, responsive 1/1, xUnit 57/57 y cleanup.

## 2026-11-22 — Cobertura negativa de vehículo y GPS móvil

- E2E Admin móvil ahora verifica que placa duplicada devuelve conflicto visible sin duplicar la tarjeta.
- E2E Driver móvil concede GPS determinista, inicia la ruta en UI y valida la posición persistida por API.
- Validación local: lint/build y discovery 16/16. Integración browser/API/MySQL pendiente.

## 2026-11-22 — GPS se envía al iniciar ruta

- El test móvil encontró que una ubicación capturada mientras la ruta estaba pendiente consumía el throttle y retrasaba el primer envío hasta 20 s después del inicio.
- `DriverView` ahora sólo actualiza el throttle para rutas en progreso; el E2E usa request independiente y limpia/restaura los recursos aunque falle el navegador. Repetición CI pendiente.
- Actions `44996497487` confirmó la solución: frontend/backend integrados, Playwright 16/16, responsive 1/1, xUnit 59/59 y cleanup exitoso.

## 2026-11-22 — Alta Driver rechaza documento repetido sin cuenta parcial

- La UI automatizada verifica HTTP 409/mensaje y consulta el equipo para confirmar que no se creó usuario cuando el documento ya está en uso.
- Backend local 61/61; Front lint/build/discovery 16 correctos. Integración CI pendiente.
- Actions `44997054375` validó el E2E de documento duplicado: Front `1bb7d71` + Back `a7f7c4e`, xUnit 61/61, E2E 16/16, responsive 1/1 y cleanup exitosos.

## 2026-11-22 — Cancelación visible de rutas pendientes

- Gestión de Rutas incorpora cancelación con confirmación; usa el endpoint existente de estado y sólo comunica éxito si el backend acepta la transición.
- El E2E de edición/historial ahora cancela desde la UI y consulta persistencia e historial. Actions integrado pendiente.

## 2026-11-22 — Denegación de edición de perfil para roles operativos

- La matriz API agrega PUT /Users/{id}/profile a las mutaciones denegadas para User, Driver, Logistics y Manager. Validación integrada pendiente.
- Actions 45005400590 pasó el commit anterior: build, audit/lint, responsive 1/1 y E2E 18/18 con backend e54d3c8.

## 2026-11-22 — Responsive adicional para dashboard e Historial a 320 px

- El test de navegación ahora cambia de tablet a móvil estrecho, comprueba Dashboard Principal e Historial y verifica ausencia de overflow. Actions `45005853556` pasó en el commit previo con E2E 18/18; esta ampliación se valida en la próxima ejecución.
- Mi Ruta añade viewport de 320 px, verifica que distintivos GPS/vehículo no se solapen y mide el encaje del diálogo de evidencia. Lint, discovery (18) y diff-check pasan; E2E API/MySQL pendiente.
- El sidebar queda como drawer hasta 1024 px para liberar ancho operativo en tablets. El E2E mide un área `<main>` superior a 700 px a viewport 768; lint/build pasan localmente, Actions pendiente.
- Primera Action del drawer detectó tres recorridos E2E que asumían menú fijo; se corrigieron los pasos de navegación. El fallo y la solución se registran en `docs/ERROR_LOG.md`; repetición integrada pendiente.
- El constructor cambia a panel móvil/tablet: al ubicar origen/parada/destino abre el mapa, al seleccionar un punto regresa a paradas y detalles; se puede alternar manualmente. El helper E2E verifica ambos cambios; lint/build/discovery pasan localmente, browser/API/MySQL pendiente.
- Actions `45007503895` detectó expectativas E2E antiguas de panel visible y drawer cerrado tras reload (15/18 pasaron); pruebas actualizadas a la nueva interacción, integración repetida pendiente.
- Actions `45008055246` pasó 17/18; el caso móvil aún intentaba eliminar una parada temporal con el editor oculto después de agregarla. Se añadió transición explícita al editor; repetición pendiente.


## 2026-11-22 — Validación final del cambio responsive del constructor

- Actions `45008495969` pasó para `d0ab050`: audit, lint, build, responsive browser **1/1** y Playwright autenticado **18/18** contra API/MySQL efímeros; cleanup completo.


## 2026-11-22 — Alta de Driver sin usuario vinculado

- Gestión de Equipo permite crear Driver con o sin cuenta asociada; nombre, apellido, documento y teléfono siguen siendo obligatorios. El payload envía `userId: null` explícitamente.
- E2E añadido en tablet 768×1024: verifica HTTP 201, `userId=null` por POST y GET, tarjeta “Sin usuario vinculado” y ausencia de overflow. lint/build y discovery de 18 tests pasan localmente; Actions API/MySQL está pendiente.


## 2026-11-22 — E2E UI para Driver independiente

- Actions `45009354112` pasó para Front `6681023`: Playwright autenticado Chrome/API/MySQL **18/18**, responsive browser **1/1**, audit/lint/build y cleanup completos. El nuevo caso crea desde UI un Driver sin usuario y confirma null persistido en POST/GET a 768×1024.

## 2026-11-22 — Rutas UI para Logistics y breakpoint 320 px — validado

- Logistics ahora tiene recorrido UI de creación/cancelación y persistencia API; Admin constructor a 320×844. Actions `45012698648`: responsive 1/1, E2E 18/18, audit/lint/build y cleanup success.


## 2026-11-22 — Corrección de aislamiento de fixtures E2E — pendiente de repetición

- Actions `45009790973` detectó timeout de 90 s en creación de ruta Logistics, Driver compartido inactivo al restaurar rol y una aserción dependiente de “Foreign Driver QA” de otro caso. Correcciones locales: restaurar explícitamente `Driver.IsActive`, validar el Driver creado en el mismo test y etiquetar la creación en `test.step`. La repetición aún debe verificar el resultado.
# 2026-11-22 — Recursos de asignación de rutas para Logistics

- Constructor y filtros de rutas usan opciones activas de vehículo/Driver desde `/Routes/assignment-options`, incluyendo Drivers sin cuenta de usuario.
- Se distingue el error de carga con reintento; Logistics conserva el acceso restringido a CRUD de vehículos y Drivers.
- E2E agregado para autorización mínima, omisión de PII, creación/cancelación y selectores con recursos reales. CI integrado pendiente.
- Actions `45011806008` dejó 16/18: los tests mockeados de Equipo/Historial no interceptaban el nuevo endpoint. Stub agregado y 2/2 dirigidas.
- Actions `45012288100` corrió E2E 18/18, pero el cleanup SQL no reconocía el nombre `E2E QA Logistics ruta`; se alineó el prefijo.
- Actions `45012698648` pasó: 18/18 E2E, responsive 1/1, API/MySQL y cleanup completo.
# 2026-11-22 — Manager: ciclo de vehículo desde UI

- Amplía la prueba de roles: tras alternar Driver→Logistics→Manager, abre sesión Manager, valida visibilidad de Rutas/Vehículos y oculta Equipo; crea/edita/cambia estado/da de baja vehículo por UI con persistencia API.
- Comprueba overflow a 320, 390 y 768 px. Lint/build/discovery 18 local pasan; Actions integrado pendiente.

# 2026-11-22 — Separación visual de Manager y Logistics

- El E2E integrado reveló que ambos roles backend compartían el rol UI `logistica`; Manager perdía el menú de Vehículos pese a tener CRUD API.
- Añadido rol UI `manager` / etiqueta “Gestor de flota”, permisos de vehículo y rutas sin administración de usuarios; selección disponible en gestión de equipo y panel de organización.
- Actions `45014430986` pasó con Front `7bf1955` + Back `648b23f`: audit/lint/build, responsive 1/1, E2E autenticado 18/18 y cleanup.

# 2026-11-22 — Gestión de Conductores para Manager

- Separada de Gestión de Equipo: Admin y Manager acceden a la pantalla Drivers; Manager puede crear conductores sin cuenta vinculada, editar, asignar/quitar vehículos y cambiar estado. Gestión de usuarios queda sólo para Admin.
- AuthContext deja de solicitar `/Users/my-team` a Manager/Logistics. E2E integrado añade el ciclo de Driver y la matriz UI; validación CI pendiente.
- Contrato documento/teléfono unificado a 20 caracteres entre formulario, API y persistencia; responsive E2E ahora comprueba el panel y tarjeta creada a 320 px.
- El formulario de Drivers que Admin conserva dentro de Gestión de Equipo ahora comparte los mismos límites y requeridos; E2E agrega checks del formulario a 768 px.
- Actions `45016638974` en `d79ecb8`: audit/lint/build, responsive 1/1, E2E 18/18 contra Chrome/API/MySQL y cleanup success.
- E2E ampliado para asignar Manager desde la UI Admin y validar persistencia/login; el modal de usuario se comprueba en 320/768 px y alterna campos condicionales Driver/Manager.
- Commit `d10e442`, Actions `45017898939`: audit/lint/build, responsive **1/1** y E2E autenticado Chrome/API/MySQL **18/18**; cleanup success.
- El E2E del Dashboard compara las cuatro cifras visibles de rutas/vehículos con las colecciones autenticadas reales de Routes y Vehicles.
- Front consume `createdAtUtc`, quita la fecha creada artificialmente y ordena “Actividad Reciente”; E2E exige timestamp real y valida el primer registro.

# 2026-11-22 — Fecha real de creación de rutas validada

- Front `cacb72e` consume `CreatedAtUtc`, evita fechas inventadas y ordena la actividad con timestamps reales. Actions `45020301540` pasó audit/lint/build, responsive **1/1**, Playwright API/MySQL **18/18** y cleanup completo. Backend `e31e3cc` ejecutó la migración y smoke MySQL en Actions `45020146775`.

# 2026-11-22 — Validación y asignación de Drivers en Gestión de Equipo

- El formulario duplicado de edición valida campos trimmeados y límites compartidos con API; el selector filtra vehículos fuera de servicio y ocupados; “Quitar” sólo aparece con asignación.
- E2E añade errores UI/API y persistencia sin mutación. Lint/build/discovery 18 local pasan. Actions `45021100857` en curso.

## 2026-11-22 — Recuperación de carga de conductores

- Gestión de Conductores informa los fallos de carga de vehículos y ofrece reintentar, evitando presentar opciones de asignación incompletas como estado normal.
- Nuevo E2E valida los estados de error y la recuperación de Drivers y Vehicles.

- La alerta de Vehicle ahora bloquea clics repetidos durante el reintento y comunica su estado; E2E verifica que un vehículo vuelve a estar disponible para asignación.

- Se alinean con backend los límites visibles del diálogo TeamManagement y se previenen entradas sólo con espacios. La primera lint detectó dos atributos maxLength redundantes; se corrigió y lint/build/discovery 19 pasaron.

## 2026-11-22 — Revalidación del último lote Front

- Actions 45025319275 pasó en HEAD 000d6cb: audit, lint, build, responsive y E2E Chrome integrado con API/MySQL.
- El commit actual de outbox backend todavía requiere un run integrado nuevo tras publicarse.

## 2026-11-22 — Filtros de rutas y matriz Manager/Logistics

- Limpiar filtros permanece disponible con resultados filtrados; el E2E confirma filtrado combinado por estado/vehículo/conductor y restauración.
- Añadida denegación de /Users/my-team por HTTP para Manager y Logistics.
- Cobertura responsive de Logistics para selectores y confirmación de cancelación a 320 y 768 px.
- Verificación local: lint/build y Chrome/API/MySQL **20/20**.
# 2026-11-22

- Rutas: botón “Limpiar filtros” permanece disponible cuando los filtros aún devuelven coincidencias; cubierto con filtros combinados y restauración desde API/MySQL.
- E2E agrega denegación de `Users/my-team` para Manager/Logistics y responsive de asignación/cancelación Logistics en 320/768 px. Actions `45028577152`: **20/20**.

## 2026-11-22 — Revalidación integral y CI

- Actions `45030366554` validó Front `505d6c3` con Backend `43c074d`: xUnit 80/80, audit/lint/build, responsive 1/1, E2E API/MySQL 20/20 y cleanup.
- Las nuevas pruebas backend verifican que Driver no acceda a ruta de otro Driver del mismo tenant y que EmailOutbox descifre/entregue o pase a dead-letter correctamente.

## 2026-11-22 — Dashboard Logistics: error y recuperación

- Añadida cobertura E2E del 503 y recuperación de `Routes/assignment-options`, cifra no disponible, alerta y conteo recuperado.
- El caso confirma que Logistics no solicita GET `/Vehicles` y que el dashboard no desborda a 390 px.
- Validación local: lint/build, discovery 22, E2E enfocado 1/1 y diff-check correctos; CI integrado pendiente.

- Front `a75914f` validado por Actions `45036661541`: nuevo E2E de reintento Logistics; total **22/22**, responsive 1/1, audit/lint/build y cleanup success.

- Revalidación cruzada `45037486681`: Front 22/22 contra Backend `0b1c1d1`, responsive 1/1 y todos los checks/cleanup success.

## 2026-11-22 — Error visible y reintento en Gestión de Vehículos

- Ante fallo de GET `/Vehicles`, la vista deja de mostrar flota vacía y permite reintentar; E2E 320×844 confirma recuperación con unidad cargada.
- Local: spec de estados de carga 5/5, lint/build, discovery 23 y diff-check pasan; CI integrado pendiente.

- Actions `45038229853` validó Front `40bdcea`: 23/23 E2E con error/retry Vehicle responsive, backend checkout `4090176`.
- Actions `45038446662` validó Backend `b625c28`: xUnit 86/86, HTTP/MySQL de tenant/roles/flota, concurrencia y cleanup.

- Actions `45038687601` cerró revalidación cruzada: Front `f972e19` + Backend `b625c28`, xUnit 86/86, E2E 23/23, responsive/audit/lint/build y cleanup success.

## 2026-11-22 — Estado de carga de Vehículos

- Se añadió estado de carga explícito en el contexto y Gestión de Vehículos, previo a los estados de error, lista vacía y resultados.
- Playwright mantiene pendiente la respuesta inicial para comprobar que la vista no afirma que la flota está vacía; luego verifica 503, reintento y unidad recuperada a 320 px.
- Pruebas locales: load-errors 5/5, lint, build, discovery Playwright 23 y diff-check pasan. Actions integrada del commit aún pendiente.

## 2026-11-22 — Estado de carga para rutas

- Gestión de Rutas diferencia carga pendiente, fallo de API, lista vacía confirmada y resultados; reintentar también comunica la carga.
- Playwright prueba 503 → reintento con ruta recuperada en viewport 320 px.
- Verificación local: test enfocado 1/1, spec de estados 6/6, lint/build y discovery 24 pasan. CI integrado pendiente.

## 2026-11-22 — Aislamiento del estado frontend entre sesiones

- FleetContext cancela y descarta respuestas de solicitudes iniciadas por una cuenta anterior cuando cambia `user.id`; protege vehículos, rutas, opciones de asignación y reintentos.
- E2E inicia sesión A, mantiene su respuesta pendiente, cambia a B y la libera después de cargar B; confirma que los datos A no se renderizan.
- Validación local: caso enfocado 1/1, load-errors 7/7, lint/build, discovery 25 y diff-check pasan. CI integrado pendiente.
# 2026-11-22 — Aislamiento de sesiones de autenticación

- `AuthContext` descarta login, restauración, refresh y peticiones autenticadas cuya generación de sesión quedó obsoleta. Logout conserva el refresh token capturado y ya no puede borrar el estado de una sesión posterior.
- Se añadió una regresión E2E A→logout→B con refresh de A retrasado; protege tokens y usuario de B. `AbortError` esperados por cancelación no generan errores de consola.
- Verificación local: spec de carga/error **8/8**, lint/build, discovery **26** y diff-check correctos. Actions `45042907944` validó commit `c6441b6`: backend Release, audit/lint/build, responsive **1/1**, E2E API/MySQL **26/26** y cleanup.

# 2026-11-22 — Diagnóstico E2E en CI

- El test móvil de creación de ruta fija timeout de locator para que un bloqueo identifique pronto el control que no responde.
- El caso de Mi Ruta mantiene 503 en GET `/Routes` hasta que se compruebe el estado de error y permite el retry explícitamente.
- CI preserva traces Playwright cuando falla la suite, con retención de cinco días.
- Action `45051977357` dejó **29/31**; estas correcciones aún requieren verificación integrada.
- Action `45053076619` pasó **30/31**; Mi Ruta ya pasó. El trace mostró el campo de destino oculto al abrir mapa móvil. La prueba ahora escribe el nombre antes de entrar al mapa; validar esta corrección en la siguiente Action.
- La selección del mapa reemplazaba también el nombre por la etiqueta genérica “Destino”. El E2E verifica pendiente, fija punto y vuelve a escribir el nombre después de regresar al editor.
- Añadidos E2E para alta de roles Manager/Logistics desde Equipo y para el dashboard/responsive Manager con acceso a Gestión de Rutas y su constructor. Local lint/build/discovery 33 correctos; Action integrada pendiente.
- Action `45054550439` pasó **32/33**; altas directas de Manager/Logistics y punto móvil pasaron. El único fallo fue esperar el h1 “Gestión de Rutas”, cuando la lista muestra “Rutas”; selector corregido y Action repetida pendiente.
- Action `45055100816` pasó **33/33** y limpieza completa tras el fix de encabezado.
- CI actualiza `actions/upload-artifact` a `v7.0.2` tras el warning de retiro de Node 20 en v4; confirmar la carga de traces en la siguiente falla E2E.

# 2026-11-22 — Mi Ruta: responsive tablet

- El E2E de Driver ahora mide la vista inicial/acción y el diálogo de evidencia a 768×1024 además de 320×844; comprueba overflow del documento y área principal y confirma que el estado final se mantiene en tablet.
- Lint/build/discovery 26 pasan localmente. El E2E autenticado se omite sin fixture local; Actions `45043898907` validó este cambio: E2E 26/26, responsive 1/1, backend Release, audit/lint/build y cleanup.


## 2026-11-22 — Preservar mantenimiento y reforzar cobertura de filtros/Logistics

- Backend ya no libera un vehículo al cancelar ruta Pending: sólo se libera en transición terminal que parte de InProgress. Regresión SQLite verifica ruta Cancelled y vehículo aún Maintenance; smoke HTTP/MySQL repite el caso con lectura SQL y luego restaura Available.
- E2E de filtros distingue Pending/Cancelled y verifica el filtro de estado aunque se seleccionen los recursos de la ruta cancelada; comprueba lista/main a 320/768 px con filtros activos. Logistics prueba mapa en 320/768 y lista en ambos anchos.
- Validación local: Front lint/build/discovery 26; backend test dirigido 1/1 y suite Release 89/89; shell syntax/diff-check. Corrida integrada de los nuevos cambios pendiente.

- Actions `45046312974` pasó Front `d05dcf8`: E2E 26/26, responsive 1/1, Release backend, audit/lint/build y cleanup.


## 2026-11-22 — Integración de seguridad backend — Action pendiente

- Front `d05dcf8` quedó validado en Action `45046312974` (E2E 26/26, responsive 1/1 y cleanup).
- Backend `a207c08` incorpora serialización de sesión/reset, autorización GPS bajo lock y fixture aislado de mantenimiento; xUnit local 91/91 y build sin warnings/errores. Action `45047226328` está en cola.


## 2026-11-22 — Backend a207c08 validado en MySQL

- Actions `45047226328` pasó xUnit 91/91, build Release, smoke tenant HTTP/MySQL y concurrencia de rutas. Cleanup confirmó cero rutas/posiciones/vehicles, cero fixtures Manager y tenant A/B.

## 2026-11-22 — Seguridad de sesión visible y verificada

- La acción de cierre de sesión global ahora se encuentra visible en el bloque Seguridad, independiente del formulario de contraseña.
- Se añadieron E2E reales para logout-all entre contextos independientes y para revocación de access/refresh al desactivar desde Gestión de Equipo.
- Runner E2E prepara una cuenta User QA adicional aislada, activa y eliminable por cleanup.

## 2026-11-22 — Mi Ruta: orden, estados de carga y siguiente operación

- La ruta en curso ahora tiene prioridad sobre pendientes en Dashboard y Mi Ruta. Se distinguen carga y fallo de API con un reintento en vez de presentar datos vacíos engañosos. El indicador “Siguiente punto” avanza tras completar/omitir paradas.
- E2E cubre la prioridad, error 503/reintento y operación con dos paradas.

## 2026-11-22 — Evidencia fotográfica y CRUD responsive

- E2E de Driver verifica captura PNG, respuesta del endpoint, persistencia y consulta de foto/descripción desde Historial.
- E2E de equipo mantiene el ciclo de Driver a 320 px durante asignación, edición y cambio de estado.
- Registro y cambio de contraseña verifican formularios a 320 y 768 px.
- Lint, build y discovery 33 correctos; E2E API/MySQL del nuevo SHA pendiente.

## 2026-11-22 — Estabilización E2E y responsive Driver

- Se aisló el fixture de conductor de rutas operativas para evitar conflictos de agenda entre pruebas paralelas y se corrigió el ancho mínimo del formulario de conductores en móvil.
- Registro de la falla inicial y mitigaciones en `docs/ERROR_LOG.md`; Actions integrados pendientes.

## 2026-11-22 — Corrección de evidencia de Driver y CRUD de Equipo a 320 px

- El test fotográfico selecciona ahora el modo Foto de forma explícita. Dashboard/Equipo limita el mínimo de ancho de ancestros flex y el formulario CRUD Driver ocupa el ancho disponible en móvil.
- La traza de la falla, causa y prevención se registran en `docs/ERROR_LOG.md`; repetir CI antes de considerar verificado.

## 2026-11-22 — Mapa y evidencia de parada en Historial

- Se limitaron anchos mínimos en el layout flex del Mapa para evitar overflow interno en 320 px. Historial normaliza evidencia del contrato real `points[].evidence`, incluyendo foto y descripción.
- E2E agrega comprobación de detalle Admin a 768 px. Causas de CI y prevención en `docs/ERROR_LOG.md`.
- Tras Action `45063487802`, el wrapper del mapa fuerza `w-full max-w-full overflow-hidden` y el test verifica las tres evidencias reales del flujo. Lint/build, discovery de 33 y diff-check pasan localmente; Action nueva pendiente.

## 2026-11-22 — Registro de empresa con respuesta neutral

- Registro ya no crea una sesión automáticamente. La respuesta uniforme lleva al usuario a Login; el E2E compara alta y email duplicado y luego autentica la empresa nueva.
- Action Front `45065745273` verificó 33/33 E2E con el backend neutral `825bbed`; el backend añade luego un piso temporal y requiere otra corrida integrada.

## 2026-11-22 — Administración empresarial, búsqueda y cobertura responsive

- Front Action `45066249833` confirmó SHA `57e44c6`: backend xUnit 107/107, lint/build/audit, responsive y 33/33 E2E con API/MySQL efímero y cleanup.
- Auditoría encontró estadísticas “globales”, actividad inventada y botones de importar/reiniciar sin operación. Panel ahora se limita a la empresa, muestra estados explícitos y elimina placeholders. No cambia la política de rol Admin.
- Gestión de Equipo ahora permite buscar miembros y conductores por nombre/usuario/documento/teléfono; E2E nuevos prueban resultados reales y estado sin coincidencias.
- Ruta E2E ahora modifica a 320 y 768 px, verifica persistencia y overflow, y cancela en ambos tamaños.
- Backend amplía smoke de vehículo (editar, mantenimiento, baja/reactivación con API y SQL). MySQL efímero local y cleanup pasan; nueva integración CI pendiente.
# 2026-11-23 — Mostrar rol Admin sólo a la cuenta raíz

- Gestión de Equipo oculta “Gerente” en los controles de alta y cambio de rol cuando `owner_id` firmado no coincide con el ID autenticado.
- El endpoint backend continúa aplicando autorización; la lógica cliente sólo reduce opciones inválidas.
- Añadida aserción E2E para comprobar que la cuenta raíz conserva la opción.

## 2026-11-23 — Revisión de ruta y geocodificación

- La confirmación de ruta expone origen, todas las paradas ordenadas con recogida/entrega/ambas, coordenadas y destino.
- Búsquedas Nominatim cancelan o descartan resultados al cambiar el punto objetivo.
- Front Action `45092540906`: 40/40 E2E y responsive 1/1. Smoke backend local actualizado para el ciclo multi-parada con evidencia; Action pendiente.

## 2026-11-23 — Historial de operaciones de ruta

- El detalle muestra recogida, entrega, operación combinada y estado por parada.
- El estado vacío espera la respuesta inicial. Polling y foco no ejecutan solicitudes simultáneas que puedan aplicar datos fuera de orden.
- E2E enfocado 2/2; lint/build pasan localmente. Action pendiente.

## 2026-11-23 — Disponibilidad de conductores y confirmaciones operativas

- Las opciones de asignación indican conductores ocupados en una ruta `InProgress` y bloquean su selección en el constructor; servicio backend devuelve `isAvailable`.
- Se permite y prueba un traslado de origen a destino con puntos `None` y sin paradas operativas.
- Gestión de Equipo confirma cambio de rol y activación/desactivación; diálogos se desplazan en viewports de poca altura.
- Límite de recuperación 5/10 min/IP, tokens reset de 256 bits/TTL 60 min y URLs seguras por ambiente en backend.

## 2026-11-23 — Correcciones E2E de asignación y confirmación

- Se muestran conductores ocupados como opciones deshabilitadas con su estado; se corrigió su omisión del selector.
- Se alineó el E2E de traslado con el cambio de vista que ocurre al pulsar “Ubicar”.
- E2E de asignación de roles y desactivación confirma el diálogo antes de validar persistencia.

## 2026-11-23 — Suite integrada de rutas y equipo

- Los 43 escenarios E2E pasan con el nuevo flujo de disponibilidad, traslado y confirmaciones. El pipeline detectó un fallo separado en cleanup MySQL, ahora instrumentado en el backend para mostrar el diagnóstico exacto.
