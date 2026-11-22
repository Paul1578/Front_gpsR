## Iteración en curso — Historial de Logística y cambio de contraseña — 2026-11-22

- E2E de cambio de contraseña añadió persistencia, revocación de refresh/clave anterior y nuevo login. Actions `45033318956` falló 20/21 por un locator Playwright ambiguo (no llegó a ejecutar el endpoint); causa/corrección documentadas en `ERROR_LOG.md`, selector corregido.
- Auditoría identificó que Historial de Logística recibía 403 de `/Vehicles` y ocultaba rutas que sí podía leer. Front usa ahora los campos de vehículo ya incluidos en `RouteDto`; el test verifica API, placa/detalle y responsive 320/768 px.
- Lint, build y discovery **21 tests** pasan localmente. Falta Actions integrado con MySQL/Chrome para los cambios actuales.
- Actions `45033927966` validó que Logistics sí muestra la ruta y placa, además de backend/audit/lint/build/responsive; terminó 20/21 porque una aserción contaba cualquier `role=alert`. Se limitó al mensaje específico del Historial; hay que repetir.
- Actions `45033061272` pasó 20/20 con responsive 1/1 y cleanup; `45033318956` había validado build/responsive, pero su flujo de contraseña no llegó al API por el selector ya corregido.
- No declarar la misión completa: siguen pendientes más matriz CRUD/roles/responsive y límites de producto/servicio externos.

## Edición de miembros y pruebas de roles — 2026-11-22

- Front `fe86bfa` + Back `4695e79`: Actions frontend `45005853556` success; backend Release/xUnit, audit, lint/build, responsive browser y E2E autenticado API/MySQL **18/18**, cleanup correcto.
- La matriz cubre rechazo de `PUT /Users/{id}/profile` para User, Driver, Logistics y Manager; backend prueba validaciones y límites de tenant/root. Cambios de perfil de miembro regular y Driver persisten y sincronizan.
- Actions `45006305726` pasó Dashboard e Historial a 320×844 con control de overflow, E2E 18/18 y responsive browser 1/1.
- Actions `45006627500` success en commit `441ee24`: E2E autenticado **18/18**, responsive browser 1/1 y cleanup. Incluye Mi Ruta a 320×844, insignias GPS/vehículo sin solapamiento y diálogo de evidencia dentro del viewport.
- La auditoría de UX identificó que la barra lateral consumía 256 px a 768 px y comprimía el área operativa. Se cambió a drawer hasta 1024 px; E2E requiere navegación por hamburger y `main > 700 px`. Lint/build/diff-check pasan; falta correr browser/API/MySQL sobre el commit.
- Actions `45006747816` falló 3/18 por tests que asumían sidebar fijo al navegar a 768 px; 15 pasaron. Los tres recorridos ya abren drawer explícitamente; la repetición integrada sigue pendiente.
- Actions `45007503895` falló 3/18 (15 pasaron): dos E2E esperaban `Seleccionando` en el editor oculto cuando el panel cambia al mapa; un flujo de tracking no reabría drawer tras reload. Ajustado y documentado; próxima ejecución pendiente.
- Actions `45008055246` pasó 17/18 y aisló un último timeout: se añadía y quitaba una parada temporal sin cambiar desde mapa al editor. Ya se añadió la transición del test; ejecución repetida pendiente.
- El constructor de rutas ahora alterna editor/mapa en móvil y tablet y regresa al editor tras elegir un punto. Lint/build y discovery de 18 casos pasan; falta CI integrado.
- Auditoría continúa abierta: faltan más operaciones CRUD, matriz de privilegios Admin y pruebas responsive de las vistas restantes. SMTP necesita configuración externa; móvil nativo pospuesto.

## Actualización — edición de miembros — 2026-11-22

Gestión de Equipo permite editar nombres, apellidos y username con backend real; email no editable. Backfill de usuarios Driver existentes y sincronización bilateral User/Driver implementados. Lint/build pasan. Spec de error de carga 2/2 y Playwright integrado 18/18 en Chrome/API/MySQL efímero; runner finalizó código 0. Auditoría integral sigue abierta.

## Verificación final Driver responsive/autorización — 2026-11-22

- Actions `45003051160` success para Front `cd7f171` + Backend `41c01e7`: audit/lint/build, responsive browser y Playwright API/MySQL 18/18 con cleanup. Incluye `UserId` nullable, Driver sin cuenta, otro conductor, y perfil Driver desactivado/reactivado.
- Siguiente brecha revisada: los miembros no tienen edición UI; `User`/`UserDto` no persisten/exponen nombres capturados en alta.

