# Changelog

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