## Actualización — Driver, ownership y responsive — 2026-11-22

- Actions `45002920723` success: backend Release/xUnit, audit/lint/build, responsive browser y E2E **18/18**. Verificados casos Driver activo/inactivo, ruta ajena, paradas/evidencia/GPS y vista de Driver sin cuenta.
- Commit actual añade tipo nullable exacto; build/lint local pasan, Actions `45003051160` pendiente.

## Actualización — Drivers sin cuenta asociada — 2026-11-22

- La vista Gestión de Equipo ahora representa un Driver nullable `UserId` como “Sin usuario vinculado”; antes la lectura `.slice` rompía el render. El E2E incluye un caso de regresión. Lint/build/discovery pasan; Actions `45002920723` pendiente.

## Actualización — perfil Driver inactivo — 2026-11-22

- El acceso al detalle de ruta también exige perfil Driver activo. La matriz E2E ahora verifica 403 en detalle, listado, GPS GET y POST; nueva Actions integrada pendiente.

## Actualización — 2026-11-22

- Actions `45001695962` success para Front `1c108cc` + Backend `923072b`: responsive E2E CRUD vehículo a 320 y 768 px, Playwright API/MySQL y cleanup.
- Está en curso ampliar el E2E de Driver para ruta de otro conductor (todas las acciones operativas) y perfil operativo inactivo; backend corregido en `2fdc9e0`. Lint/build/discovery local pasan; Actions integrada pendiente.

## Actualización — 2026-11-22

- Responsive E2E CRUD Vehicle ampliado: viewport estrecho 320×844 y tablet 768×1024, chequeo de overflow y límites del modal. Lint/build/discovery 18 tests pasan localmente; integración UI/API/MySQL pendiente de Actions.
- Alta Driver concurrente: smoke adaptado al status actual 200/409 y conserva verificación SQL de una sola cuenta/conductor/token. Backend Release 61/61 y shell syntax/diff-check pasan; Actions `45001599626` en ejecución al actualizar este documento.
- Siguen pendientes cobertura progresiva de los CRUD, matriz de roles y responsive; no declarar auditoría completa. SMTP real externo, app nativa pospuesta y decisiones de despliegue permanecen fuera de alcance técnico local.

# Actualización actual — coherencia de opciones Vehicle/Driver — VALIDADA — 2026-11-22

- Gestión de Conductores filtra selector a vehículos disponibles sin otro Driver vinculado, en concordancia con HTTP 409 del backend y exclusividad de asignación.
- E2E comprueba que el selector de un segundo conductor no ofrezca el recurso asignado y que se habilite tras desasignar.
- `npm run lint`, `npm run build` y discovery Playwright **20** pasan local. El runner local se detuvo sin mutar la DB porque faltaba Admin bootstrap.
- Actions `45031929936` pasó audit/lint/build, responsive y E2E autenticado Chrome/API/MySQL **20/20**, cleanup correcto.
- Misión global permanece abierta.

## Próxima prueba negativa — 2026-11-22

- E2E de Gestión de Conductores simula asignación HTTP 409, verifica mensaje legible y ausencia de toast de éxito, después ejecuta asignación real. Lint/build/discovery **20** pasan local; Actions `45032626648` pasó E2E **20/20**, responsive 1/1 y cleanup.

## E2E de cambio de contraseña — pendiente

- Nuevo flujo UI verifica cambio de clave, invalidación de refresh anterior, rechazo de la contraseña vieja y re-login exitoso. Ejecutar lint/build/discovery y Actions API/MySQL.

# Estado del proyecto

Fecha de actualización: 2026-11-22.

## Integración cross-branch confirmada — 2026-11-22

- GitHub Actions `44991377967` terminó `success` en frontend `8b59308`; hizo checkout de `chore/stabilize-fleet-platform` exactamente en backend `029e94d`.
- Evidencia de la corrida: backend Release build correcto y xUnit 57/57; `npm audit` sin vulnerabilidades; lint y build Next correctos; responsive 1/1; Playwright autenticado Chrome/API/MySQL 15/15 sin skips.
- Este corte confirma integración de ambas ramas publicadas. No implica que el catálogo completo de CRUD, todos los roles o todas las vistas responsive estén cubiertos; permanecen como trabajo activo.
- Se añadió un E2E real para crear y persistir una ruta con parada recogida+entrega en tablet (768×1024), comprobando overflow en cada paso y cleanup de ruta/vehículo/asignación. ESLint, build y discovery **16 tests** pasan localmente; la ejecución navegador/API/MySQL queda pendiente del Actions del nuevo commit.
- Actions `44993827707` para `2932aa0` confirmó finalmente la integración: backend xUnit 57/57; audit cero vulnerabilidades, lint/build correctos, responsive 1/1 y E2E autenticado **16/16**. El job terminó success, incluyendo cleanup MySQL de la ruta tablet.
- E2E de vehículo amplía ahora el ciclo UI: edita estado operativo a Mantenimiento, comprueba `status=2` por API y tras recargar, y lo restaura a Disponible (`status=0`) antes de baja/reactivación. Lint/build/discovery local pendientes de repetir; CI anterior no incluye este cambio.
- Actions `44994219944` mostró que el waiter del test capturaba el PUT de datos generales antes del endpoint separado `/status`, así que el GET leía el valor anterior. Se acotó a pathname `/status` y body 204; repetir CI para completar la nueva cobertura.
- Actions `44994623654` pasó para SHA `cf8dc13` contra backend `029e94d`: xUnit 57/57, audit/lint/build verdes, responsive 1/1, Playwright **16/16** y cleanup completo. La nueva prueba confirma cambio de estado vehículo Mantenimiento→Disponible en API y UI después de recargar.
- La matriz HTTP autenticada cubre permiso positivo de Manager: lista rutas/vehículos y completa ciclo de vehículo crear/editar/mantenimiento/disponible/GET/baja. Actions `44994997016` pasó el fixture y cleanup.
- Actions `44994997016` confirmó el ciclo permitido de Manager en Front `202ec3d` contra Back `029e94d`: backend xUnit 57/57, audit sin vulnerabilidades, lint/build correctos, responsive 1/1, E2E autenticados 16/16 y cleanup MySQL exitoso.
- La placa duplicada ahora produce HTTP 409 y mensaje en español; backend Release 59/59 y Actions `44995681296` success en `6ec5315` con smokes MySQL. Front amplió E2E móvil de vehículo para rechazo visible y Driver para GPS autorizado/persistido. Lint/build/discovery 16 correctos; Actions frontend del nuevo SHA pendiente.
- Primera corrida del nuevo E2E: Actions `44991979019` encontró timeout de 30 s en el caso tablet (15 E2E restantes pasaron). Cleanup del caso dependía del contexto de página cerrado por el timeout; se separó a `APIRequestContext` del fixture `request`, se amplió timeout total del caso a 90 s y se acotaron los waits UI a 8 s. Revalidación integrada pendiente; detalle en `docs/ERROR_LOG.md`.
- En Actions `44992464372`, el timeout acotado identificó un segundo error de test: esperaba el botón móvil Abrir menú a 768 px; el lateral ya está expandido en tablet. Se corrigió navegando directamente por Gestión de Rutas; 15 E2E restantes y cleanup del caso pasaron. Repetición pendiente.
- Actions `44992803081` llegó al paso de recursos; el vehículo creado por API no estaba en la lista previamente cargada por FleetContext. Se agregó reload antes de abrir el constructor; 15 casos restantes y cleanup pasaron. Revalidación completa pendiente.
- Actions `44993132771` avanzó hasta revisión; la pantalla no lista el nombre de cada parada y solo muestra cantidad, origen/destino y recursos. La aserción ahora comprueba “3 puntos”; nombre y `PickupAndDelivery` se validarán tras persistencia API. Los otros 15 y cleanup pasaron; repetir CI.
- Actions `44993456874` ejecutó 16/16 E2E y responsive 1/1, incluida persistencia exacta tablet; falló solo la limpieza SQL porque el prefijo `E2E QA tablet` no coincidía con `E2E QA ruta %`. Se corrigió el prefijo y falta CI confirmatorio de cleanup completo.

## Ramas

- Frontend: `refactor/route-builder`.
- Backend relacionado: `chore/stabilize-fleet-platform`.
- `main` no se modifica directamente.

## Estado actual

- Constructor visual de rutas con origen, paradas intermedias múltiples, destino y operación recogida/entrega/ambas.
- Ejecución Driver conectada a estado y evidencia persistida por parada; fin de ruta valida estado y evidencia.
- Mapa usa GPS real del navegador o posición guardada; se eliminó movimiento ficticio.
- `npm run lint`, `npm run build` y `npm audit` correctos (0 vulnerabilidades reportadas); coordinadas ficticias y notificaciones de muestra retiradas.
- Backend .NET 8: último CI relacionado con Front pasó Release 57/57; MySQL y migración tenant se validan en instancia descartable del workflow.
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

1. Completar E2E visual de otras vistas/acciones CRUD; la suite actual descubre 18 casos, pero no cubre cada vista ni cada acción de equipo/rutas.
2. Configurar SMTP con credenciales vigentes; las credenciales DB/JWT locales ya fueron rotadas en backend. Validar cualquier entorno remoto por separado.
3. Ampliar vistas/acciones responsive no cubiertas y mover fotos de JSON a almacenamiento de objetos antes de producción a escala. E2E frontend/API/MySQL ya pasó en Actions con fixtures efímeros.

## Siguiente cobertura responsive — tracking del mapa tablet — 2026-11-22

- Auditoría independiente identificó que el mapa a 768×1024 se abría sin verificar selección de ruta ni tracking.
- Nuevo Playwright crea dos rutas reales mediante API/MySQL, registra GPS en una ruta iniciada, cambia la selección desde la lista, espera el GET de posiciones y verifica el marcador con viewport tablet y sin overflow en documento/`main`.
- `npm run lint`, `npm run build`, `npm run test:e2e -- --list` (**17 tests**) y `git diff --check` pasan localmente.
- Front local `:3000` y API `:5048` no estaban disponibles (HTTP 000); no se creó fixture local. Actions `44997939176` para Front `a5dd689` + Back `a7f7c4e` pasó: backend xUnit 61/61, audit/lint/build, responsive 1/1, E2E 17/17 y cleanup MySQL/servicios success. El nuevo caso de tracking tablet ya está validado.
- Se amplió el E2E existente de Historial para operar el filtro de canceladas y abrir detalle a 768×1024, comprobando anchura de `main` y diálogo. Actions `44998408284` en Front `650e306` + Back `a7f7c4e` pasó: xUnit 61/61, responsive 1/1, E2E 17/17 y cleanup success.
- SMTP real requiere credenciales externas; nativo móvil fue pospuesto por el usuario. Mantener misión activa y continuar con cobertura CRUD/responsive.

## Registro público como cuenta raíz de empresa — validado — 2026-11-22

- Hallazgo: `/register` decía “Registra tu equipo como Gerente”, pero el backend forzaba rol User y dejaba a la cuenta sin permisos operativos.
- Backend cambia el rol fijo de registro a Admin raíz de tenant; el cliente no controla el rol y `owner_id` limita el acceso a la empresa recién creada. Se actualizan los smokes HTTP/MySQL y se elimina la elevación manual de la cuenta de segundo tenant en el runner.
- Front elimina roleName del payload, envía nombres capturados como username y añade E2E móvil de alta, lectura `/Auth/me`, lista de flota vacía y acceso de menú a rutas/vehículos.
- Front lint/build/discovery **18 tests** y Backend Release **61/61** pasan localmente; `bash -n` y `git diff --check` pasan. Actions `44999716080` pasó en Front `e2cdcb1`, con checkout de Backend `3620cc2`, Release xUnit 61/61, audit/lint/build, responsive 1/1 y Playwright **18/18**; MySQL/API descartables y cleanup terminaron correctamente.
- Errores de inspección de repositorio y decisión de aislamiento documentados en `docs/ERROR_LOG.md` de cada rama.
- Fixes documentales finales publicados en Front `0bd8e40` y Backend `62d7b39`; ambas ramas limpias y sincronizadas con sus remotos.

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

## E2E operativo de Driver — 2026-11-21

- El caso Driver ahora crea una ruta real de prueba con parada de recogida y entrega, inicia la ruta desde Mi Ruta, cambia el estado de la parada, registra nota de evidencia y completa la ruta desde la UI móvil.
- Verifica por API que la ruta quede completada y el vehículo disponible; recursos usan prefijos retirados por el cleanup aislado.
- Lint/build y listado Playwright pasan localmente. Falta el run integrado después del push para comprobar el recorrido Chrome/API/MySQL.

- Primer run del nuevo E2E Driver (`44984300436`) detectó contrato incorrecto del test (esperaba 204; API devuelve 200) y falta de cleanup tras fallo; ambas causas se corrigieron y están en `ERROR_LOG.md`. Lint/build/discovery pasan; Actions debe repetirse antes de contar el flujo como cubierto.

- Trace de `44984722584` confirmó además un defecto visual real: controles Leaflet tapaban el modal de evidencia. `DialogOverlay` y `DialogContent` se elevaron sobre el mapa; cleanup ahora verifica cancelación/baja. Validación local lint/build/discovery pasa; repetir integración.

- Run `44985230566`: modal de evidencia corregido y clicable; guardó evidencia y marcó stop. Falló sólo porque la aserción de completar parada aún esperaba 204 (API devuelve 200). Los 13 casos restantes pasaron, incluido cross-tenant; cleanup verificado. La expectativa se corrigió y el flujo completo pasó después en `44985541718`.

## Continuación de estabilización — 2026-11-22

- Frontend `refactor/route-builder`, SHA `1f3a24c`: GitHub Actions `44985541718` terminó `success`. Backend de la rama feature compiló sin warnings/errores y pasó **56/56** xUnit; frontend pasó audit, lint, build, responsive Chrome **1/1** y Playwright Chrome/API/MySQL **14/14**.
- El E2E Driver completa desde viewport 390×844 una ruta de API, registra evidencia de nota, completa la parada y la ruta; el backend confirma ruta `Completed` y vehículo `Available`. El test y cleanup respetan HTTP 200 del endpoint de paradas.
- Defecto descubierto y corregido: Leaflet quedaba encima del diálogo de evidencia. El diálogo ahora tiene z-index superior; la prueba integrada confirma que la nota se guarda y la acción puede completarse.
- Errores intermedios y soluciones están en `docs/ERROR_LOG.md`.
- Pendiente: ampliar CRUD, matriz de mutaciones por rol y cobertura visual responsive de pantallas/acciones restantes. SMTP depende de credenciales externas vigentes; app nativa móvil está aplazada por decisión del usuario.
- La auditoría continúa activa; estos resultados no cubren todos los criterios de aceptación.

## Validación de orden de paradas — 2026-11-22

- El E2E ahora agrega, quita y reordena paradas, y comprueba orden y operación exactos desde GET API. Actions `44986079119` encontró que el cleanup dejaba el vehículo asignado al Driver (409); se restauró la asignación original y `44986497890` pasó 14/14 en Playwright y 1/1 responsive.
- Una revisión separada motivó hardening del `finally`: cancelar ruta activa, seguir con los demás cleanup aunque falle un paso y reportar todos los errores. Actions `44986877646` para `aa49b83` pasó: Release 57/57, responsive 1/1, Playwright 14/14. La rama de cancelación de emergencia queda implementada pero no fue ejercitada en este flujo normal.

## Responsive móvil estrecho — 2026-11-22

- Amplié el E2E Admin de Perfil para comprobar el formulario de cambio de contraseña a 320×844, además de los breakpoints ya cubiertos 390×844 y 768×1024. Actions `44987222908` para `18ca8f0` pasó responsive 1/1 y Playwright autenticado 14/14; el perfil quedó accesible sin overflow. Backend Release 57/57.

## Estado de continuidad — 2026-11-22

- Front `refactor/route-builder`: HEAD documental `a938b2b`, limpio y sincronizado; última matriz de código `286b100` pasó Actions. Back `chore/stabilize-fleet-platform`: `029e94d`, limpio y sincronizado; smoke lifecycle Logistics y cleanup pasaron. Ningún cambio en `main`.
- La auditoría sigue abierta: ampliar CRUD, autorizaciones/mutaciones y vistas responsive no cubiertas. Los E2E actuales no se consideran cobertura exhaustiva.
- Fuera de capacidad local o aplazado por decisión: SMTP válido, aplicación nativa, Super Admin global aún no definido, y componentes de despliegue productivo como dominio/TLS, almacenamiento de objetos y rate limiting distribuido.

## Cobertura añadida y CI validada — 2026-11-22

- En `refactor/route-builder`, Playwright descubre ahora 15 casos. Lint, build de producción y diff check pasan; el spec de errores Equipo/Choferes se ejecutó 2/2 a 390×844.
- Se añadió cobertura negativa de operaciones por rol para User, Driver, Logistics y Manager. Actions/API/MySQL confirmó los códigos HTTP; el runner provisionó fixtures y recursos desechables.
- La API y el frontend locales no estaban disponibles para E2E autenticado (HTTP 000); la matriz sí se ejecutó y verificó en Actions con API/MySQL efímeros.
- La auditoría sigue activa: falta ampliar CRUD y responsive fuera de las vistas cubiertas. SMTP, app nativa pospuesta, Super Admin sin contrato backend y requisitos de producción siguen delimitados como pendientes externos/de producto.
- Actions `44989454133` para `286b100` pasó: matriz ejecutada sin skips dentro de Playwright 15/15, responsive 1/1, xUnit 57/57 y audit/lint/build verdes.

## Integración de ramas actualizada — 2026-11-22

- Backend `chore/stabilize-fleet-platform` alcanzó `029e94d`; Actions `44991181335` pasó build, xUnit y smoke HTTP/MySQL de tenant/Logistics/concurrencia.
- El frontend conserva los 15 E2E ya validados; se repetirá contra ese HEAD backend para confirmar la integración cruzada final.

- Actions `44995899244`: backend build/xUnit, audit, lint, build, responsive y setup MySQL correctos; E2E **14/16**. El nuevo GPS detectó y permitió corregir el envío inicial bloqueado por el throttle de 20 s; retries revelaron cleanup/aislamiento de Driver incompleto, ahora endurecidos. Repetición del SHA siguiente pendiente.
- Actions `44996497487` para Front `6fe66f7` + Back `104cda8` pasó: xUnit **59/59**, responsive **1/1**, E2E autenticados **16/16**, audit/lint/build y runner cleanup success. GPS móvil concedido se envió y leyó por API; el alta duplicada devolvió 409 y no creó una segunda tarjeta.

- Documento de Driver repetido ahora devuelve 409 y no crea cuenta parcial. Backend local 61/61; frontend añadió la aserción móvil Admin y pasó lint/build/discovery 16. Actions integrado pendiente.

- Actions `44997054375` validó Front `1bb7d71` con backend `a7f7c4e`: xUnit 61/61, responsive 1/1, E2E 16/16, audit/lint/build y cleanup del runner success. Documento duplicado devuelve 409 y no crea usuario parcial.

## Cancelación operativa desde Gestión de Rutas — validada

- Auditoría Front encontró que cancelar sólo estaba cubierto mediante una llamada API directa; en Gestión de Rutas no había acción visible específica.
- Se añadió acción “Cancelar” para rutas pendientes con diálogo que explica la liberación de vehículo/conductor. Usa el endpoint de estado existente, refresca desde la API y muestra éxito/error.
- El E2E móvil de edición e Historial ahora cancela desde la tarjeta, confirma HTTP 204 y persistencia `Cancelled`, y valida la ruta en Historial. Lint/build/discovery (18) y diff-check pasan localmente. Actions `45000517571` pasó con backend `d346fa2`: Playwright 18/18, responsive 1/1, API/MySQL y cleanup success.


## Builder responsive — Actions validado — 2026-11-22

- Front `d0ab050` pasó Actions `45008495969`: auditoría npm, lint, build, browser responsive **1/1** y suite autenticada Chrome/API/MySQL **18/18**; los servicios desechables y el runner finalizaron correctamente.
- El E2E móvil vuelve explícitamente al editor antes de eliminar la parada temporal añadida; causa del fallo previo `45008055246` y prevención documentadas en `ERROR_LOG.md`.
- Auditoría integral sigue abierta: quedan CRUD y vistas responsive por recorrer, además de la definición de privilegio para asignar rol Admin. SMTP depende de credenciales externas; aplicación nativa móvil está aplazada por decisión del usuario.


## Alta de Driver independiente — Actions validado — 2026-11-22

- Admin ahora puede crear un conductor sin cuenta asociada desde Gestión de Choferes; el vínculo de usuario es opcional y se persiste como null. Los datos operativos del conductor siguen requeridos.
- Playwright cubre creación tablet 768×1024, HTTP 201, lectura API de `userId=null`, tarjeta “Sin usuario vinculado” y overflow. Lint/build y discovery **18 tests** pasaron localmente; integración API/MySQL pendiente de Actions.
- La prueba reutiliza el fixture Admin y cleanup por prefijo `E2EQA`; misión de CRUD/roles/responsive sigue abierta.


## Logistics administra rutas desde la UI y builder a 320 px — Actions validado — 2026-11-22

- El E2E de Logistics ahora crea una ruta desde el constructor con un Driver activo sin cuenta, comprueba API/persistencia, la cancela desde la tarjeta y confirma estado Cancelled; además verifica denegación de flota/equipo.
- El E2E de Admin crea una ruta a 320×844 y comprueba overflow; el alta de Driver independiente también verifica 320 px tras crearlo en tablet. Actions `45012698648` pasó audit/lint/build, responsive 1/1, E2E 18/18 y cleanup API/MySQL.


## Iteración E2E Logistics — resuelta — 2026-11-22

- Actions `45009790973` dio 15/18: Logistics UI agotó 90 s; dejar el fixture compartido Driver inactivo hizo fallar el E2E Driver posterior (HTTP 400), y Equipo verificaba un Driver temporal de otro caso que ya había limpiado.
- El `finally` restaura rol y estado activo; la aserción de Driver independiente usa el fixture del mismo test. Actions `45012698648` confirma creación/cancelación UI, autorización, 18/18 y cleanup.
# Iteración en curso — opciones de asignación para Logistics — 2026-11-22

- Causa del fallo Actions `45009790973`: Logistics podía crear rutas pero el constructor cargaba vehículos/conductores desde endpoints administrativos con 403.
- FleetContext ahora consulta `/Routes/assignment-options` para gerente/Logistics y RoutesManagement consume conductores activos independientes de cuentas de usuario. El paso de asignación muestra error y reintento si el endpoint falla.
- E2E extiende caso Logistics: comprueba 403 en `/Vehicles` y `/Drivers`, 200 en opciones mínimas sin documento/teléfono, disponibilidad de recursos en selectores, creación y cancelación UI.
- Actions `45012698648` pasó para Front `4117342` + Backend `6def8fa`: audit/lint/build, responsive 1/1, E2E API/MySQL 18/18 y cleanup. Confirmado: Logistics consulta opciones sin PII y crea/cancela ruta; mocks actualizados y todos los fixtures MySQL retirados.
# Cobertura de rol Manager desde UI — validada — 2026-11-22

- Auditoría Front detectó que Manager tenía CRUD Vehicle validado por API, pero no E2E de menú/pantalla. El caso de matriz ahora inicia sesión como Manager y comprueba rutas/vehículos visibles, Equipo oculto, alta/edición/estado mantenimiento/baja y persistencia.
- Vistas cubiertas a 320×844, 390×844 y 768×1024 con aserción de overflow; lint/build/discovery de 18 pasan localmente.
- Actions `45013936721` pasó 17/18: el CRUD API Manager pasó, pero la UI ocultó Vehículos. Causa: Front colapsaba Manager y Logistics; se separó el rol UI `manager` con permisos de flota sin gestión de equipo.
- Cierre: Actions `45014430986` pasó con Front `7bf1955` + Back `648b23f`: audit/lint/build, responsive 1/1, E2E autenticado **18/18** y cleanup. Lint/build/discovery 18 pasan localmente.

## CRUD de Drivers para Manager — en validación — 2026-11-22

- Auditoría encontró que Manager tenía CRUD Driver en API, pero los controles estaban dentro de Gestión de Equipo junto a funciones Admin-only; AuthContext además solicitaba `/Users/my-team` a Manager/Logistics y recibía 403.
- Implementación local agrega permiso/pantalla de Drivers a Admin/Manager, evita la consulta no autorizada de usuarios y permite a Manager crear conductor sin cuenta, editar, asignar/desasignar y baja/reactivación. Logistics no ve la pantalla.
- E2E extendido para ciclo Driver desde UI a 320/390/768 px, persistencia API y ausencia de 403 de Users. Local `npm run lint`, `npm run build`, discovery 18 y `git diff --check` pasan; Actions pendiente.
- Auditoría adicional detectó límites UI/backend distintos para documento/teléfono y una medición responsive que no examinaba `main` ni la tarjeta nueva. Límites fijados a 20 en ambos lados y E2E ampliado.
- Verificación local del SHA actual: `npm run lint`, `npm run build`, discovery Playwright **18 tests** y `git diff --check` pasan. Actions API/MySQL pendiente.
- Auditoría read-only detectó un formulario duplicado de Admin sin restricciones y falta de cobertura tablet para la pantalla nueva. Equipo ahora exige perfil y comparte límites; E2E verifica atributos y la vista Manager con tarjeta/controles a 768×1024.
- Integración `88b0907` pasó Actions `45016257079` (responsive 1/1, E2E 18/18); las correcciones y comprobaciones finales pasaron en `d79ecb8`, Actions `45016638974`: audit/lint/build, responsive **1/1**, E2E autenticado Chrome/API/MySQL **18/18**, cleanup correcto.
- Auditoría siguiente detectó que UI no cubría asignación de rol Manager (fixture se cambiaba por API) y el diálogo no se medía a 320/768. Commit `d10e442`: lint/build/discovery 18 local y Actions `45017898939` completas; responsive **1/1**, E2E Chrome/API/MySQL **18/18**, cleanup success.
- Cobertura Dashboard: el E2E ahora compara sus cuatro cifras con las APIs autenticadas reales. Lint/build/discovery (18) y diff-check pasan local; Actions integrada pendiente.
- Hallazgo de fecha: `PlannedStart` se presentaba como creación y había fallback al reloj actual. Front ahora distingue `createdAtUtc` nullable, evita fecha inventada y ordena actividad. Local lint/build/discovery 18 y diff-check pasan; API/MySQL y Actions del nuevo SHA pendientes.

## Fecha real de creación de rutas — validada

- Front `cacb72e` consume `createdAtUtc` nullable, no inventa fechas legacy y ordena la actividad con timestamps reales.
- Actions `45020301540`: audit/lint/build, responsive **1/1**, Playwright autenticado API/MySQL **18/18**, cleanup success. Backend `45020146775` validó migración/persistencia y que editar no cambia el timestamp.

## Gestión de Equipo — edición/asignación Drivers en validación

- Selector filtra estado y asignaciones activas de otros Drivers; conserva el vehículo actual. “Quitar” requiere relación existente.
- La edición valida espacios y longitudes según backend antes de enviar el PUT.
- E2E añade errores UI/API y persistencia; lint/build/discovery Playwright 18 y diff-check pasan local. Actions `45021100857` valida con API/MySQL.

## Carga de conductores — lote local (2026-11-22)

- Nuevo feedback con error accesible y reintento si falla `GET /Vehicles` al gestionar conductores.
- E2E enfocado pasó 1/1. `npm run lint`, `npm run build`, y discovery Playwright terminaron bien; 19 casos descubiertos.
- Cambios y documentación están locales; falta publicar y comprobar Actions integrado/cleanup.

- Revisión externa del E2E añadió verificación de vehículo visible/seleccionable después del retry; botón deshabilitado con estado “Reintentando…”. El test enfocado pasó 1/1 tras ajustar la expectativa del fixture conductor.
- Commit `42b1b4b` (retry accesible y E2E de opciones recuperadas) validado por Actions `45023625523`: workflow Front completado `success`, con backend de la rama integrada.

- En Front, primera lint tras editar el diálogo encontró dos props `maxLength` duplicadas en el form Driver existente; se retiraron y la repetición lint/build/discovery 19 pasó. E2E integrado de la rama está pendiente.

## Validación integrada más reciente — 2026-11-22

- Front HEAD 000d6cb, Actions 45025319275 success: lint/build/audit, responsive y E2E autenticado con API/MySQL, cleanup.
- El run consumió backend 8d3cb32; las siguientes modificaciones del outbox backend aún no se han publicado, por lo que se requiere una corrida integrada nueva.
- Desarrollo móvil nativo queda explícitamente aplazado; mantener responsive web para desktop/tablet/móvil.

## Filtros, roles y responsive de Logistics — local validado 2026-11-22

- UI de rutas ahora ofrece Limpiar filtros con resultados filtrados además del estado vacío.
- E2E valida filtro combinado contra dos rutas persistidas y restauración de la lista; Manager y Logistics reciben 403 de Users/my-team por HTTP; Logistics mantiene asignaciones/diálogo sin overflow a 320 y 768 px.
- npm lint/build y suite E2E completa en Chrome/API/MySQL: 20/20. La base fue efímera y el runner ejecutó su limpieza; el container se eliminó.
- Requiere Actions nuevo tras push para confirmar commit integrado con backend 5049dea. Auditoría global sigue abierta.

- Validación integrada completada: Front `da70521` + backend `f2f18cd`, Actions `45028577152` success. Audit de dependencias, lint, build, responsive y E2E autenticado Chrome/API/MySQL **20/20** pasaron; runner/servicios descartables completaron cleanup.

## Estado integrado actual — 2026-11-22

- Front `505d6c3`, Actions `45030366554` success con Backend `43c074d`: audit, lint, build, browser responsive, Release/xUnit backend **80/80**, E2E autenticado API/MySQL **20/20**, cleanup correcto.
- El Backend `43c074d` pasó además Actions `45030208849`: smoke HTTP/MySQL tenant y Driver del mismo tenant, autorización, rutas/concurrencia y limpieza sin fixtures QA.
- Outbox quedó automatizado en SQLite para entrega/descifrado y dead-letter al intento 12. SMTP real requiere credenciales externas; nativo móvil sigue pospuesto por el usuario.
- La misión sigue abierta: completar vistas/acciones CRUD y responsive aún no cubiertas y resolver la política de promoción Admin delegado. No declarar la auditoría integral completa.
