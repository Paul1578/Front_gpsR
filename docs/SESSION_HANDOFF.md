# Handoff vigente — 2026-11-23

## Tres brechas E2E adicionales — en validación integrada

- QA de rutas/usuarios encontró (1) falta de aislamiento cross-tenant E2E en `/Users/{id}/status`, `/profile` y `/role`; (2) Admin raíz sólo tenía prueba de opción habilitada, sin promoción persistida; (3) eliminación de ruta comprobaba desaparición visual/HTTP pero no `isActive=false` persistido.
- Se amplió el E2E multiempresa con una cuenta User temporal y ataques a los tres endpoints: todos deben devolver 404, el usuario no aparece en el equipo ajeno y el dueño confirma perfil/rol/estado sin cambios.
- La prueba de Administración ahora promueve por UI a un Driver temporal a Admin desde la cuenta raíz, valida HTTP/body y `GET /Users/my-team`, y restaura Driver. Se agregó testid estable a la fila de usuario.
- Revisión adicional encontró que el selector de Administración aplicaba roles sin confirmación. Ahora usa diálogo para confirmar/cancelar; el E2E de raíz comprueba cancelar sin PUT, confirmar promoción y restaurar el rol. También mide la lista/select a 320 y 768 px.
- El flujo de ruta de mapa consulta el ID después de DELETE y exige `isActive=false`.
- Validación local del primer lote `bd38edd`: lint, build Next 16/TS, discovery **51 tests**, `git diff --check` pasan. Action [`45151010627`](https://github.com/Paul1578/Front_gpsR/actions/runs/45151010627) pasó **51/51 E2E**, responsive 1/1, Backend Release/xUnit, audit/lint/build y cleanup con API/MySQL descartables.
- El follow-up `d358166` pasó lint/build/discovery; Action [`45151685501`](https://github.com/Paul1578/Front_gpsR/actions/runs/45151685501) validó **51/51 E2E**, responsive 1/1, backend Release/xUnit, audit/lint/build y cleanup. La cuenta raíz pudo cancelar sin PUT, confirmar Admin, comprobar persistencia y restaurar Driver; lista probada a 320/768 px.
- Incidentes de la iteración (contexto de parche no coincidente y paths de controlador equivocados) quedan registrados en `ERROR_LOG.md` del checkout propietario.
- Commits Front `bd38edd` y `d358166` están publicados; ambos HEAD funcionales pasaron en sus Actions. Próxima fase abierta: incorporar y validar nuevos asserts en smoke Backend.

## E2E de correo duplicado en Equipo

- Añadida validación real de crear Manager/Logistics y volver a enviar su correo con username nuevo; espera HTTP 409 y verifica que el GET de equipo conserva una sola cuenta. El escenario no intercepta la petición.
- Lint/build/discovery 51/diff-check pasan localmente. Action [`45142003636`](https://github.com/Paul1578/Front_gpsR/actions/runs/45142003636) validó `e37cfeb`: **51/51 E2E**, responsive 1/1, audit, lint/build, backend Release/xUnit y cleanup exitoso.
- Un primer `rg` usó rutas equivocadas entre los checkouts Front/Backend; `ERROR_LOG.md` registra cómo resolverlo con `rg --files` y confirmar la raíz correcta.

## Username largo en tarjeta Equipo — validado

- Auditoría responsive detectó riesgo estático: `@usuario` acepta hasta 100 caracteres sin espacios y carecía de wrapping. No estaba reproducido como defecto.
- `TeamManagement` ahora permite partir la línea y el E2E integrado crea/edita username de 93/95 caracteres, verifica contenido/overflow a 320 y 768 px y persistencia por API.
- Validación local lint/build, discovery 51 y diff-check pasan. Action [`45139564823`](https://github.com/Paul1578/Front_gpsR/actions/runs/45139564823) pasó 51/51 con responsive, backend Release/xUnit, audit y cleanup API/MySQL. El límite está cubierto; la revisión fue preventiva y no se había reproducido overflow.

## Cambio de rol persistido desde Gestión de Equipo — validado

- Auditoría QA encontró que Admin creaba Manager/Logistics con navegador+API, pero el cambio de rol estaba cubierto sólo con API; la UI tenía confirmación/cancelación probada mediante mocks.
- Se amplió el caso integrado para abrir/cancelar la confirmación sin PUT, cambiar Manager→Logistics desde UI, comprobar respuesta/body y `GET /Users/my-team`, recargar y verificar el rol persistido. Incluye ancho de confirmación a 320 px y lista responsive a 768 px.
- Lint/build, discovery 51, diff-check y test enfocado 1/1 pasan localmente. Actions [`45138088658`](https://github.com/Paul1578/Front_gpsR/actions/runs/45138088658) y [`45138084594`](https://github.com/Paul1578/Front_gpsR/actions/runs/45138084594) pasaron **51/51 E2E** cada una, backend xUnit 136/136, responsive, auditoría/build y cleanup. El fixture temporal se eliminó.
- No queda pendiente este flujo; errores de tipado, copy, locator y aserciones encontrados están descritos con solución y prevención en `ERROR_LOG.md`.

## Edición de rutas por Logistics — validada

- El test `Logistics ve rutas pero no vehículos ni administración de equipo` ya cubría alta en constructor, cancelación, historial y denegación de flota, pero no edición desde UI.
- Se añadió edición de nombre y descripción del traslado, aserción de `PUT /Routes/{id}` HTTP 200 y lectura autenticada posterior que confirma persistencia sin cambiar conductor, vehículo ni estado.
- El flujo continúa con cancelación e historial usando el nuevo nombre. No hubo errores durante lint/build/discovery; no se añade incidente a `ERROR_LOG.md`.
- Validación local: lint, build y Playwright discovery **51 tests** pasan. CI integrado pasó en Front `761ffab`: Actions [`45132992521`](https://github.com/Paul1578/Front_gpsR/actions/runs/45132992521) y PR [`45132956752`](https://github.com/Paul1578/Front_gpsR/actions/runs/45132956752), **51/51 E2E** cada una, build/xUnit, audit/lint, responsive y cleanup.
- No hubo error nuevo en estas corridas; no se agrega incidente.

## Edición de rutas por Manager — validada

- La revisión QA encontró que el E2E Manager creaba la ruta y abría el editor a 320 px, pero cancelaba; backend ya cubría el permiso de actualización.
- Se amplió localmente el escenario para cambiar nombre/descripción, guardar, esperar el PUT y comprobar por GET que persisten recursos, parada Delivery y traslado intactos. El fixture conserva `finally` para restaurar rol y limpiar flota/ruta.
- Validación integrada Front `87da4aa`: Actions [`45133416432`](https://github.com/Paul1578/Front_gpsR/actions/runs/45133416432) y PR [`45133412567`](https://github.com/Paul1578/Front_gpsR/actions/runs/45133412567) pasaron **51/51 E2E** cada una, incluyendo `Manager usa el constructor de rutas...`; Release/xUnit, audit/lint/build, responsive y cleanup también pasaron. No hubo error nuevo.
- El registro de validación de Logistics ya está en `b1dd4f4`; esta cobertura Manager queda probada en `87da4aa` (mismo código E2E, antes de los cambios documentales de b1dd4f4).

## HEAD y verificación integrados más recientes

- Front `refactor/route-builder`: código/E2E `53b7674`; Action [`45146071543`](https://github.com/Paul1578/Front_gpsR/actions/runs/45146071543) pasó **51/51 E2E**, responsive **1/1**, audit/lint/build, Backend Release/xUnit 139/139 y cleanup. Incluye cuatro endpoints IDOR probados contra dos tenants y persistencia sin cambios.
- Front docs HEAD `fa3e349`; Action [`45148633887`](https://github.com/Paul1578/Front_gpsR/actions/runs/45148633887) pasó 51/51, responsive 1/1, Backend Release/xUnit 139/139, audit/lint/build y cleanup.
- Backend `chore/stabilize-fleet-platform`: código `ca1a278`, docs HEAD `c84e9dc`; Action [`45147903362`](https://github.com/Paul1578/Back_GPS/actions/runs/45147903362) pasó **139/139 xUnit**, Release, smokes tenant/concurrencia/login rate limit/proxy y cleanup.
- Ambas ramas están limpias y separadas de `main`. Los HEAD funcionales apuntan a sus branches; los commits posteriores sólo actualizan evidencia/documentación.
- Dependencias: `npm audit` reportó 0 vulnerabilidades y NuGet no encontró paquetes vulnerables en Backend/tests. Revisión de seguridad independiente fue estática y no encontró bypass tenant/roles/JWT ni XSS explotable en lo inspeccionado.
- Decisiones confirmadas: traslados permitidos; paradas pickup/delivery/both; sólo raíz otorga Admin; app nativa móvil pospuesta. SMTP, rate limiter distribuido, IP confiable del ingress, key ring persistente y despliegue productivo requieren configuración externa.

## Ciclo de traslado desde la UI Driver — CI validada

- En `e2e/fleet-admin.spec.ts`, el escenario que antes sólo creaba un traslado en tablet ahora lo asigna al Driver QA de operación, entra con su sesión a “Mi Ruta”, inicia y completa desde el UI sin evidencia operativa, y verifica por API los timestamps, estados de origen/destino y vehículo `Available`.
- `npm run lint`, `npm run build` (TypeScript + 11 páginas) y `npx playwright test --list` (51 casos) pasaron localmente. El E2E corrió contra MySQL descartable en CI; no se apuntó al MySQL local.
- El backend ya tiene ciclo API/MySQL transfer sin operaciones en `scripts/smoke-tenant-http.sh:1233-1257`, con actor Logistics y SQL final `Completed/Started/Ended/Vehicle Available`; por eso este lote cubrió específicamente el tramo de interfaz autenticado del Driver.

- Actualización: Front `44946d4` pasó Action [`45131410815`](https://github.com/Paul1578/Front_gpsR/actions/runs/45131410815), **51/51 E2E**, responsive **1/1**, backend Release/xUnit, audit/lint/build y cleanup. Cubre sesión Driver, inicio/completado UI, estado/timestamps por API y vehículo Available. Dos aserciones incorrectas/ambiguas quedaron corregidas y registradas en `ERROR_LOG.md`.

## Cobertura operativa Driver de varias paradas — confirmada

- El E2E `Driver sólo ve su operación, persiste evidencia fotográfica...` ya cubre recorrido real de dos paradas secuenciales, evidencia nota/foto, bloqueo de completado sin evidencia, cierre de ruta e Historial. Action `45131410815` pasó **51/51**; no hace falta crear otro test para esa brecha.

- Front `a510021` añade E2E integrado de Admin delegado con API/MySQL: login real, `/Auth/me` root=false, 403 para crear/promover Admin, GET confirma que el miembro sigue User, y la UI oculta opciones Admin. Backend `c32febe` prepara el fixture temporal. Lint/build y discovery 51 pasan; Actions integrado aún pendiente de push.
- Front `refactor/route-builder` HEAD `d0a9342`; Action [`45115772569`](https://github.com/Paul1578/Front_gpsR/actions/runs/45115772569) pasó audit/lint/build, responsive **1/1**, backend Release/xUnit, API/MySQL **50/50**, cleanup y teardown. El cambio funcional del horario fue validado previamente en `23e964e` por Action [`45114492930`](https://github.com/Paul1578/Front_gpsR/actions/runs/45114492930).
- Cambios validados: Admin sólo raíz en vista heredada; mapa comunica GPS vacío/ruta planificada; Gestión de Equipo muestra/reintenta fallo Vehicle y bloquea asignar; Dashboard distingue carga inicial de datos vacíos. El nuevo E2E confirmó que no aparecen cifras cero ni actividad vacía mientras cargan rutas.
- `playwright.config.ts` deriva el puerto del webServer desde `PLAYWRIGHT_BASE_URL`; se corrigió la colisión con Next anterior en `:3000` ejecutando en servidor limpio `:3010`. Action `45114492930` ejecutó 50 casos en 3.4 min sin fallos.
- Backend rama `chore/stabilize-fleet-platform` HEAD `ec15ea6`; Action [`45115773126`](https://github.com/Paul1578/Back_GPS/actions/runs/45115773126) pasó. El código en `6f48f06` pasó build, xUnit **135/135**, smoke HTTP/MySQL, concurrencia y cleanup en Action [`45113924558`](https://github.com/Paul1578/Back_GPS/actions/runs/45113924558). `main` sigue intacta. SMTP real, proxies/rate limit distribuido y persistencia Data Protection dependen del entorno productivo.
- Implementado en el lote: rutas de traslado sin paradas; paradas pickup/delivery/both; disponibilidad y bloqueo de conductor ocupado; confirmación rol/estado; recuperación con limitación por IP, token de 256 bits/TTL, HTTPS de enlaces productivos; cleanup de fixtures por relación FK Driver QA.
- Decisiones de usuario: raíz solamente otorga Admin; móvil nativo pospuesto; las cuentas pueden ser rutas de traslado.
- Front `23e964e`: 50/50 E2E confirma reset/activación UI, tema oscuro/claro persistente y horario `plannedStart/plannedEnd` intacto después de ediciones tablet/móvil; responsive 1/1, audit/lint/build y cleanup correctos.
- Pendiente global: continuar criterios alcanzables en `PROJECT_STATUS.md`. La DB local ya se consultó tras sincronizar el `.env` ignorado; el preflight se ejecutó y las cuatro migraciones pendientes se aplicaron. SMTP, Data Protection persistente, proxy/IP confiable y rate limiter distribuido requieren configuración de despliegue. No afirmar misión integral completa.
- Las notas anteriores que siguen son historial de trabajo y pueden describir estados/decisiones ya superados; usar este bloque y el inicio de `PROJECT_STATUS.md` como fuente actual.

## E2E de autenticación y administración — 2026-11-23

- Revisión independiente read-only sobre los **46** escenarios detectó brechas de evidencia: `/recovery/password`, `/reset-password`, `/activate-account`; verificar descarga de exportación de la empresa; persistencia del modo oscuro; y responsive de recuperación/reset/activación en 320×844 y 768×1024.
- Root-only ya tiene comprobación de backend HTTP/MySQL en `scripts/smoke-tenant-http.sh`; la prueba Front de opciones de Admin delegado usa API simulada. Si se amplía, usar DB descartable y confirmar persistencia/403 por API.
- Recuperación de usuario permanece deshabilitada intencionalmente porque no existe endpoint backend. SMTP real está excluido; no declarar envío exitoso al probar recuperación/activación.
- No se confirmó un bug en esos hallazgos estáticos. El ciclo reset/activación, descarga, responsive, tema y preservación del horario al editar están validados.
- Exportación real ya validada por Front Action `45110885218`: la prueba descarga JSON, verifica usuario de empresa recién creado, listas y fecha.
- Hallazgo de UX local: reset y activación describían incorrectamente el token como “12 caracteres” (mínimo que pertenece a la contraseña); recuperación prometía contraseña temporal/OTP. Texto corregido a enlace seguro de un solo uso, sin afirmar un SMTP exitoso.
- Nuevo `auth-recovery-responsive.spec.ts` verifica Recovery/Reset/Activate en 320×844 y 768×1024 sin overflow, contenido con token cargado, y copy lateral en 1280×900. La primera aserción esperaba visible en móvil un panel `hidden lg:block`; corregida para verificarlo en escritorio. El selector de heading de activación también se alineó al H1 real. Playwright focal pasa 1/1 local; falta lint/build final y Action integrada.
- E2E reset/activación completado en Action `45112755472`, tema persistente en `45113527889` y preservación de fechas en `45114492930`. SMTP real está excluido por credenciales; recuperar usuario no tiene endpoint.

## Cierre de validación Front — 2026-11-23

- Action `45108539423`: audit, lint, build, responsive 1/1, API/MySQL autenticado **46/46** y limpieza de contenedores correctos. El paso de conservar trazas se omitió porque no hubo fallos.
- Error de test local por reusar servidor Next obsoleto y desalinear puerto de `baseURL`/`webServer` quedó corregido y registrado en `ERROR_LOG.md`; se probó localmente con servidor de producción limpio y también en CI integrado.

---

## Continuación — 2026-11-22

## Estado vigente — diagnóstico de asignación y pruebas responsive

- Front `d652652` pasó Action `45085920993`: audit/lint/build, responsive browser **1/1** y **39/39 E2E**, incluido Manager mapa sin skips. Backend `1ce4d45` pasó Action `45085910280` (Release/xUnit, aislamiento tenant HTTP/MySQL, concurrencia y cleanup). Hay un fix adicional local del sufijo estable para reinicios de worker; volver a publicar y validar.
- Front `104723a` pasó Action `45086519736`: **39/39 E2E**, responsive **1/1** y cleanup correcto; Manager mapa usó y limpió el sufijo estable entre retries. Los selectores Vehicle de `8a90494` están en una Action posterior aún en ejecución.
- Front `8a90494` pasó Action `45086827516`: **39/39 E2E**, responsive **1/1**, audit/lint/build y cleanup; valida selector Vehicle por ID, botón de nombre accesible y cancelar baja.
- Ramas: Front `refactor/route-builder`; Backend `chore/stabilize-fleet-platform`; main sin cambios.
- Actions `45082924174` (1 worker) y `45083215716` reprodujeron asignación inestable: MySQL vio `Drivers.VehicleId=NULL` tras éxito UI. Causa: `UpdateDriverCommand` podía guardar un objeto previo al lock y sobrescribir el VehicleId concurrente. Backend fix `f8edbcd` publicado, regresión interleaving y Release xUnit **113/113**; Action `45084368819` pasó.
- La Action `45083215716` también mostró que DTO User de `my-team` no incluye documento y la UI generaba `ID:` vacío; UI omite ese campo sin valor, E2E valida username y mantiene prueba Driver API. `team-search` usa testid de tarjeta identificada por API.
- E2E Manager mapa ya ejecutó en Actions, pero `45084368342` y `45084699175` quedaron 38/39 por el hamburger mobile-only y fixture compartido de rol. Se sustituyeron por Manager y Driver de ruta dedicados, navegación desktop directa y cleanup idempotente por sufijo estable.
- Front `baa0288` ya incorporó el resto de fixes (asignación SQL, alta Driver, testid de tarjeta y documento opcional); 38 casos pasaron en `45084699175`. El cambio actual Runner/Spec/cleanup tiene lint/build/discovery **39**, `bash -n` y diff-check locales; publicar ambos y repetir Actions.
- Backend fix `f8edbcd` pasó Release xUnit **113/113**, HTTP/MySQL y concurrencia; runner `387b62f` pasó su Action. `44d224a` registra esos resultados.
- Auditoría Front detectó que reiniciar el worker regeneraría el UUID del fixture. El runner exporta `FLETFLOW_E2E_MAP_FIXTURE_SUFFIX` y el spec lo reutiliza para que el retry limpie los mismos nombres; CI pendiente.
- Auditoría señaló selectores por estructura/nth en Vehicle. UI añade `data-testid` por ID y label de eliminar; E2E valida que cancelar confirmación mantiene la tarjeta. Lint/build/discovery 39 pasan localmente; debe publicarse y probarse en Action.
- No marcar misión completa: quedan matriz CRUD/roles/responsive, SMTP productivo externo, móvil nativo pospuesto y decisiones pendientes de Admin delegado/desvincular User↔Driver.

## Auditoría de Administración de empresa — alta Driver con API/MySQL

- Auditoría independiente encontró que `company-admin.spec.ts` completaba el formulario de `SuperAdminView` pero nunca lo enviaba. `f07d37d` añade alta Driver real, lecturas persistidas User/Driver y UI/SMTP; lint/build/discovery 38 pasan, Action `45083215716` pendiente.

## Continuación — matriz de roles y CRUD de conductores — 2026-11-22

- Ramas activas: Front `refactor/route-builder` (`f07d37d`) y Backend `chore/stabilize-fleet-platform` (`5c8fb4f`); ambas publicadas, main intacta.
- Backend smoke amplía 403 Manager sobre Users/Roles y 403 Logistics para mutaciones Vehicle/Driver; compara snapshots SQL. La corrida local API/MySQL descartable pasó. Action `45080063668` en curso.
- Front E2E agregado completa alta, edición, asignación/desasignación y baja/reactivación en Gestión de Conductores. CI `45079269083` halló locator ambiguo (placa/documento repetidos); test corregido para usar DriverId de API. Lint/build/discovery 38 pasan antes de último ajuste responsive.
- Action Front `45080069469` falló 37/38: UI reflejó placa por estado optimista pero GET Driver retornó `vehicleId:null` después de PUT 204. La Action `45080342001` para `e18ea0f` pasó con 37 y marcó 1 flaky en el mismo paso (falló primer intento, retry pasó). No declarar persistencia validada; revisar causa backend/DB/concurrencia con traces; detalle `ERROR_LOG.md`.
- `team-search.spec.ts` amplía búsqueda de miembros a 320 px y Driver a 768 px además de 390 px; overflow verificado. Lint/build/discovery 38 pasan; Action `45080342001` pasó la suite, incluido el caso responsive.
- Worktree Front incluye cambio local sin commit para comparar asignación por API directa y por rewrite Next; aún falta lint/build/discovery, commit/push y Action integrada. Smoke backend asigna a Driver sin UserId y valida GET/DB, pero no explica la flakiness del E2E.
- Action `45081264602` falló/flaky en GET directo también (`vehicleId:null`), descartando rewrite como causa. Test local añade consulta SQL a MySQL efímero antes de GET para separar escritura de lectura; aún validar local lint/build/discovery, publicar y seguir Action.
- Action `45081992619` confirmó SQL `VehicleId=NULL` tras 204, luego retry pasó. Playwright CI ahora usa un worker para probar interferencia entre fixtures; commit/Action y nuevo resultado pendientes. Backend 5c8fb4f pasó xUnit 112/112 + smoke en Action `45081478212`.
- Error local de TypeScript por redeclarar `persistedDriver` durante la corrección del locator quedó renombrado a `createdDriver` y registrado en `ERROR_LOG.md`.
- Mantener misión abierta: cubrir CRUD/roles/responsive progresivamente. Admin delegado y desvinculación User↔Driver esperan respuesta; app nativa diferida y SMTP/infra productiva externas.

- Estado vigente Front `refactor/route-builder`: `2147be7` pasó Action `45076629351` y docs HEAD `8887649` pasó `45077576665`; ambas Actions completaron **37/37 E2E**, responsive **1/1**, audit/lint/build y cleanup API/MySQL.
- El test responsive de administración llena datos Driver y comprueba overflow a 320/768 px; también se valida en el historial de Actions. Front limpio tras publicar el commit.
- Próximo: cubrir más casos CRUD y matriz HTTP por rol; continuar responsive de vistas pendientes. No cerrar misión. Decisiones pendientes de Admin delegado y desvinculación User↔Driver; móvil nativo diferido.
- Auditoría de `DriversManagement` identificó que la pantalla dedicada sólo probaba búsqueda. Reload tras crear Vehicle corrigió la lista de opciones. Action `45079269083` falló 37/38 porque el locator por documento coincidía con tarjetas cuyos selectores contenían el mismo texto de placa. Se diferenció placa/documento y se toma ID desde API para ubicar la tarjeta exacta; lint/build/discovery 38 pasan local. Repetir Action autenticada y verificar cleanup.

- Action `45072706025` sobre `7f4841c` terminó **35/37**. Falló el E2E de Exportar por localizarlo en Resumen y el E2E de Gestión de Equipo porque un error de carga Driver se ocultaba entre solicitudes paralelas. Ambos fallos registrados en `docs/ERROR_LOG.md` y corregidos localmente.
- E2E corregido: navega a Gestión de Datos, verifica los tres `—`, recupera `/Users/my-team` desde Usuarios y hace un solo reintento conjunto de rutas/vehículos. Gestión de Equipo combina error local con el compartido de FleetContext. El resumen ya no muestra ceros engañosos.
- Se agregó protección de secuencia para que respuestas tardías de `/Users/my-team` no sobrescriban solicitudes más nuevas; solicitudes pendientes se invalidan al cambiar a rol no administrador.
- Action `45073324431` en `147ba89` pasó **36/37**: el único error nuevo fue que el `getByText` global encontró siete guiones de toda la página. La aserción ahora cuenta dentro de “Resumen de Datos”; repetir Action.
- Action `45074489447` para `00f3b7c` terminó **36/37**. Trace muestra que sólo quedaba el toast “Bienvenido, admin”; el test exigía cero alertas de toda la página. Cambiado a comprobar la desaparición de cada error de carga específico; volver a validar Action.
- Action `45075092805` sobre `ae34fa9` pasó **36/37**: cambiar de tabs luego de reintentar Users disparaba una recuperación automática de rutas/vehículos; no quedaban botones. Reordené: retry conjunto desde Resumen primero, retry User después. Falta nueva Action.
- Action `45075805793` en `067793e` terminó 36/37; retry de flota refrescó Users indirectamente y ya no había botón. Ahora el E2E hace retry de User primero con la falla todavía activa, después comprueba recuperación de flota.
- Se aisló el interceptor con banderas 503 separadas para Users y Routes/Vehicles; cada grupo permanece fallido hasta su propio retry, aun si el otro provoca renders/cargas compartidas. Validación E2E integrada pendiente.
- Action `45075980605` (`4eec893`) terminó **36/37**; el único caso pendiente reprodujo retry Fleet desaparecido tras un refresh compartido. El test responsive nuevo de formulario Driver en 320/768 px sí pasó. `ca7f6e0` y el siguiente mock independiente intentan resolverlo.
- La prueba responsive del panel ahora llena campos Driver a 320 px y verifica formulario/documento/teléfono y overflow en 320 y 768. No envía datos. Validar con Action.
- Auditoría independiente halló actualización parcial de vehículos entre `/Vehicles/{id}` y `/status`. El contexto ahora sincroniza datos generales inmediatamente y distingue el fallo de estado; E2E fuerza 409 en el segundo request y verifica la persistencia con GET. Cambios locales aún no validados: lint/build/Playwright integrado pendientes.
- Local: `npm run lint`, `npm run build` correctos; `npm run test:e2e -- --list` descubre 37. Repetir Action integrada con API/MySQL efímeros después de commit/push.
- Decisiones de producto pendientes del usuario: política para otorgar Admin y si se necesita desvincular User↔Driver reteniendo ambos registros. App nativa pospuesta por usuario.

## Continuación — 2026-11-22

- Front `340eb55` eliminó Equipos/`teamId` ficticios, completó correo y campos Driver; Action `45072015727` pasó 36/36 E2E, responsive 1/1, backend 111/111, audit/lint/build y cleanup.
- Front local añade estados de carga/error/reintento al panel de empresa y bloquea exportación parcial. Lint/build/audit/discovery 37/diff-check pasan; estos cambios siguen locales, deben publicarse y pasar Action.
- Front Action `45071113746` para `5d4e290` también pasó: 36/36 Playwright, responsive 1/1, backend xUnit 110/110, lint/build/audit y cleanup.
- Backend `87b208e` corrige desactivación de cuenta Driver con ruta Pending/InProgress. Action `45071475764` pasó build, xUnit 111/111, smoke tenant HTTP/MySQL, concurrencia y cleanup.
- Decisiones pendientes: quién puede otorgar rol Admin y si el negocio necesita desvincular User/Driver preservando ambos. App nativa móvil pospuesta.

## Cobertura del email duplicado en registro público — pendiente Action

- `e2e/fleet-admin.spec.ts`: tras crear cuenta raíz, el test envía el mismo email otra vez desde el formulario, comprueba HTTP 200/payload neutral igual, toast y redirección Login; después login de la cuenta original. El POST directo duplicado permanece como aserción de contrato.
- Ejecutar `npm run lint`, `npm run build`, discovery 36, diff-check y publicar en Front; exigir Action API/MySQL efímera y cleanup.
- Sigue el objetivo CRUD/roles/responsive. Respuestas pendientes sobre otorgar rol Admin y desvincular User/Driver.

## Hallazgo crítico — cierre de parada sin evidencia — fix local; CI pendiente

- Auditoría descubrió que API aceptaba `Pending→Skipped` y `InProgress→Completed` sin evidencia; luego no se permitía agregarla y la ruta quedaba imposible de finalizar.
- `Route.UpdatePointStatus` requiere evidencia antes de Completed/Skipped. Unit tests Release **110/110**. Smoke HTTP/MySQL efímero confirma 400 y snapshots SQL inalterados para Skip, Complete y cierre de ruta sin evidencia; camino válido y cleanup cero pasaron.
- Front deshabilita Omitir sin evidencia; E2E intenta ambas mutaciones por HTTP y verifica GET sin cambios, luego sigue el flujo válido. Lint/build/audit 0/discovery 36 pasan local. Actions integradas del fix pendientes.
- Archivos: Backend Route.cs, RoutePointTests.cs, smoke-tenant-http.sh; Front DriverView.tsx, fleet-admin.spec.ts. Publicar en ramas actuales y repetir Actions integradas.

## Continuación — búsqueda de conductores y E2E fallido corregido — 2026-11-22

- Ramas Front `refactor/route-builder`, Backend `chore/stabilize-fleet-platform`; no usar `main`.
- Local Front: búsqueda por nombre/apellido/documento/teléfono, insensible a tildes y mayúsculas, con estado vacío separado; nuevo E2E API/UI a 320 y 768 px.
- Action `45067692881` tuvo backend 107/107, audit/lint/build y responsive 1/1 verdes, E2E **34/35**. Falló el caso existente de alta Driver: `getByPlaceholder("Documento")` resolvía tres elementos tras añadir búsquedas. Se corrigió a `getByRole("textbox", {name:"Documento"})` y equivalente para Teléfono; Action `45068474426` pasó **36/36**, responsive, backend y cleanup.
- Para garantizar que el caso corra sin registros preexistentes, `58e2b4c` crea un Driver con API y lo desactiva en `afterEach`. El primer build de esa robustez encontró tipo nullable de token; se normalizó a `undefined`; build y lint locales pasan.
- Action `45069041959` pasó **36/36 E2E**, backend xUnit 107/107, audit 0, lint/build, responsive 1/1 y cleanup API/MySQL efímeros. API local no disponible para corrida funcional; el test real sí se ejecutó en CI.
- Backend smoke recibió pruebas HTTP negativas para PUT Vehicle inválido y create/update Driver inválido; revisar el diff del agente, ejecutar el smoke en MySQL descartable, documentar y validar CI antes de integrar.
- Mantener misión abierta: faltan más casos de CRUD/roles/responsive. Política de Admin delegado requiere decisión de producto; SMTP/PFX/infra productiva son externos; app nativa pospuesta.

## Continuación de auditoría — datos reales, búsqueda y responsive — 2026-11-22

- Ramas: Front `refactor/route-builder`, Backend `chore/stabilize-fleet-platform`; `main` intacta.
- Front `57e44c6` pasó Action `45066249833`: audit, lint/build, responsive 1/1, backend Release/xUnit 107/107, Playwright API/MySQL 33/33 y cleanup. Backend `52d7e46` fue el código integrado.
- Backend docs `029011e` pasó Action `45066471076`: build/xUnit, HTTP/MySQL tenant y concurrencia.
- Cambios pendientes de validación integrada: edit/cancel de rutas a 320/768; panel empresarial con métricas explícitas y sin import/reset/logs ficticios; búsqueda local de miembros y conductores; E2E nuevo de búsqueda y de panel.
- Backend smoke amplía el ciclo HTTP/MySQL de vehículo (edición, estado, baja lógica y reactivación) y pasó `bash -n`, `git diff --check` y MySQL efímero local con cleanup; Actions del nuevo diff aún pendiente.
- Reauditoría backend: siguen sin smoke HTTP positivo el vínculo manual User↔Driver y sin matriz de política para promover Admin delegado. La última necesita decisión del usuario antes de cerrar.
- Próximo: revisar los diffs, ejecutar lint/build/discovery, ejecutar/confirmar smoke aislado, documentar hallazgos y subir ambas ramas; esperar Actions integradas y corregir cualquier fallo.
- Límites externos: SMTP vigente, certificado/key ring e infraestructura productiva; app móvil nativa aplazada por el usuario.

## Session handoff — Manager crea rutas y CRUD responsive — 2026-11-22

- Ramas Front `refactor/route-builder`, Backend `chore/stabilize-fleet-platform`; `main` intacta.
- Front carga opciones de ruta para `manager`; E2E crea/persiste una ruta Manager con parada Delivery, edita/cancela en móvil y abre el constructor a 768 px. Alta Manager/Logistics comprobada a 320/768; ciclo de User editado y activación a 320.
- UX: control de salida de edición anuncia “Cancelar edición”. El runner backend acepta args Playwright, por ejemplo `bash scripts/run-e2e-local.sh --grep 'texto'`.
- Front validado local y en Action [`45058535602`](https://github.com/Paul1578/Front_gpsR/actions/runs/45058535602): lint/build, audit 0 vulnerabilidades, responsive **1/1**, E2E autenticado **33/33**, cleanup MySQL correcto.
- Backend `/Auth/logout` valida la propiedad del refresh token; dos regresiones xUnit. Release build limpio, xUnit **99/99**, smoke tenant HTTP/MySQL y concurrencia exit 0 con cleanup.
- Los errores intermedios y sus soluciones están en `docs/ERROR_LOG.md` de ambos repos.
- Backend Action [`45058536309`](https://github.com/Paul1578/Back_GPS/actions/runs/45058536309) también pasó build/tests, smoke HTTP tenant y concurrencia, cleanup. Commits Front `50bf9d0` y Backend `22c2fb6` están publicados en sus ramas.
- Siguiente: continuar la matriz CRUD/roles/responsive. Admin delegado requiere decisión de política; SMTP/PFX/infra productiva son externos y nativo móvil está aplazado.

## Session handoff — Constructor de rutas y CRUD Driver responsive — 2026-11-22

- Ramas activas: Front `refactor/route-builder`; Backend `chore/stabilize-fleet-platform`; no cambios en `main`.
- Action `45055100816` sobre Front `1a893c9`: pasó **33/33 E2E**, responsive **1/1**, backend Release/xUnit, audit/lint/build y cleanup. Confirmó mapa a 320 px, alta directa Manager/Logistics y entrada Manager a rutas/constructor en 320/768. Head Front actual `67df420` (actualización docs + upload-artifact v7.0.2); Backend `2045b18`, ramas limpias.
- Front: retirado `DEFAULT_POINT` de Quito. Escribir origen/destino deja ubicación pendiente y bloquea avance hasta mapa/búsqueda; test autenticado valida el flujo. Error/reintento de assignment-options se informa en la lista; rutas con IDs desconocidos no se presentan como sin asignar; cancelación respeta mantenimiento/otras rutas.
- Cobertura responsive existente incluye ciclo User a 768 px, roles a 320 px, Driver a 768 px y edición/cancelación de rutas a 320/768 px. Los nuevos tests manager quedan pendientes de ejecución autenticada.
- Próximo: continuar matriz CRUD/roles/responsive fuera de pantallas cubiertas. No esperar la corrida nueva por `upload-artifact@v7.0.2` hasta que exista un fallo que active esa subida condicional.
- Backend `2045b18` con 97/97 xUnit y smoke de fila-lock/driver-rutas; docs commit `280a0c8`. Backend Action `45050058627` pasó; el Front debe integrarse contra backend actual.
- Objetivo completo sigue abierto: continuar criterios alcanzables CRUD/roles/responsive/seguridad; Admin delegado requiere decisión de política, SMTP vigente e infraestructura/PFX son externas; nativo móvil diferido por el usuario.

## Session handoff — Mi Ruta y auditoría de sesiones — 2026-11-22

- Front `refactor/route-builder`, backend `chore/stabilize-fleet-platform`; no cambios en main.
- Action Front `45048803279` en `c4c5a10`: **26/28 E2E**; dos errores de locator por viewport de escritorio esperando hamburger móvil. Corregido al fijar 390×844 en ambos tests; causa y prevención documentadas.
- Auditoría Front independiente halló prioridad de ruta activa, error/empty de Mi Ruta y next-point obsoletos. Fixes de `DriverView`/`MainDashboard` y E2E para prioridad con APIs/MySQL, 503/retry y dos paradas están en progreso; correr lint/build, revisar fixtures/cleanup y lanzar CI de nuevo.
- Backend auditoría encontró revocación de refresh no serializada en cambio de rol y desasignación/baja/cambio de rol dejando ruta Pending huérfana. Código y tests locales corregidos (97/97); smoke tenant/concurrencia ampliados, validar con Release y CI MySQL.
- No concluir misión global; continuar auditando CRUD/roles/responsive y registrar regresiones.

## Session handoff — Cierre global visible y revocación E2E — 2026-11-22

- Front `refactor/route-builder`; Backend `chore/stabilize-fleet-platform`; `main` intacta. Front `38c58d6` pasó Action `45047502825` (26 E2E, responsive, build/lint/audit, backend tests y cleanup).
- Cambios locales Front: logout-all se movió fuera del acordeón de contraseña; E2E nuevos para revocación entre dos contextos y baja de miembro desde Equipo (401 en refresh y access). Runner backend prepara el User QA activo independiente para la baja.
- ESLint y `npm run build` pasaron; Playwright discovery **28** pruebas. Pendiente E2E remoto integrado; no publicar hasta resolver fallos y cleanup.
- Backend fix Driver/ruta: 94/94 xUnit local; smoke concurrencia y CI remoto pendientes. Actualizar este handoff después de cada Action.
- Auditoría integral sigue activa. SMTP/PFX/infrastructura productiva externos; app móvil pospuesta.

## Session handoff — 2026-11-22

- Branch Front `refactor/route-builder`; Back `chore/stabilize-fleet-platform`. Working branches only; no `main` changes.
- Front code commit `2f9d146` and result documentation are pushed (`9453479`). Actions `45034387245` passed backend Release/xUnit, audit/lint/build, responsive **1/1**, E2E Chrome/API/MySQL **21/21**, cleanup. It validates History Logistics and password update/revocation/login.
- Prior failures `45033318956` (ambiguous password selector) and `45033927966` (overbroad alert assertion) are documented with corrections; both conditions pass in 21/21 now.
- History uses route DTO vehicle plate/brand/model and doesn't request `/Vehicles` from Logistics.
- The detail-dialog bounds assertion at 320/768 px was added after Action `45034387245`; local lint/build/discovery and diff-check pass; this exact addition is pending a new Action.
- Front commit `11aeb19` fixes Logistics dashboard counts using authorized assignment options and active route vehicle IDs. Actions `45035807218` passed backend Release tests, audit/lint/build, responsive **1/1**, E2E **21/21**, cleanup. The E2E asserts real counts, no browser GET `/Vehicles`, and detail-dialog bounds at 320/768 px.
- Backend isolation smoke additions are in progress in `scripts/smoke-tenant-http.sh` (uncommitted; review after agent reports). Continue validation, update docs and branch, then continue more CRUD/role/responsive gaps.
- Backend HEAD `d3ac953` clean on `chore/stabilize-fleet-platform`; latest backend Actions `45032172895` passed Release build, xUnit 82/82, HTTP/MySQL tenant smoke, concurrency smoke and cleanup; docs-only `45032479667` also passed.
- External/product boundaries remain: valid SMTP credentials needed to test actual email; native mobile deferred per user; delegated-Admin policy needs product decision. The overall mission remains open.

## Iteración actual — exclusividad de vehículos asignados en UI y backend — 2026-11-22

- Auditoría real encontró que Gestión de Conductores ofrecía vehículos disponibles ya vinculados a otro conductor; ahora el selector excluye asignaciones ajenas y mantiene el vehículo propio visible.
- E2E Manager crea un segundo conductor y comprueba que el vehículo no aparezca mientras está asignado al primero; después de desasignar, verifica que vuelva a estar disponible. El test integrado previo cubre el ciclo responsive 320/390/768 px.
- `npm run lint`, `npm run build` y Playwright discovery **20** pasan localmente. Runner local se detuvo seguro porque no había cuenta Admin QA bootstrap; no se tocó la DB local. Actions `45031929936` pasó para Front `0da263b`: audit/lint/build, responsive y E2E autenticado Chrome/API/MySQL **20/20**, cleanup correcto. El backend checkout fue `2ad8471`.
- Auditoría backend encontró que crear/editar ruta omitía la exclusividad de asignación. Ambos comandos ahora consultan relación después del lock y devuelven 409 sin mutar; xUnit Release **82/82** pasa. Smoke MySQL y Actions integradas quedan pendientes.
- La primera suite backend completa dio 81/82 porque el fixture de doble inicio intentaba asociar dos conductores al mismo vehículo. Se corrigió para usar dos rutas del mismo conductor; causa y prevención están en `docs/ERROR_LOG.md`.
- Ramas aisladas: Front `refactor/route-builder`; Back `chore/stabilize-fleet-platform`. No declarar misión completa.

## Siguiente brecha — error visible al asignar un vehículo — 2026-11-22

- El manejador UI ya enseña errores API, pero faltaba comprobar un 409 desde Gestión de Conductores. Se añadió al E2E Manager un stub 409, aserción de alerta/no éxito y luego se deja continuar con asignación HTTP real.
- Local `npm run lint`, `npm run build`, discovery Playwright **20** y diff-check pasan. Actions `45032626648` pasó audit/lint/build, responsive 1/1, E2E autenticado Chrome/API/MySQL **20/20** y cleanup.

## Siguiente brecha — cambio de contraseña exitoso desde Perfil — 2026-11-22

- La cobertura anterior no ejecutaba el submit exitoso. Añadido E2E al final para cambiar la clave del User QA, confirmar logout, rechazo de refresh/clave anteriores y login con clave nueva. Quedó después de los tests que usan credenciales originales.
- Pendiente lint/build/discovery y Actions autenticado. El fixture vive sólo en MySQL efímero y el runner lo elimina.

## Fase completada — edición de perfil de equipo — 2026-11-22

- Gestión de Equipo edita nombres, apellidos y username con PUT /Users/{id}/profile; email queda inmutable. AuthContext.updateUserProfile separa guardado y refresco para no afirmar que falló un guardado exitoso.
- E2E edita miembro regular y valida GET /Users/my-team; edita Driver y comprueba sincronización en ambos sentidos. Tarjetas usan team-user-<id>.
- Lint/build y discovery Playwright (18 casos) pasan. Dos corridas iniciales dieron 16/18 y 17/18; se corrigieron texto duplicado y selector username obsoleto por testid, además del mock que liberaba 503 antes del alert. La suite autenticada final pasó 18/18 en Chrome/API/MySQL; runner código 0 y DB efímera eliminada.
- Revisión independiente: selector incorrecto, invalidación de tokenVersion sin revocar refresh (se retiró la invalidación innecesaria para editar datos de presentación), backfill omitido y sincronización de Driver sin filtro propietario; los cuatro quedaron resueltos.
- Misión no completa: seguir cubriendo CRUD/roles/responsive y no declarar cerrado el criterio de roles hasta resolver política de Admin delegado.

## Brecha de edición de perfil — RESUELTA; nota histórica supersedida

- Esta brecha fue resuelta por la fase de arriba: backend persiste nombres/apellidos, Front los edita junto al username, el email es inmutable y E2E valida persistencia/sincronización. Se conserva este encabezado únicamente para corregir el estado de la nota previa.

## Cierre E2E de Driver/GPS y render nullable — 2026-11-22

- Actions Front `45002920723` pasó con Front `5816adf` + Backend `41c01e7`: audit/lint/build, responsive browser, backend Release/xUnit y Playwright API/MySQL **18/18**, cleanup success.
- El pase verificó ciclo vehículo 320×844/768×1024, listar ausente ruta asignada a otro Driver, detalle/estado/parada/evidencia/GPS denegados sin cambios, Driver desactivado sin acceso a lista/detalle/GPS y reactivación. La pantalla Equipo también renderizó “Sin usuario vinculado”.
- Un commit de tipo posterior `cd7f171` expresa `userId?: string | null`; lint/build local pasan. Actions `45003051160` pasó para código `cd7f171`: audit/lint/build, responsive browser, backend y Playwright 18/18 con cleanup; valida el tipo nullable exacto.
- La raíz de fallos repetidos `45002306327`, `45002396041`, `45002610099` fue la lectura `.slice()` del `userId` nullable; corregido y cubierto. El falso assert de lista vacía quedó corregido por ID. Ambos problemas/soluciones están en `docs/ERROR_LOG.md`.

## Contrato nullable de Driver — 2026-11-22

- Además del fallback visual, el frontend ahora tipa `userId` como opcional y nullable en `Driver` y `ApiDriver`, en concordancia con el backend. Lint/build locales pasan; Actions `45002920723` está validando el fix de UI anterior y no contiene el ajuste de tipos. Se disparará nueva validación tras este commit.

## Fix de render para Drivers sin usuario vinculado — 2026-11-22

- Las Actions `45002306327`, `45002396041` y `45002610099` detectaron que mostrar bajas tras crear el Driver de prueba no encontraba el registro. Causa confirmada: `TeamManagement` ejecutaba `.slice` sobre `driver.userId` nullable y rompía el render al listar un Driver creado sin cuenta asociada.
- Front corrigió el fallback visual a “Sin usuario vinculado” y agregó aserción al E2E; la falla y solución están en `docs/ERROR_LOG.md`.
- Próximo: Actions integrada `45002920723` con Front `5816adf` y backend `41c01e7`; asegurar que pasa la ruta ajena, perfil inactivo y flujo de Equipo, revisar cleanup total.

## Ampliación de acceso inactivo — 2026-11-22

- El pase de controlador extendió `IsCurrentDriverAssigned` también a `GET /Routes/{id}`: antes del fix un perfil Driver inactivo podía seguir leyendo el detalle. El E2E ahora espera 403 en detalle/listado/GPS GET y POST con token vigente, y 200 tras reactivar el perfil.
- Backend `41c01e7` ya incluye el fix; Release/xUnit local 61/61. Actions backend `45002562048` en curso. Front `01724b7` ejecuta matriz de otro Driver y GPS inactivo; Actions `45002396041` en curso. Para cobertura completa con detalle inactivo, se agregó una aserción adicional después de esa corrida: lint/build/discovery 18 y diff-check pasan; pendiente commit y nueva Actions integrada.

## Autorización de Driver y responsive de vehículos — 2026-11-22

- Actions `45001695962` pasó para Front `1c108cc` + Backend `923072b`: audit, lint/build, responsive browser, suite autenticada y cleanup en MySQL; el ciclo CRUD del vehículo comprobó 320×844 y 768×1024.
- Se extendió ahora el E2E Driver: denegación de lista/detalle/estado/paradas/evidencia/GPS para ruta de otro Driver; verifica estado/evidencia/GPS sin mutaciones y desactiva/reactiva el perfil Driver con JWT vigente para comprobar bloqueo GPS. Backend fix correspondiente está en `2fdc9e0`; integración de esta ampliación pendiente de Actions.
- El test crea recursos etiquetados `E2EQA`/`E2E QA ruta` que el runner de CI elimina en su cleanup SQL. El perfil Driver original se reactiva en `finally`, incluso si falla una aserción.
- Local tras agregar la matriz: lint/build, discovery de 18 pruebas y diff-check pasaron. Falta Actions para validar HTTP real y limpieza.

## Validación responsive CRUD de vehículos — 2026-11-22

- El E2E Admin de vehículos ahora prueba el CRUD en 320×844 y 768×1024, mide overflow horizontal y confirma que los diálogos de alta/estado caben dentro del viewport. El ciclo de negocio mantiene alta, placa duplicada, edición, mantenimiento/disponible, baja y reactivación reales por UI/API.
- Local: `npm run lint`, `npm run build`, discovery Playwright (18 tests) y `git diff --check` pasaron. El test API/MySQL real queda sujeto a Actions.
- Backend smoke por alta Driver concurrente: primer Actions `45001352585` halló expectativa incorrecta de HTTP 201 frente a contrato 200/409. Corregido para admitir 200 o 201 sólo para la petición ganadora, manteniendo 409 y aserción de persistencia atómica. Actions repetido `45001599626`, estado pendiente al último chequeo.
- Se intentó dispatch con `backend-ci.yml` inexistente (404); el workflow real `ci.yml` se disparó correctamente. Error registrado en backend `docs/ERROR_LOG.md`.
- Siguiente: confirmar ambas Actions; revisar hallazgos y elegir el siguiente vacío de CRUD/roles/responsive. Misión aún abierta.

# Session handoff

## Corte integrado — 2026-11-22

- Branches: Front `refactor/route-builder` HEAD `505d6c3`; Backend `chore/stabilize-fleet-platform` HEAD `4b67a86` (documentación sobre código validado en `43c074d`). Ambas ramas aisladas de `main`.
- Front Actions `45030366554` success; checkout backend `43c074d`; audit/lint/build/responsive y E2E API/MySQL **20/20** pasaron. Incluye backend Release/xUnit **80/80**.
- Backend Actions `45030208849` validó código `43c074d`: xUnit 80/80, HTTP/MySQL, autorización Driver same-tenant, concurrencia y cleanup success. Actions `45030428079` también pasó para `4b67a86`.
- Trabajo reciente: fix TOCTOU en cambio de estado tras lock/reload; smoke HTTP del Driver ajeno en el mismo tenant con aserción no-mutante; tests SQLite para entrega exitosa y dead-letter del outbox. Los errores iniciales y correcciones están en `ERROR_LOG.md`.
- Pendiente: ampliar los CRUD/roles/responsive restantes; revisar política de promoción a Admin delegado antes de cambiar permisos. SMTP real necesita credenciales; app móvil nativa está aplazada. Mantener la misión activa.

## Validación de filtros/roles/responsive — 2026-11-22

- Front commit `da70521` publicado en `refactor/route-builder`; Actions `45028577152` terminó success con checkout de backend `f2f18cd`.
- Audit, lint, build y responsive pasaron; E2E autenticado Chrome/API/MySQL **20/20**, cleanup completado.
- Añadido reset de filtros persistente con resultados parciales; el E2E combina filtros por estado/vehículo/Driver y confirma que limpiar restaura ambas rutas. Manager/Logistics reciben 403 de `Users/my-team` sin filtrar correo. Logistics conserva selectores y diálogo de cancelación sin overflow a 320/768 px.
- La misión continúa: quedan cobertura CRUD/responsive adicional, pruebas backend automatizadas del outbox y completar matriz propia de ownership Driver; Admin delegado sigue a decisión de producto. SMTP requiere credenciales externas; app nativa aplazada.

## Corte más reciente — 2026-11-22

- Front `refactor/route-builder` incluye `fe86bfa`; Back `chore/stabilize-fleet-platform` incluye `4695e79`. Actions frontend `45005853556` pasó: backend tests, audit, lint/build, responsive browser y Playwright API/MySQL **18/18**, cleanup exitoso.
- E2E añade denegación de edición de perfil para User/Driver/Logistics/Manager y cubre persistencia/sincronización de miembros y Drivers.
- En trabajo local: extender navegación Dashboard/Historial a viewport 320×844 con control de overflow; lint/build/discovery pasan, falta integrar este cambio con API/MySQL en Actions.
- Se amplió también Mi Ruta a 320×844: comprobar overflow, no-solapamiento entre insignias GPS/vehículo y límites horizontales del diálogo de evidencia. Lint/discovery/diff-check pasan; commit/Actions pendientes.
- Auditoría subagente: sidebar fijo de 256 px a 768 px comprime el área útil; constructor mapa/formulario secuencial bajo 1024 px causa desplazamiento repetido; Mi Ruta carecía prueba 320 px. Priorizar prueba/ajuste del menú tablet, luego flujo constructor.
- Sidebar ya cambiado a drawer hasta 1024 px. Su E2E a 768 px verifica apertura del menú y ancho real de `<main>` >700 px; lint/build pasan localmente, CI pendiente antes de integrar.
- Actions `45006627500` valida Driver a 320 px con E2E 18/18 + responsive 1/1.
- Action `45006747816` para el drawer falló 3/18: las pruebas de Equipo, mapa tracking y creación route no abrían drawer al llegar a 768 px. Los clics ya están añadidos y el error quedó registrado en `docs/ERROR_LOG.md`.
- Action `45007503895` volvió a fallar 3/18 (15 pasaron): dos E2E esperaban el botón `Seleccionando` dentro del panel oculto al abrir mapa, y tracking no reabría drawer después de reload. Cambios aplicados localmente: esperar `Ver paradas y detalles`, reabrir drawer y cubrir regreso a editor.
- Action `45008055246` pasó 17/18; el único fallo añadía una parada temporal y la quitaba sin volver del mapa al editor, agotando el timeout y también la ventana de cleanup. El test ahora cambia de panel antes de borrar esa fila; repetir CI.
- Constructor móvil/tablet implementa alternancia editor/mapa y vuelve a editor tras seleccionar punto. Lint/build/discovery 18 pasan; código y corrección de test están locales, falta commit/push y Action integrada.
- Próximo: lint/build/discovery, commit/push y Action integrada; corregir regresiones hasta 18/18, incluido cleanup; luego continuar CRUD/roles.
- Próximo: commit/push de prueba responsive, esperar Actions, incorporar hallazgos del agente de auditoría y seleccionar siguiente brecha CRUD/roles/responsive. La política de promoción de miembros a Admin delegado sigue pendiente de respuesta del usuario.
- No marcar misión completa: cobertura de CRUD/roles/responsive no exhaustiva; SMTP depende de credenciales externas y móvil nativo está pospuesto.

## Estado integrado actual — 2026-11-22

- Ramas actuales y limpias antes de este registro: frontend `refactor/route-builder` en `8b59308`; backend `chore/stabilize-fleet-platform` en `029e94d`. No modificar `main`.
- Actions frontend `44991377967` terminó `success`, descargando exactamente backend `029e94d`: xUnit 57/57; audit, lint y build frontend correctos; responsive 1/1; E2E autenticado API/MySQL 15/15 sin skips.
- La misión sigue abierta: el objetivo siguiente es ampliar en forma verificable las acciones de CRUD y vistas responsive que no aparecen en los 15 E2E actuales. Revisar informe de auditoría de cobertura en curso antes de elegir el siguiente test.
- Externos/diferidos: SMTP real requiere credenciales vigentes; la aplicación móvil nativa fue pospuesta por el usuario. No confundir estos límites con web responsive.

## Cobertura nueva en validación — 2026-11-22

- Se añadió en `e2e/fleet-admin.spec.ts` un flujo real de creación de ruta en tablet 768×1024: mapa, parada PickupAndDelivery, asignación, revisión, GET de persistencia y overflow por etapa. Limpieza intenta retirar ruta y vehículo y restaurar la asignación previa.
- Local pasó `npm run lint`, `npm run build`, `npm run test:e2e -- --list` (16 tests) y `git diff --check`; el caso de navegador/API/MySQL sólo se contará al pasar Actions.
- Actions `44991979019` arrojó 15/16: el caso tablet superó el límite general de 30 s, y el cleanup con `page.request` falló al cerrarse su contexto. El trace no fue publicado, así que no se atribuye el timeout a un locator específico. Se cambió a timeout total de 90 s, waits UI de 8 s y fixture independiente `request`; repetir CI ahora.
- La repetición `44992464372` precisó el locator: `Abrir menú` sólo aparece en móvil; en 768 px se navega directamente desde el sidebar. Esa selección ya se corrigió. El cleanup del vehículo pasó incluso tras el error UI; volver a ejecutar Actions y validar guardado/cleanup normal.
- Actions `44992803081` superó ese paso y encontró que el vehículo creado por API no estaba en el snapshot anterior de FleetContext. Se agregó reload tras crearlo; 15 E2E pasaron, cleanup cumplió. Siguiente: repetir Actions y comprobar el GET de ruta, overflow por etapa y cleanup normal.
- Actions `44993132771` llegó a revisión y reportó que el nombre de parada no forma parte del resumen visible. Se corrigió para validar tres puntos allí y operación/nombres por GET después de crear. Los 15 E2E existentes y el cleanup pasaron; volver a correr para confirmar POST, persistencia exacta y cleanup normal.
- Actions `44993456874` confirmó E2E 16/16 y responsive 1/1 (ruta tablet creada y persistida), pero falló la limpieza MySQL porque el nombre del fixture no respetaba `E2E QA ruta %`. Nombre corregido; volver a Actions y confirmar que el runner termina sin fixtures residuales.
- Auditoría independiente de huecos confirma que CRUD básico UI (vehículo, Driver, User y ruta), matriz parcial de roles y mobile responsive ya están cubiertos; siguen pendientes pruebas CRUD negativas, matriz HTTP exhaustiva, más vistas responsive tablet y acceso a rutas por Driver entre alcances.
- Actions `44993827707` terminó verde para Front `2932aa0` + Back `029e94d`: Release/xUnit **57/57**, audit/lint/build verdes, responsive **1/1**, E2E **16/16** y cleanup MySQL exitoso. La ruta creada en tablet está ahora verificada end-to-end.
- Se añadió al E2E de vehículo el cambio `Mantenimiento`/`Disponible`, con lectura API y persistencia UI luego de reload; requiere nueva Actions integrada antes de contarse probado.
- El primer run de vehículo (`44994219944`) falló por carrera de test: el waiter de PUT aceptaba antes la actualización general que el endpoint `/status`. Ahora se espera `PUT .../status`, valida 204/body, y después consulta GET. Repetir Actions.
- Actions `44994623654` confirmó ese arreglo y el estado operativo real: backend 57/57, responsive 1/1, E2E 16/16, audit/lint/build/cleanup correctos. El test cambia mantenimiento y disponibilidad, compara valores API 2/0 y confirma tarjeta tras reload.
- Próximo corte de roles añadido: Manager debe tener acceso positivo a listar rutas/vehículos y CRUD/lifecycle de vehículo; la matriz existente ya garantiza denegaciones Users/Roles y restores el fixture Driver en `finally`. Nueva ejecución CI pendiente.
- Actions `44994997016` confirmó el corte de Manager en Front `202ec3d` + Back `029e94d`: E2E 16/16, responsive 1/1, xUnit 57/57, audit/lint/build y cleanup MySQL correctos. El Manager creó, editó, cambió estado, leyó y eliminó vehículo; fixture restaurado. La siguiente cobertura debe abordar brechas restantes de CRUD negativo, vistas responsive y acceso Driver a rutas por tenant.

## E2E de orden y operación de paradas — 2026-11-22

- El cambio aislado se integró a `refactor/route-builder` en `69bdd31`; el test agrega, quita y reordena paradas y confirma por GET API el orden y operación persistidos. La ejecución local se omitió por falta de Admin QA y API activa, sin crear fixtures.
- Actions `44986079119` encontró un 409 al limpiar el vehículo porque CreateRoute lo deja asignado al Driver. `010bc31` restauró la asignación previa; Actions `44986497890` pasó con responsive 1/1 y Playwright 14/14.
- Revisión independiente detectó que cleanup podía abandonar pasos posteriores ante un error y no cancelaba rutas activas. El `finally` ahora cancela antes de borrar, restaura/libera Driver, intenta eliminar vehículo aun si otra etapa falla y acumula errores explícitos.
- Local tras el hardening: lint, build, listado de 14 tests y `git diff --check` pasan. Falta la nueva ejecución Chrome/API/MySQL; no contar todavía la robustez final como validada.

## Ramas y contexto

- Frontend `/home/leonardo/Front_gpsR`: `refactor/route-builder`.
- Backend `/home/leonardo/Back_GPS`: `chore/stabilize-fleet-platform`.
- Mantener `main` intacta. El usuario autorizó cambios y pidió documentar errores y soluciones.

## Completado

- Constructor de ruta en cuatro pasos, mapa con selección de puntos visible, operaciones múltiples de recogida/entrega/ambas.
- Al entrar al paso del recorrido, origen se selecciona automáticamente; prueba Chrome confirmó que el clic actualiza coordenadas y muestra el marcador.
- Driver muestra operación/estado por parada y guarda evidencia (nota/foto JPEG, PNG, WebP) en API.
- Backend valida transiciones y exige evidencia por parada cerrada antes de completar la ruta.
- `FleetContext` conserva operación al editar y mapea evidencia también en origen/destino; cambio de estado usa endpoint dedicado.
- Pausar una ruta devuelve el vehículo a disponible si no hay otra ruta en curso.
- GPS falso eliminado; datos de mapa y rutas provienen de API/geolocalización real.
- Aislamiento multiempresa, migración de ownership aplicada y prueba HTTP IDOR descritos en la documentación backend.

## Verificación más reciente

- `npm run lint && npm run build`: correcto.
- `npm audit`: 0 vulnerabilidades reportadas.
- `dotnet test BackEnd_Gps.sln --no-restore`: 35 aprobadas.
- E2E API/MySQL con recogida, entrega, evidencia, posición GPS y cierre aprobado; SQL confirmó cero registros QA tras limpiar.
- Chrome headless validó login desktop/móvil, dashboard móvil con datos reales sin overflow y clic de mapa que fija origen con marcador visible.
- Chrome headless completó creación de ruta desde UI: clics para origen/destino/parada, parada `pickup_and_delivery`, asignación de recursos, resumen y guardado. GET autenticado confirmó tres puntos y operación `PickupAndDelivery`; datos QA limpiados.
- CRUD Chrome Admin: alta/edición de vehículo, alta de Driver con aviso SMTP, asignación y desasignación comprobadas. El 415 de desasignación se corrigió en middleware backend; tras repetir, UI mostró vehículo desasignado. Datos QA eliminados.
- Prueba real de roles encontró mismatch entre UI `Logistics` y policies backend `Dispatcher` (y faltaba seed). Corregido en backend; Logistics obtiene rutas, User recibe 403.
- Gestión de equipo en Chrome: creó Manager, cambió a Logistics, validó persistencia después de reload y desactivó/reactivó; SQL confirmó limpieza QA.
- Driver E2E en 390×844: inicio de ruta, parada recogida/entrega, nota persistida tras recarga y cierre. RouteDto entrega placa/modelo asignado; otro Driver del tenant fue rechazado. Screenshot visual confirmó tarjeta vehículo y sin overflow.
- Tablet 768×1024: dashboard, vehículo/equipo/rutas y constructor paso 2 sin overflow; clic real colocó origen y actualizó lat/lng.
- Dashboard local HTTP 200; Swagger 200; API protegida sin token 401.
- Verificación de esta sesión: Frontend lint/build/npm audit limpios; backend suite 43/43 y Release build sin warnings. Se añadió test EF InMemory para persistir ruta y vehículo de conductor en el mismo commit.
- Seguridad: rotación local MySQL root y JWT hecha en backend; MySQL recreado conservando volumen y 21 migraciones. QA rows de rutas, conductores y vehículos en cero.
- Swagger 200 en Development; rutas protegidas sin token 401; `/dashboard` 200.
- UI ahora separa `User` de `Logistics`, evita reportar métricas globales falsas, filtra rutas, bloquea doble guardado y respeta fallo de API al borrar.
- App nativa queda pospuesta por decisión del usuario; mantener responsive web en los criterios.

## Pendiente para continuar

1. Completar E2E visual CRUD y negativas de permisos aún no cubiertas; matriz parcial User/Driver/Logistics/Manager ya pasó 15/15 en Actions, sin necesitar credenciales persistentes.
2. Revisar vistas responsive restantes; constructor tablet y operación Driver móvil ya se verificaron en sesiones previas.
3. Configurar SMTP vigente; para cualquier ambiente remoto verificar y rotar credenciales por separado.
4. E2E HTTP/MySQL ya está automatizado en CI; mover fotos a object storage antes de escalar.

## Errores QA documentados

Codec Python `utf-utf-8-sig` inválido corregido a `utf-8-sig`; placa de test excedía longitud y se reemplazó por dato válido; primer fixture E2E omitía origen/destino de la lista de puntos y se corrigió para cumplir contrato. Se documentaron además fallos históricos de lint/plugin, EF y migración en `docs/ERROR_LOG.md`.

## Cierre de auditoría integral — 2026-11-21

- Frontend lint/build/npm audit terminan correctamente (0 vulnerabilidades); backend asociado 45/45 Release, 22 migraciones locales.
- Fixes de la auditoría UX: no llamar a API de ubicación no existente, conservar último tracking en error, reintentar, distinguir trazado estimado y limitar espera de restauración de sesión.
- El primer cierre repitió sólo smoke HTTP; a continuación se prepararon cuentas QA temporales para continuar E2E visual, documentado aquí y en `TESTING.md`.
- Actualización: Chrome E2E visual comprobó edición/baja/filtro/reactivación de Driver y viewport 390×844; User no ve controles de Equipo/Rutas y API deniega ambas secciones. El defecto de lista inactiva fue corregido con filtro condicional y secuencia de requests.
- E2E adicional cubrió Vehicle create/search/edit/baja lógica y Manager→Logistics (Rutas autorizadas, Vehicles denegado). Limpieza confirmó cero fixtures.
- Dos revisiones independientes reales (backend y frontend) completadas; el límite de hilos no permitió asignar cinco agentes, así que no afirmar que se creó el equipo completo.
- Móvil nativo se aplaza por solicitud del usuario; responsive web permanece en alcance.

## Continuación de estabilización — 2026-11-21

- Suite backend Release confirmada en 45/45; frontend lint, build y auditoría npm terminaron correctamente, sin vulnerabilidades reportadas.
- Chrome Admin/User/Logistics/Vehicle verificó CRUD representativo, visibilidad por rol, respuestas 403/200 esperadas y baja lógica. Se limpió cada fixture.
- MySQL confirmó 22 migraciones, cero cuentas/recursos QA, cero refresh tokens activos y cero usuarios con roles duplicados.
- Frontend en `127.0.0.1:3000` responde 200; Swagger backend en `127.0.0.1:5048` responde 200. `/api/Dashboard` no forma parte del contrato: la pantalla se arma en cliente consumiendo Vehicles/Routes/Drivers. El sondeo manual a esa ruta inexistente se corrigió como error de diagnóstico, no como falla del servicio.
- Corrección frontend reciente: el filtro de Drivers sólo descarta inactivos cuando se solicita `onlyActive=true`; la secuencia de peticiones evita que respuestas concurrentes obsoletas reemplacen la lista actual.
- Pendiente: ampliar casos visuales del CRUD de equipo/rutas e integrar E2E repetibles en CI con secretos QA; SMTP depende de credenciales vigentes. Producción requiere dominio/TLS y decisiones de almacenamiento/rate limiting.
- Repetición posterior a añadir CI: frontend lint/build/audit pasó (0 vulnerabilidades); backend Release 45/45; YAML de CI frontend parseó correctamente; `git diff --check` limpio.
- Se integró Playwright: login inválido y CRUD Admin de vehículo. Prueba real en Chrome 390×844 pasó 2/2 con backend/MySQL; temporal Admin y vehículo QA borrados físicamente. El test del CRUD queda omitido si faltan las variables QA.
- El wrapper puntual de esta prueba dejó esperando al proceso API después del resultado; se interrumpió esa espera, se verificó cero cuentas/vehículos QA y se reinició API en Development sin bootstrap (Swagger 200). El servidor estable quedó verificado.
- Un primer reinicio desacoplado volvió a morir con la terminal (HTTP 000); se levantó API en una sesión PTY persistente. Verificado posteriormente: `/dashboard` 200, Swagger 200 y ruta protegida sin JWT 401.
- Suite Playwright ampliada: 4/4; edita desde Gestión de Rutas una ruta pendiente asignada a Driver de equipo y conserva `PickupAndDelivery`; el rol User no ve controles operativos y obtiene 403 en ambas APIs. Runner limpia Admin/User/Driver/vehículo/conductor/ruta por prefijos QA y rechaza web/API no locales.
- Configuración de Playwright detecta Chrome del sistema; el comando directo sin credenciales ejecutó login negativo y marcó los tres flujos autenticados como skipped, sin mutaciones. Lint/build/npm audit pasaron después del ajuste.
- Playwright se amplió a cinco flujos: alta Driver desde Gestión de Equipo, aviso SMTP, edición persistida, baja y reactivación. Repetición Chrome contra API/MySQL pasó 5/5, 390×844 sin overflow y cleanup SQL dejó cero datos QA.
- La prueba de edición de ruta también pasó en 390×844 siguiendo los pasos Información/Recorrido/Asignación/Revisión; en móvil no existen los tabs de salto directo de escritorio.
- El mismo E2E ahora cancela la ruta y verifica Historial en móvil: filtro Canceladas, estado persistido y diálogo de detalles. Chrome/API/MySQL pasó 5/5; fixtures retirados.
- El quinto caso ahora valida también Driver→Logistics→Driver: backend baja/reactiva el perfil operativo y `TeamManagement` refresca la lista al cambiar hacia/desde Driver. E2E Chrome/API/MySQL completo 5/5.
- El flujo de alta cierra el diálogo después de confirmar el POST y reporta fallos de refresco aparte. El rate limit Development permite loopback para QA; fuera de Development sigue el límite de 60/min.
- Verificación actual repetida: frontend lint/build/npm audit (0 vulnerabilidades), backend Release 47/47; MySQL 22 migraciones, cero filas QA y cero refresh activos.
- No se pudieron abrir subagentes adicionales en esta continuación por el límite de hilos concurrentes; las auditorías previas frontend/backend permanecen documentadas y no se atribuye revisión nueva a agentes.

## Continuación: alta visual y autorización — 2026-11-21

- Dos subagentes reales realizaron auditoría de solo lectura. Frontend identificó la falta de alta/baja visual de ruta; backend identificó brechas en matriz HTTP y aislamiento multiempresa automatizados. Los informes no modificaron archivos.
- El E2E ahora recorre el constructor móvil completo: clics de mapa para origen, dos paradas (recogida; recogida+entrega) y destino; asigna recursos, comprueba cuatro puntos/operaciones por API y borra con el diálogo. Suite autenticada Chrome/API/MySQL: 7/7.
- Corregido input de parada a ancho cero: filas con `flex-wrap` y nombre con mínimo 130 px. Para inventario fresco el E2E recarga después de crear vehículo por API.
- CI ejecuta prueba Playwright no mutante responsive. Lint/build/npm audit 0 vulnerabilidades.
- Backend: aislamiento InMemory ahora comprueba filtros en Vehicles, Drivers, Routes y RoutePositions; regresión de roles controller para Vehicles, Drivers y Users. `dotnet test` Release: 48/48.
- Cleanup SQL tras E2E: cero usuarios/vehículos/conductores/rutas QA y cero refresh tokens vigentes.
- Pendiente: E2E de matriz de roles/tenant sobre HTTP/MySQL dentro de CI, más acciones y vistas responsive, SMTP válido externo. App nativa pospuesta por el usuario.

## Verificación HTTP cross-tenant — 2026-11-21

- `scripts/run-e2e-local.sh` ahora crea una segunda cuenta Admin raíz temporal en un tenant separado; el cleanup SQL existente la elimina por el prefijo QA.
- Playwright autenticado comprueba los listados y operaciones cross-tenant en Vehicles, Drivers y Routes: lectura/edición/baja cruzadas 404; una ruta no puede enlazar vehículo o Driver ajenos.
- Ruta A se inicia y guarda posición real. A recibe la ubicación; B ve `[]` con 200 por el filtro global y no puede añadir ubicación (404). Esto no es una fuga; la expectativa de 404 en GET colección fue corregida.
- Se probó flujo completo Chrome/API/MySQL **8/8**. MySQL final: 0 cuentas, vehículos, Drivers, rutas QA y refresh tokens activos.
- La primera ejecución reportó 400 al intentar GPS sobre ruta Pending; el fixture ahora hace transición a InProgress, conforme a regla backend, antes del POST de posición. Todos los casos pasan.
- Backend xUnit permanece 48/48; los asserts de autorización ahora se complementan con prueba HTTP local, aunque aún falta integrarla a CI remota.

## Cierre de esta continuación — 2026-11-21

- Confirmación final repetida: frontend lint/build/npm audit (0 vulnerabilidades), Playwright Chrome/API/MySQL 8/8.
- Backend Release tests 48/48, Release build 0 warnings/0 errors, NuGet sin vulnerables.
- `/dashboard` 200, Swagger 200, API protegida sin sesión 401. `.env.local` modo 0600.
- SQL MySQL: 22 migraciones y cero fixtures/refresh activos.
- Mantener meta activa: HTTP cross-tenant ahora verificado localmente pero pendiente CI; faltan pruebas de más acciones/vistas responsive. SMTP continúa bloqueado por credencial externa; app nativa diferida por decisión del usuario.

## Integración API/MySQL en CI backend — 2026-11-21

- El backend incorporó un servicio MySQL 8 descartable y `scripts/smoke-tenant-http.sh` al workflow de CI; la prueba valida aislamiento HTTP real entre tenants para Vehicles, Drivers, Routes y RoutePositions.
- La equivalente local pasó contra una base aislada `fletflow_ci_validation_02` (22 migraciones); el script retiró los fixtures y se descartó la base.
- Se arregló la carga local para que variables del proceso prevalezcan sobre `.env` (`Env.NoClobber`). El primer arranque incorrecto creó una sola cuenta QA en `fletflow`; se eliminó por email exacto y se verificó cero. No se alteró el esquema principal.
- Ramas actuales: frontend `refactor/route-builder`, backend `chore/stabilize-fleet-platform`. Ninguna está publicada en `origin`; el workflow todavía no tiene ejecución remota en estas ramas. La app nativa sigue pospuesta; responsive web permanece en alcance.
- Continúan pendientes los E2E frontend autenticados en CI, cobertura de vistas/acciones responsive no cubiertas y credenciales SMTP vigentes.

## E2E frontend integrado en CI — 2026-11-21

- El workflow frontend ahora inicia MySQL 8, clona `Paul1578/Back_GPS` en `chore/stabilize-fleet-platform`, compila/prueba el backend, inicia API con credenciales aleatorias y ejecuta `scripts/run-e2e-local.sh` para la suite autenticada completa.
- El runner backend usa el cliente MySQL del host con `MYSQL_HOST/USER/PWD`; en CI rechaza esquemas fuera de `fletflow_ci*` y limpia los fixtures del esquema aislado.
- Se ejecutó localmente con un esquema descartable nuevo y Chrome: **8/8**; ruta con paradas, User, tenant cruzado y CRUD pasaron. Cleanup dejó cero usuarios E2E en la DB principal, 22 migraciones y la base temporal descartada.
- La primera preparación omitió exportar `MYSQL_PWD` y abortó antes de crear el esquema; se corrigió exportando el secreto local, sin cambios en datos. Tras la prueba, la API local se reinició explícitamente y Swagger responde.
- Pendiente: ejecutar ambos workflows remotos después de publicar las ramas/PR; cerrar cobertura visual de vistas/acciones aún no cubiertas y SMTP externo.
- Las ramas ya se publicaron y existen PRs borrador frontend #2 y backend #5. El backend Actions pasó; el primer frontend Actions falló sólo en el precheck de Next antes de crear fixtures. Se corrigió y actualizó runtime de actions; revisar la siguiente ejecución.

## E2E móvil de constructor corregido — 2026-11-21

- El test calculaba clics antes de desplazar el mapa a una posición visible y la aserción apuntaba a un padre DOM que no contenía coordenadas; `NaN, NaN` quedaba como falso positivo.
- La prueba hace scroll del mapa, elige un espacio libre de marcadores y valida cada tarjeta por `data-testid`, rechazando ubicación pendiente y `NaN`. Leaflet cancela el movimiento anterior y recentra sin animación; el handler conserva refs actuales con `useLayoutEffect`.
- Frontend `npm run lint && npm run build`: correcto. E2E autenticado Chrome/API/MySQL local en bases efímeras `fletflow_ci_validation_06` y `fletflow_ci_validation_07`: **8/8** en la repetición final; la base fue descartada por cleanup.
- Los fallos de preparación de esta sesión (ruta DLL, URL de API, servidor web, tipos Leaflet y aserción) constan en `docs/ERROR_LOG.md` con sus soluciones.
- Siguiente: revisar diff/audit, publicar el commit en `refactor/route-builder`, comprobar Actions frontend/backend y continuar CRUD/roles/responsive aún no cubiertos. No cerrar la misión.

## Errores de carga de Equipo y matriz de roles — 2026-11-21

- `refreshTeamUsers` tragaba errores de API y presentaba lista vacía; el efecto de `refreshDrivers` dejaba la carga activa si rechazaba. Corregido: errores visibles con retry en ambas secciones, `finally` en las cargas y propagación segura desde contextos.
- Añadidas pruebas Playwright para 503→retry en ambas colecciones, Driver, Logistics y responsive tablet 768×1024. Suite completa **12/12** en Chrome/API/MySQL con base efímera; cleanup exitoso.
- Un primer assert tablet usó el texto de navegación como heading; se corrigió a “Rutas” y se registró en ERROR_LOG.
- Pendiente incorporar estos cambios al PR y repetir CI; continuar cobertura de pantallas/CRUD no enumerados. Este reporte no cierra la misión.
- Corrección de continuidad: la suite frontend ya está publicada en PR y el run Actions `44974312596` completó verde (12/12 Playwright autenticados, audit, lint y build) para commit `4b60bf1`. Debe repetirse al actualizar el backend; su revisión concurrente sigue en curso.
- Backend acaba de incorporar validación de Driver activo al iniciar ruta y locks transaccionales owner-scoped para evitar doble reserva concurrente. La regresión de dependencia SQLite vulnerable se corrigió con SQLitePCLRaw.lib.e_sqlite3 2.1.14; NuGet audit posterior sin vulnerables y xUnit 49/49. Aún falta publicar/verificar Actions de esta iteración.
- Backend quedó publicado en `90da59a` (PR #5). MySQL real validó Create/Update/start/desactivación simultáneos con estados persistidos consistentes; Release xUnit 50/50, build 0 warnings y NuGet audit limpio. Lanzar/esperar Actions del backend y frontend antes de continuar.

## Continuidad — Historial y cobertura de asignaciones — 2026-11-21

- Rama actual frontend: `refactor/route-builder`; backend: `chore/stabilize-fleet-platform`; nunca trabajar en `main` ni fusionar PRs.
- Frontend con cambios locales pendientes: RouteHistory corrige resolución de Driver y semántica de fechas, tiene retry de error; E2E prueba filtros, persistencia de asignar/quitar vehículo e Historial móvil. `npm run lint`, `npm run build` y Playwright real Chrome/API/MySQL pasaron (**13/13**) usando DB efímera `fletflow_ci_validation_16`, descartada automáticamente.
- Runner intentado inicialmente con `FLETFLOW_API_URL` terminando en `/api`; falló en validación previa. Repetición con origen `http://127.0.0.1:5048` completó 13/13; error registrado en `docs/ERROR_LOG.md`.
- Backend `90da59a` está publicado y CI pasó (`44976384961`). Frontend CI previo `44976408960` pasó para `1c8856a` (12 escenarios); los cambios de esta sección aún deben commit/push y validarse remotamente.
- Pendiente: revisar diff/status de ambos repos, npm audit, documentar/commit/push; esperar Actions; continuar CRUD y responsive en pantallas sin cobertura. Super Admin global no está definido en backend (roles: Admin, Driver, Manager, User, Logistics), documentado como pendiente de producto/arquitectura. SMTP externo; app nativa móvil pospuesta.

## Continuidad — autorización, concurrencia y ciclo de vehículo — 2026-11-21

- Ramas: frontend `refactor/route-builder`, backend `chore/stabilize-fleet-platform`; no usar `main` ni integrar/mergear PRs sin instrucción.
- Última versión frontend publicada y verde: `dc8b697`, Actions run `44977358352` (13 escenarios). Hay cambios locales posteriores: errores de alta conservan mensaje API; CRUD de vehículos permite listar/reactivar bajas; E2E tiene mensaje, baja/reactivación de usuario, responsive Equipo/mapa, reordenar/quitar paradas y ciclo de reactivación vehículo. Lint/build/audit correctos; suite local nueva **14/14** con Chrome/API/MySQL.
- Cambios backend locales: evento JWT consulta estado activo de cuenta; baja revoca refresh; refresh rechaza inactivos; check `Vehicle.IsActive` al iniciar; locks/validaciones evitan baja de rutas en progreso, desasignación Driver y baja vehículo en asignación activa; escrituras de paradas toman lock. Añadido `POST /Vehicles/{id}/reactivate` con comando transaccional.
- Evidencia local backend: Release xUnit 50/50, build 0 warnings/0 errores. Smoke tenant/auth e invariantes reales MySQL pasó, incluida revocación, HTTP 409 ante operaciones incompatibles, reactivación y dos updates simultáneos de parada. Bases efímeras se descartaron.
- Errores y correcciones de la preparación (contraseña `DB_PASSWORD` desincronizada, DLL previo, identificadores QA demasiado largos, mock 503 consumido por GET inicial) constan en `docs/ERROR_LOG.md` de cada repo.
- Próximo paso: revisar diff de endpoints/contratos, ejecutar lint/build/test de corte, actualizar docs de seguridad/reglas, commit/push en ambas ramas y comprobar Actions con commit exacto. Continuar matriz HTTP por roles y responsive/CRUD restantes. Super Admin global requiere definición de producto/backend; SMTP real externo; app nativa aplazada por el usuario.

## Continuación de roles, sesiones y responsive — 2026-11-21

- Rama frontend: `refactor/route-builder`; se agregó el rol `Usuario` al alta y edición de miembros. La prueba autenticada crea una cuenta real y comprueba `roles: ["User"]` en `/Users/my-team`.
- El cierre de sesiones ahora sólo cierra la sesión local cuando el API confirma la revocación; un error HTTP muestra su mensaje y conserva la sesión para reintentar.
- Playwright en Chrome/API/MySQL real: **14/14**, incluida navegación móvil/tablet, perfil responsive, error de logout-all, CRUD de vehículos/rutas/conductores, User/Driver/Logistics, aislamiento entre empresas y persistencia de paradas. Esquema QA temporal eliminado.
- `npm run lint`, `npm run build` y `npm audit --omit=dev` pasan después de las modificaciones; Playwright final 14/14.
- Errores de pruebas documentados en `ERROR_LOG.md`: la prueba de alta encontró un nombre accesible compuesto y el contrato del equipo devuelve `roles[]`, no `role`; se corrigieron selector y aserción tras inspeccionar DOM/API.
- Falta hacer commit/push de este lote y verificar Actions con su SHA. Pendientes reales: ampliar CRUD/responsive en pantallas aún sin cobertura, decidir alcance de Super Admin con backend/producto y credenciales SMTP. App nativa móvil aplazada por el usuario.
- Backend HTTP smoke extendido y pasado: Manager crea Vehicle/Driver/Route y edita rutas; Logistics edita/elimina rutas, sin crear vehículos/conductores; User y Driver no crean rutas. MySQL temporal se descartó.
- El smoke comprobó además registro anónimo que pide Admin (persistió User y recibió 403 en flota) y logout-all real (200, refresh revocado).

## Continuidad — Actions publicados en verde — 2026-11-21

- Front `refactor/route-builder` SHA `6e37c4d`: Actions run `44982243409` success. Backend hermano `chore/stabilize-fleet-platform` SHA `4cf62a3`: run `44982244087` success.
- Pruebas locales frontend: lint/build/npm audit sin hallazgos y Playwright autenticado 14/14 contra API/MySQL. Backend incorporó tests de recuperación/activación: suite 54/54.
- Siguiente: continuar cobertura restante de CRUD y responsive. No cerrar misión; SMTP externo pendiente, nativo móvil aplazado.

## Próximo caso E2E — estado de usuario — 2026-11-21

- `e2e/fleet-admin.spec.ts` extendido para activar y desactivar desde UI una cuenta con rol User, verificando persistencia en API. Se suma a la prueba de creación ya existente.
- Lint/build y diff check locales pasaron; falta publicar y esperar Actions de este cambio. Runner integrado usa Chrome, backend y MySQL efímeros.

- Confirmado después del push: Actions `44982723150` success en `96caf15`, incluidos el E2E de activar/desactivar User y la integración Chrome/API/MySQL. Próximo lote puede empezar sobre `refactor/route-builder` limpio.

- Último E2E remoto: `44983346765` success para `2eb0102`, contra backend `cff33c6`; 14/14 Playwright, responsive 1/1, lint/build/audit verdes. Branch `refactor/route-builder` queda limpia.

- Último CI frontend `44983694110` success en `0236c49`, E2E 14/14 y responsive 1/1; el backend de esa corrida ya incluía `TokenVersion` y los 56 xUnit quedaron verdes en su propio run `44983763612`.

## Próxima verificación — operación real del Driver

- Cambio local sin publicar en `e2e/fleet-admin.spec.ts`: extiende el caso Driver para crear vehículo/ruta efímeros, completar una parada `pickup_and_delivery` con evidencia desde móvil, cerrar ruta y verificar status/vehículo en API.
- `npm run lint`, `npm run build`, `npm run test:e2e -- --list` y `git diff --check` pasan; debe publicarse y esperarse Actions integrado. Fallos deben quedar registrados aquí y en `ERROR_LOG.md`.

- E2E de Driver pendiente de repetición: run `44984300436` falló porque la prueba esperaba 204 en status de parada (contrato real 200) y dejó ruta activa, causando 409 en retry y tenant test. Aserción actualizada y `finally` cancela/baja la ruta. Confirmar siguiente run verde y si el cleanup permite cross-tenant posterior.

- Hallazgo adicional del trace: Leaflet (z-index de controles) interceptaba el botón “Nota” del modal. Se subió el z-index común del overlay/contenido a 2000/2001. Cleanup exige cancelación y baja exitosas. Nuevo E2E debe pasar y no contaminar cross-tenant.

- Run `44985230566`: el modal ya funciona sobre mapa y cleanup elimina conflicto; 13/14 pasaron, incluido cross-tenant. Único fallo restante: aserción al completar parada esperaba 204 pero ese endpoint devuelve 200. Se corrigió y verificó después en Actions `44985541718` (14/14).

## Resultado integrado Driver — 2026-11-22

- Estado de ramas: Front `refactor/route-builder`, SHA `1f3a24c`, limpio y sincronizado; Back `chore/stabilize-fleet-platform`, SHA `2bf305d`, limpio y sincronizado. `main` intacta.
- GitHub Actions Front `44985541718` pasó para SHA `1f3a24c`: backend Release build **0 warnings/0 errors**, xUnit **56/56**, audit y lint verdes, build Next verde, responsive **1/1**, E2E autenticado **14/14** en Chrome con API y MySQL desechables.
- El caso Driver ejecuta inicio de ruta, nota como evidencia, cierre de parada y cierre de ruta desde la UI móvil; por API comprueba `Completed` y vehículo `Available`. El modal de evidencia queda sobre controles Leaflet y cleanup elimina fixtures aun ante error.
- Documenté el contrato HTTP incorrecto asumido por la prueba y el z-index que bloqueaba el modal en `ERROR_LOG.md`; ambos están corregidos y verificados por CI.
- Siguiente: cerrar cobertura real de reordenar/quitar paradas, matriz backend de permisos tras cambios de rol, CRUD y responsive de pantallas restantes. Las revisiones delegadas de frontend/backend ya terminaron y sus cambios se integraron; el hardening adicional del cleanup está publicado y en validación.
- No declarar completa la misión. SMTP necesita credenciales externas vigentes; app nativa fue pospuesta por el usuario; Super Admin requiere definición de producto porque no existe en el contrato backend.

## Reordenamiento de paradas: corrección del cleanup — 2026-11-22

- Integré la prueba en `refactor/route-builder` (commit `69bdd31`); agrega/retira/reordena paradas y compara vía API los cuatro puntos y operaciones persistidos. La ejecución local se omitió por no tener servicios/credenciales QA; Actions `44986079119` sí la ejecutó y detectó que la limpieza de vehículo recibía 409.
- Causa: crear ruta asigna su vehículo al Driver; tras borrar la ruta, ese vínculo sigue vigente. El test ahora captura el `vehicleId` previo y en `finally` lo restaura (o desasigna) antes de eliminar el vehículo de prueba.
- Lint/build/discovery pasaron. Actions `44986497890` para `010bc31` validó el caso 14/14; Actions `44986877646` para `aa49b83` confirmó el cleanup endurecido 14/14.

## Resultado E2E de orden y cleanup — 2026-11-22

- Actions frontend `44986877646` para `aa49b83` terminó success: backend Release 57/57, build sin warnings/errores, responsive 1/1 y Playwright Chrome/API/MySQL 14/14.
- El test persistió cuatro puntos en el orden exacto con operaciones recogida/ambas/recogida y demostró que el punto eliminado no se guarda. Su cleanup restauró/desasignó el Driver y retiró el vehículo.
- La cancelación de ruta activa ante fallo está implementada y reporta errores de limpieza, pero el caso normal del test no ejecutó esa rama.
- Estado actual Front `refactor/route-builder` sincronizado en `2500ddb` (documentación; el último código funcional es `18ca8f0`). Back `chore/stabilize-fleet-platform` sincronizado en `fb01c25`. `main` intacta.

## Responsive de Perfil a 320 px — 2026-11-22

- Amplié el recorrido autenticado Admin para abrir Perfil y reducir el viewport a 320×844 antes de abrir el formulario de cambio de contraseña; se conserva la aserción de ancho y visibilidad.
- Lint, build, test discovery (14) y diff check pasan localmente. Actions `44987222908` para `18ca8f0` validó responsive 1/1 y E2E 14/14 con API/MySQL descartables; backend Release 57/57. Breakpoint validado en Chrome.

## Trabajo restante

- Continuar casos de CRUD, mutaciones por rol y responsive web aún sin verificación real; la suite actual descubre 16 E2E y no pretende cubrir cada acción/pantalla.
- Externos delimitados: credenciales SMTP válidas; móvil nativo pospuesto por el usuario; administración global Super Admin sin contrato/rol backend definido; despliegue productivo (dominio/TLS/object storage/rate limiting distribuido).

## Matriz de permisos y responsive de errores — 2026-11-22

- Commit `286b100` ya está publicado en Front `refactor/route-builder`: `e2e/fleet-admin.spec.ts` incorpora denegaciones API esperadas para User, Driver, Logistics y Manager en operaciones de flota, rutas, usuarios y roles.
- La matriz usa las cuentas User/Driver efímeras del runner, IDs inexistentes para operaciones negativas y un Vehicle QA para payloads. El rol temporal del Driver se restaura a Driver mediante `finally`; `run-e2e-local.sh` limpia prefijos E2E de MySQL.
- En `team-management-load-errors.spec.ts`, errores y reintentos de Equipo/Choferes comprueban 390×844 y ausencia de overflow. El spec pasó 2/2 localmente.
- Estado combinado: lint/build, discovery (15) y `git diff --check` pasan. La matriz no se ejecutó localmente porque API/Frontend locales responden HTTP 000 y no hay credenciales QA; Actions ya la ejecutó con DB efímera (15/15 sin skips).
- El primer build detectó error TypeScript por capturar headers mutables no inicializados; se pasan explícitamente a cada factory y el build posterior pasó. Ver `docs/ERROR_LOG.md`.
- La matriz comprobó los HTTP 403 esperados con API y MySQL efímeros. El commit `286b100` pasó Actions `44989454133`: xUnit 57/57; Playwright autenticado 15/15 sin skips; responsive 1/1; audit/lint/build correctos. Se corrigió el detalle de `ERROR_LOG.md`; continuar con la cobertura global restante.
- El backend relacionado avanzó después a `029e94d`; Actions `44991181335` confirmó build, xUnit y smoke HTTP/MySQL del ciclo Logistics con cleanup. Siguiente: disparar el workflow frontend contra ese HEAD y registrar el SHA/run cruzado.

## Cobertura en curso — duplicados y geolocalización móvil — 2026-11-22

- Front E2E modifica el CRUD Admin para validar HTTP 409/mensaje en español al repetir placa, sin segundo vehículo.
- E2E Driver a 390×844 habilita GPS Playwright a `(-0.185, -78.465)`, valida “GPS en vivo”, inicia la ruta y espera el POST + GET real de persistencia.
- Local Front: lint/build, discovery 16 tests y diff-check verdes. Backend `6ec5315`: Release local 59/59 y Actions `44995681296` success con smokes MySQL. Luego probar ambos cambios frontend en el workflow cross-branch.
- Brecha prioritaria sugerida por auditoría independiente real; agente no hizo modificaciones.
- Backend corrigió duplicados de placa a HTTP 409: Release 59/59 y Actions `44995681296` success en `6ec5315` con smokes HTTP/MySQL. Front agregó E2E de rechazo visible y de geolocalización Driver móvil; lint/build/discovery 16 pasan localmente. Próximo paso: publicar E2E/documentación, verificar Actions frontend contra backend actualizado, corregir cualquier fallo y seguir con CRUD/responsive restantes.

## Corrección detectada por GPS E2E — 2026-11-22

- Actions `44995899244` terminó **14/16**: no pasó Driver GPS ni el test tenant que reintentó tras conflicto. Causa del primer fallo: el throttle de 20 s se marcaba aun con ruta pendiente, por eso el primer GPS POST tras iniciar quedaba suprimido y el test agotaba 30 s. El timeout cerró `page.request`; los retries heredaron ruta activa y obtuvieron 409.
- `DriverView` ya exige `estado=en_progreso` antes de consumir el throttle. Driver y tenant ahora usan `request` independiente para cleanup, cancelan rutas activas y restauran la asignación original antes de retirar el vehículo.
- Lint/build/discovery 16 y `git diff --check` pasan local. Actions nuevo SHA pendiente para verificar GPS/persistencia, ciclo Driver y cleanup entero.
- Actions `44996497487` para Front `6fe66f7` + Back `104cda8` pasó success: backend xUnit 59/59; responsive 1/1; E2E 16/16; audit/lint/build; la tarea `Stop containers` finalizó. La prueba GPS confirmó POST y GET con coordenadas conocidas, duplicate plate confirmó 409 visible y no duplicado. Continuar auditoría CRUD/responsive aún faltante; la misión global no está terminada.

## Siguiente cobertura — documento Driver duplicado — 2026-11-22

- Backend `POST /Users` con rol Driver ahora reporta conflicto 409 antes de registrar cuenta; CreateDriver y UpdateDriver comparten BusinessConflict y mensaje claro.
- xUnit local 61/61. E2E móvil Admin crea Driver con documento existente pero email diferente; comprueba error y ausencia en GET `/Users/my-team`.
- Front lint/build/discovery 16 pasan localmente. Publicar backend y frontend y verificar Actions con API/MySQL descartables; todavía no contar el flujo E2E.
- Cerró el lote de documento duplicado Actions `44997054375`: Front `1bb7d71` contra Back `a7f7c4e`, xUnit 61/61, responsive 1/1, E2E 16/16, audit/lint/build y cleanup correctos. El siguiente trabajo sigue siendo ampliar CRUD, roles y responsive; la misión global continúa abierta.

## Cobertura de selección y tracking en mapa tablet — 2026-11-22

- Revisión independiente: Mapa se abría a 768×1024 y solo se comprobaba overflow; no había acción de selección ni prueba visual del tracking a ese ancho.
- Añadí `Admin selecciona una ruta y consulta su tracking en el mapa tablet`: viewport 768×1024, dos rutas API, una en progreso con posición GPS persistida, selección alterna, GET de posiciones, marcador GPS y overflow de documento/`main`.
- El test crea temporalmente un segundo Driver para cumplir las reglas de agenda, y en `finally` cancela/elimina rutas, restaura asignaciones y retira vehículos. El SQL cleanup del runner elimina el Driver/usuario por prefijo `fletflow.e2e.driver.*`.
- Local: lint, build, discovery **17 tests** y `git diff --check` pasan. E2E autenticado local no se pudo ejecutar porque Front `:3000` y API `:5048` respondían HTTP 000.
- Commit Front `a5dd689` Actions `44997939176` terminó success con Back `a7f7c4e`: build backend sin errores, xUnit **61/61**, frontend audit/lint/build, responsive **1/1**, E2E autenticado **17/17**; cleanup/stop API y MySQL success. El nuevo flujo de selección/tracking tablet pasó.
- Los errores de rutas de inspección están documentados en `ERROR_LOG.md`. Rama frontend sincronizada y limpia tras el commit de producto; registrar resultado CI y continuar CRUD/responsive restantes.

## Historial en viewport tablet — 2026-11-22

- El E2E Admin que ya crea/edita/cancela y consulta la ruta cambia a 768×1024 al entrar en Historial; verifica que el filtro `Canceladas` es visible y funcional, que la pantalla y `main` no desbordan, y que el diálogo de detalles cabe en el viewport.
- `npm run lint`, `npm run build`, discovery **17 tests** y `git diff --check` pasan localmente. El caso depende de API/MySQL y queda pendiente de ejecutar en Actions después de publicar.
- Actions `44998408284` para Front `650e306` terminó success: backend Release 61/61, audit/lint/build, responsive 1/1 y E2E **17/17**; cleanup/stop API y contenedores success. El filtro y detalle del Historial pasan en 768×1024. La rama sigue en `refactor/route-builder`.

## Registro público y cuenta raíz de empresa — en validación — 2026-11-22

- Hallazgo: `/register` prometía una cuenta Gerente pero el backend forzaba User; la cuenta se autenticaba sin capacidad para manejar su empresa.
- Backend local cambia el rol fijo a Admin como propietario de un tenant nuevo; el cliente no puede escoger el rol y `owner_id` mantiene el aislamiento multiempresa.
- Front elimina `roleName` del payload, conserva los nombres introducidos como username y agrega E2E UI de registro a 390×844, rol Admin en `/Auth/me`, lista Vehicles vacía con 200 y acceso al menú de gestión.
- Validación integrada: Actions `44999716080` pasó en Front `e2cdcb1` con Backend `3620cc2`: xUnit 61/61, audit/lint/build, responsive 1/1 y Playwright **18/18**, API/MySQL y cleanup success.
- Alta móvil confirmó redirección al Dashboard con sesión Admin, `/Auth/me`, lista propia vacía y navegación a Vehículos/Rutas; E2E comprobó ancho sin overflow. Ambos workflows manuales concluyeron en verde.
- Errores de investigación y decisión/corrección de la contradicción están en `ERROR_LOG.md` de ambos repositorios.

## Cancelación desde Gestión de Rutas — validada

- Brecha UX: el E2E cancelaba por API; la lista de rutas no tenía acción de cancelación.
- `RoutesManagement.tsx` muestra acción con confirmación sólo para rutas pendientes; llama `updateRoute(..., { estado: "cancelada" })` y reporta según resultado del backend.
- El E2E móvil existente cancela mediante UI, confirma HTTP 204, lee el estado persistido y comprueba Historial. Lint/build, discovery (18) y diff-check pasan localmente.
- Error inicial TypeScript por variable `routeCard` redeclarada corregido y registrado en `ERROR_LOG.md`. Actions `45000517571` pasó: backend Release 61/61, responsive 1/1 y Playwright 18/18; el caso cancela por UI, verifica 204/persistencia e Historial.


## Última validación de constructor responsive — 2026-11-22

- Front branch `refactor/route-builder`, commit `d0ab050`; Actions `45008495969` pasó: npm audit, lint, build, responsive **1/1**, Playwright autenticado **18/18** contra Chrome/API/MySQL desechables y cleanup correcto.
- El run anterior `45008055246` falló en un solo caso (17/18) porque el editor quedó oculto tras agregar parada; se corrigió cambiando al panel “Ver paradas y detalles”. Error/prevención en `ERROR_LOG.md`.
- Continuar auditoría de CRUD y responsive en pantallas no recorridas; mantener abierta la política de promoción a Admin delegado hasta decisión del usuario. Backend NuGet audit volvió a pasar sin paquetes vulnerables. Móvil nativo está pospuesto; SMTP requiere credenciales externas vigentes.


## Siguiente iteración frontend — creación de Driver sin cuenta — 2026-11-22

- Cambios locales en `refactor/route-builder`: `TeamManagement.tsx` admite `userId` opcional y muestra “Sin usuario vinculado”; `FleetContext.addDriver` manda null explícito. E2E tablet crea Driver, confirma 201, GET con `userId=null`, tarjeta y overflow.
- `npm run lint`, `npm run build`, `npx playwright test --list` (18) y `git diff --check` pasaron. Falta integrar el E2E con API/MySQL en Actions del nuevo SHA.
- Nueva auditoría backend: hueco cross-tenant en escrituras de paradas (status/evidence) ahora cubierto en smoke, y CRUD positivo Driver cubierto por HTTP/MySQL; smoke local aprobado, xUnit 64/64. Código/doc backend aún debe validarse en Actions.


## Resultado E2E Driver sin usuario — 2026-11-22

- Actions `45009354112` para Front `6681023` pasó success: Playwright autenticado **18/18**, responsive browser **1/1**, audit/lint/build y cleanup; nuevo Driver se creó desde UI sin usuario, con `userId=null` persistido.
- En progreso local (aún no publicar): Logistics crea/cancela ruta desde UI y Admin prueba el constructor a 320×844; lint/build/discovery 18 pasan. Revisar el diff, publicar y corregir cualquier fallo real de Actions.


## Fallo actual y siguiente acción frontend — 2026-11-22

- Actions `45009790973` falló 3/18 (15 pasaron). Logistics UI timeout 90 s; su cambio de rol dejó Driver inactivo y contaminó el caso Driver siguiente; Equipo usaba un fixture `Foreign Driver QA` que otro caso ya había eliminado. Ver causas y cambios en `ERROR_LOG.md`.
- Fix local pendiente de publicar: finally restaura rol+IsActive, la aserción usa el Driver no vinculado creado por sí mismo, constructor marcado con test.step. Primero ejecutar lint/build/discovery; después publicar y seguir la traza hasta que el E2E pase.
# Continuación — Logistics y opciones de asignación — 2026-11-22

- Branch Front `refactor/route-builder`, HEAD anterior `0967fc4`; cambios locales no publicados en FleetContext, RoutesManagement, E2E y docs.
- La traza de `45009790973` mostró que Logistics llegaba al paso de recursos sin opciones: `/Vehicles` y `/Drivers` son 403 y el constructor dependía de ellos. Front ahora usa `/Routes/assignment-options`; fallo de carga muestra error/reintento.
- E2E Logistics verifica 403 CRUD, 200 opciones mínimas sin documento/teléfono, Driver sin usuario enlazado, selectores, creación/persistencia y cancelación de ruta. También conserva reparación fixture y elimina dependencia entre tests.
- Actions `45011806008`: 16/18; se agregaron stubs del endpoint faltante. Actions `45012288100`: E2E 18/18 + responsive 1/1, pero runner reportó cleanup MySQL fallido: nombre de ruta Logistics no coincidía con prefijo `E2E QA ruta` del SQL. Ahora se alinea el prefijo. Local dirigido de errores 2/2, lint/build/diff-check habían pasado antes del último ajuste; correrlos/validar y publicar, luego revisar cleanup Actions.
- Backend `chore/stabilize-fleet-platform`, HEAD anterior `36e55cb`; endpoint/query/DTO y smoke local sin commit. El DbContext aplica filtro `OwnerUserId`; smoke confirma tenant A, tenant B vacío, User 403 y Logistics 200 sin PII.
- Backend local: Release build 0 warnings/0 errors; xUnit 64/64; `bash -n` y diff-check correctos. Ejecutar el smoke de API/MySQL en Actions, esperar workflow y revisar cleanup. El host correcto es `/home/leonardo/.dotnet/dotnet`, solución `BackEnd_Gps.sln`.
- El error y solución del Actions inicial están en `docs/ERROR_LOG.md` de ambos repos. No declarar esta prueba cerrada antes de CI.
- Pendientes misión global: cobertura CRUD/roles/responsive por ampliar; no modificar política de Admin delegado sin decisión de producto. SMTP requiere credenciales externas; móvil nativo está aplazado por el usuario.

## Estado verificado más reciente — 2026-11-22

- Front `refactor/route-builder`, código `4117342`; Actions `45012698648` pasó audit/lint/build, responsive 1/1 y E2E Chrome/API/MySQL 18/18, cleanup completo. El run valida el endpoint nuevo para Logistics, ruta creada/cancelada desde UI y prefix de cleanup.
- Back `chore/stabilize-fleet-platform`, código `6def8fa`; Actions `45011796536` pasó Release build, xUnit 64/64, smoke HTTP/MySQL tenant/Logistics y concurrencia. Commit documental posterior `5dc2426`.
- Errores de dos runs frontend (stub de endpoint faltante y prefijo de fixture) ya quedaron solucionados y registrados en `docs/ERROR_LOG.md`.
- Continuar misión: auditar siguiente brecha de CRUD/roles/responsive con prueba ejecutable; la política de Admin delegado sigue sin definición. SMTP requiere credenciales externas; app nativa móvil está pospuesta.

## Iteración siguiente en curso — Manager UI y opciones asignables — 2026-11-22

- Nueva auditoría frontend identificó CRUD vehículos de Manager cubierto sólo por API. Se amplió la prueba de matriz en `e2e/fleet-admin.spec.ts`: cuenta Manager inicia navegador, verifica menú (Rutas/Vehículos sí, Equipo no), alta/edición/mantenimiento/baja con persistencia, overflow 320/390/768; branch `refactor/route-builder` sin publicar este lote aún.
- `npm run lint`, `npm run build`, discovery Playwright **18** y diff-check pasan localmente.
- Auditoría backend encontró recursos no asignables en options. Back `648b23f` implementó filtro disponible/asignable; Actions `45014146500` success con Release build, xUnit 65/65, smoke HTTP/MySQL y concurrencia, cleanup sin residuos.
- Política de Admin delegado preguntada vía herramienta (primer intento falló por esquema y quedó registrado en ERROR_LOG); continuar cambios independientes mientras se espera respuesta.
- Actions Front `45013936721` ejecutó 17/18, falló Manager UI al no mostrar Vehículos. Causa raíz: roles API Manager/Logistics colapsados en Front. Fix `7bf1955` separa rol/etiqueta/permisos y lo incluye en altas/cambios.
- Backend run `45014146500` success en SHA `648b23f`: build, xUnit 65/65, smoke HTTP/MySQL de tenant/elegibilidad y concurrencia; cleanup pasó tras borrar Driver antes del User y verificar cero residuos.
- Actions Front `45014430986` success para Front `7bf1955` + Back `648b23f`: backend Release/xUnit 65/65, audit/lint/build, responsive 1/1, E2E Chrome/API/MySQL 18/18 y cleanup.
- Auditor subagente detectó que Manager no podía gestionar Drivers aunque el backend lo autoriza; Users sigue Admin-only. Implementación local agrega permiso `canManageDrivers`, pantalla `DriversManagement`, entrada de menú separada y elimina solicitud automática `/Users/my-team` para Manager/Logistics. E2E Manager amplía CRUD/asignación Driver a 320/390/768 y Logistics queda sin acceso; validar lint/build/E2E y CI.
- Validación local del nuevo lote: lint/build y discovery Playwright 18 tests pasaron; diff-check limpio. E2E integrado API/MySQL de Manager todavía pendiente.
- Revisión independiente adicional halló `maxLength` desalineado (100/30 frente a columnas de 20) y overflow de contenido que el test no detectaba. Front actualiza límites a 20 y mide `main` + tarjeta creada a 320px; Back valida campos requeridos/límites antes del insert con xUnit de límite 20 y 21.
- Verificación local actual: Front lint/build/discovery 18/diff-check pasan; Back Release build 0 warnings/0 errors y xUnit **68/68** (65 anteriores + 3 casos de límites/campos). Falta publicar ambos branches, correr Actions integrada y registrar el resultado.
- Nueva auditoría encontró el formulario duplicado de Admin sin límites y que Manager no volvía a verificar Drivers a 768 px. Corregidos requeridos/maxLength en Equipo y añadidos E2E para atributos y controles/tarjeta en tablet.
- `d79ecb8` Actions `45016638974` success: audit/lint/build, responsive 1/1, E2E 18/18 con API/MySQL/cleanup; el flujo Manager de Vehicle+Driver, rol restringido y responsive de ambas vistas pasa. El Backend `8c28ccb` pasó Actions `45016639356`, Release/xUnit 72/72, smokes HTTP/MySQL y cleanup.
- Continuar siguiente brecha CRUD/roles/responsive; nunca marcar auditoría global completa. SMTP externo sigue pendiente, app nativa móvil aplazada y política Admin delegado sigue sin respuesta.
- Commit `d10e442` publicado; Actions `45017898939` success: lint/build, responsive 1/1 y E2E autenticado Chrome/API/MySQL 18/18 con cleanup. Prueba ahora cambia Manager desde la UI Admin, confirma persistencia, inicia sesión como Manager y mide el diálogo a 320/768 px con roles/campos condicionales.
- Backend `8d19118` evita asignar un vehículo a más de un Driver; test local Release 73/73 y Actions `45017642439` con concurrencia MySQL pasó. Commit docs `816757f`; Actions docs `45017885063` success.
- Dos auditorías independientes confirmaron que la política de delegación del rol Admin está pendiente; pregunta al usuario enviada, no cambiar ese permiso hasta su respuesta. Continuar con otros CRUD/roles/responsive; SMTP externo sin credenciales y app nativa móvil aplazada.
- Dashboard: las tarjetas ya derivan de `/Routes` y `/Vehicles` y los errores muestran `—`; faltaba comprobar cifras en navegador. E2E tablet consulta ambas APIs autenticadas y coteja rutas activas/pendientes/completadas y vehículos disponibles. Un primer build falló TS2552 por no inyectar fixture `request`; corregido y registrado. Lint/build/discovery (18)/diff-check pasan local; publicar y verificar Actions/cleanup.
- Hallazgo adicional: `fechaCreacion` era `PlannedStart` o `new Date()` y la consulta no ordenaba reciente. Backend añade `CreatedAtUtc` nullable/migración y preservación al editar; Front la usa sin inventar fechas y ordena la actividad; E2E valida timestamp/orden. Back Release 73/73 y shell syntax; Front lint/build/discovery 18. Commit/push y Actions integrado pendientes.

## Fecha real de creación de rutas — Front y Back validados — 2026-11-22

- Backend `e31e3cc`: Actions `45020146775` success con migración `CreatedAtUtc`, build, xUnit 73/73, smoke HTTP/MySQL y precisión `datetime(6)`.
- Front `cacb72e`: Actions `45020301540` success con audit/lint/build, responsive 1/1, E2E autenticado Chrome/API/MySQL 18/18 y cleanup. Primera actividad del dashboard y fecha de creación contrastadas contra API real.
- El error de precisión del primer smoke backend `45019828759` está corregido/documentado.
- Hallazgos siguientes en progreso: invalidación de JWT al desactivar/reactivar y mutación del catálogo global de roles. Política de promoción a Admin delegado sigue pendiente de respuesta.

## Corrección de la sección Drivers duplicada — en Actions — 2026-11-22

- Auditoría encontró que Gestión de Equipo mostraba vehículos no disponibles/ocupados y el botón Quitar sin asignación. El formulario duplicado de edición no validaba campos ni límites.
- Front ahora filtra a vehículos disponibles sin otra asignación activa, conserva el vehículo del Driver actual y oculta Quitar cuando no aplica. Edición valida datos trimmeados y comparte límites backend (nombres/apellidos 100, documento/teléfono 20).
- E2E verifica estado del botón/selector, rechazo local de espacios sin request, 400 API para datos inválidos y persistencia intacta. `npm run lint`, `npm run build`, discovery Playwright 18 y diff-check pasan local.
- Front `41c97b9`; Actions integrada `45021100857` en curso con backend `eaeb495`. Revisar resultado y cleanup antes de cerrar.
- La nota antigua de CRUD de perfil se corrigió: esa brecha ya estaba implementada y validada previamente; no queda pendiente.

## Recuperación de carga de Drivers/Vehicles — 2026-11-22

- En `refactor/route-builder`, Gestión de Conductores ahora expone error de `GET /Vehicles` con botón accesible Reintentar vía `retryFleetData`.
- Nuevo E2E devuelve 503 a `/Drivers` y `/Vehicles`, confirma alertas (no estado vacío ante fallo), luego recupera tras reintentar. Resultado local 1/1.
- Lint y build Next 16.4.6 pasaron; Playwright discovery lista 19 pruebas. Falta Actions integrado después de push.
- `ERROR_LOG.md` registra el fallo y solución, además del parche de contexto rechazado durante el E2E del mapa.

### Ajuste del E2E de reintento tras revisión independiente — 2026-11-22

- Auditor Front señaló que sólo se comprobaba un GET adicional, sin verificar opciones utilizables. Se amplió fixture con Driver y Vehicle disponibles; E2E comprueba la opción `ABC-123 · Fleet QA Van` y una sola nueva llamada de Vehicle.
- UI deshabilita retry repetido y muestra “Reintentando…”.
- Un primer test falló al mantener expectativa de lista vacía luego de agregar Driver fixture; se corrigió y E2E enfocado pasó 1/1. Error y remedio documentados.

- Front commit `42b1b4b` quedó validado por Actions `45023625523` (`success`), incluidos build backend y E2E Chrome/API/MySQL integrado. Próxima iteración puede continuar sobre `refactor/route-builder`.
- Front primer lint de límites falló por dos `maxLength` duplicados en form Driver; removidos, repetición `npm run lint && npm run build` y discovery 19 pasó. Este fallo también quedó en ERROR_LOG.

## Revisión de CI y dependencia backend — 2026-11-22

- Front está en refactor/route-builder, HEAD 000d6cb; Actions 45025319275 terminó success: audit/lint/build, responsive 1/1 y E2E Playwright/API/MySQL del flujo autenticado, cleanup del runner. El backend validado en ese run era HEAD 8d3cb32.
- Backend inicia el siguiente lote para hacer durable el correo de recuperación; está en desarrollo local en chore/stabilize-fleet-platform y aún no está en Actions. Después del push, repetir workflow integrado con esa migración antes de actualizar la validación aquí.
- Móvil nativo pospuesto por decisión del usuario; las pruebas responsive web siguen dentro del alcance. La auditoría general sigue abierta.

## Filtros de rutas y pruebas de Manager/Logistics — lote local 2026-11-22

- Auditor Front (solo lectura) recomendó cubrir filtro combinado, GET /Users/my-team prohibido para Manager/Logistics y responsive de Logistics en 320/768 px.
- Se implementó acción visible Limpiar filtros mientras haya cualquier criterio activo; antes sólo estaba disponible cuando ninguna ruta coincidía. E2E crea dos rutas reales y prueba filtro AND/restauración.
- E2E Manager/Logistics usa JWT reales, comprueba HTTP 403 en /Users/my-team sin email expuesto. Logistics prueba selects y diálogo de cancelar ruta a 320/768 con overflow cero.
- Primera corrida completa: los filtros sí filtraban, pero la prueba de restauración falló porque UI ocultaba Limpiar filtros cuando aún quedaban resultados. Solución añadida.
- Segundo intento alcanzó responsive pero el cleanup llamó DELETE Driver (405); controlador sólo ofrece baja lógica PUT status. Fixture pasó a prefijos que cubre cleanup-e2e.sql, cleanup usa baja lógica. Runner path correcto está en Back_GPS/scripts/run-e2e-local.sh.
- Validación: lint/build/discovery 20; runner Chrome/API/MySQL local final **20/20**. Docker DB descartable y DataProtection key dir removidos. Actions Front previo 45027026835 fue success pero usó Front 82941b8 antes de estos tests y por tanto no valida el lote; publicar y revisar Actions nuevo.
- Próximo: push lote Front y documentación backend del Actions 45027017954; verificar nuevo CI integrado Front y backend. Continuar auditoría de brechas pendientes.

## 2026-11-22 — siguiente corte

- Ramas: Front `refactor/route-builder`; Back `chore/stabilize-fleet-platform`, ambas sin cambios en `main`.
- Backend `54c1bba` quedó validado por Actions `45036129217`: CRUD Manager Driver, aislamiento y smokes MySQL; árbol limpio.
- Front añadió E2E de error/reintento del dashboard Logistics: 503 → alerta y `—` → retry → 1 vehículo; verifica no GET `/Vehicles` y responsive a 390 px. Local: test enfocado 1/1, lint/build, discovery 22 y diff-check pasan.
- Actions Front `45036249291` valida HEAD `4e3ddc8` y seguía ejecutando E2E cuando se empezó este cambio. No cubre el caso nuevo porque aún no está publicado; consultar run antes de publicar el nuevo commit.
- Próximo: publicar el caso nuevo después de confirmar resultado del run previo; ejecutar Actions integrado y documentar resultado. Seguir auditando CRUD/roles/responsive; no cerrar misión.
- Límites actuales: móvil nativo diferido por decisión del usuario; SMTP real requiere credenciales actualizadas; la política de Admin delegado necesita decisión de producto.

### Confirmación Front posterior a `a75914f`

- Actions `45036661541` terminó success: audit/lint/build, responsive **1/1**, Playwright autenticado API/MySQL **22/22**, cleanup success. El caso de error/reintento de `Routes/assignment-options` quedó validado integrado.
- Actions `45036249291` también terminó success para `4e3ddc8`, E2E **21/21**. Ambos resultados quedaron registrados.

### Revalidación cruzada de seguridad

- Front Actions `45037486681` pasó: SHA Front `c7b0771`, checkout Backend `0b1c1d1` que incluye código de seguridad `94c3e90`; 22/22 E2E, responsive 1/1, backend build/tests, audit/lint/build y cleanup success.
- Los resultados de los casos sintéticos y de API/MySQL deben seguir diferenciándose: aquí el flujo completo de browser opera contra API/MySQL efímero; el caso de fallo/retry de options es el harness controlado de Playwright.

## Nueva brecha responsive/estados de carga — Gestión de Vehículos

- Hallazgo Front: `VehiclesManagement` no consultaba `loadErrors`, así que GET `/Vehicles` fallido se veía como lista vacía.
- Corregido en código local: alerta + reintento de `retryFleetData`; bloquea el estado vacío hasta recuperación. E2E nuevo en 320×844: 503, error, retry 200 y unidad `QA-VEH-01` visible.
- Local: spec de estados de carga **5/5**, lint/build y discovery **23** pasan. Falta commit/push/Actions del caso.
- La edición se hizo después de Actions `45037929619` (Front docs SHA `2c85d35`); ese run valida el estado previo y no debe tomarse como evidencia del caso nuevo.

## Cierres integrados — estados de carga y key ring

- Front `40bdcea` pasó Actions `45038229853`: **23/23** E2E Chrome/API/MySQL, responsive 1/1, audit/lint/build y cleanup; backend checkout `4090176`. Nuevo error/retry de Gestión de Vehículos a 320 px cubierto.
- Backend `b625c28` pasó Actions `45038446662`: build 0 warnings/0 errors, xUnit **86/86**, aislamiento/roles/flota HTTP/MySQL, smoke concurrente y cleanup. El test nuevo cifra XML key ring y verifica reinicio.
- Próximo: generar nueva validación Front para que su workflow descargue backend `b625c28`; actualizar docs con SHA/resultados. Después seguir auditoría; no completar misión por pendientes CRUD/responsive y decisión de Admin delegado.

### CI actual Front + Backend

- Front Actions `45038687601` pasó con Front `f972e19`, checkout Backend exacto `b625c28`: build/tests Release, xUnit **86/86**, audit, lint, build, responsive **1/1**, E2E Chrome/API/MySQL **23/23**, cleanup success.
- Incluye Gestión de Vehículos con error/reintento en viewport 320; backend con rate limit y email diagnóstico endurecidos y test de key ring cifrado/restart.
- Decisión Admin delegado continúa pendiente; móvil nativo aplazado y SMTP real requiere credenciales. No declarar la misión completa.

## Continuación 2026-11-22 — Carga pendiente en Gestión de Vehículos

- Rama frontend `refactor/route-builder`; backend `chore/stabilize-fleet-platform`.
- `FleetContext` ahora expone `vehiclesLoading`. La vista prioriza el estado accesible de carga sobre error/vacío/resultados.
- E2E bloquea la petición inicial de `/Vehicles`: comprueba carga y ausencia de estado vacío, libera 503, verifica alerta/reintento y fixture `QA-VEH-01`, más viewport 320 px.
- Local: caso enfocado 1/1; spec de carga/error 5/5; `npm run lint`, `npm run build`, Playwright discovery 23 y `git diff --check` pasan. Falta CI del nuevo commit.
- La revisión de seguridad halló dos tareas backend en curso con agente: concurrencia real en test del rate limit y descifrado del key ring en rotación de certificado. Revisar/validar su commit antes de integrar.
- Actions Front `45039219806` para Front `52761b4` seguía en progreso al guardar esta nota; confirmar resultado y documentar.
- No cambiar la concesión de rol Admin delegado hasta recibir respuesta de producto. SMTP actualizado y certificado/volumen de producción son dependencias externas; móvil nativo está pospuesto.

- Actions Front `45039605708` pasó para `36f9bd8`: backend checks, audit/lint/build, responsive 1/1, E2E Chrome/API/MySQL 23/23 y cleanup. Incluye carga pendiente → error → retry en Gestión de Vehículos.

## Continuación Front — carga inicial de rutas — 2026-11-22

- En `refactor/route-builder`, `FleetContext` expone `routesLoading` y Gestión de Rutas muestra “Cargando rutas…” durante GET `/Routes` y al reintentar.
- E2E bloquea la primera respuesta, verifica que no se anuncie “Aún no tienes rutas”, devuelve 503, reintenta, carga `QA-ROUTE-01` y confirma viewport 320 px.
- Local: test enfocado de rutas 1/1; `team-management-load-errors.spec.ts` **6/6**; lint/build, discovery Playwright **24**, diff-check pasan. Actions integrado pendiente.
- Backend `b664b2c` pasó Actions `45040550853` (xUnit 86/86, Release, HTTP/MySQL isolation, concurrencia y cleanup). El Front Actions `45040095930` pasó contra backend previo `d73a4d6`; la próxima corrida con este cambio debe descargar `a18a34f` (docs del código backend `b664b2c`).
- Política Admin delegado sigue pendiente de producto; no modificar sin respuesta. Móvil nativo aplazado; SMTP/infra PFX externos.

## Hallazgo prioritario de seguridad Front — respuestas entre cuentas — 2026-11-22

- Agente QA/security read-only confirmó que respuestas de A podían sobrescribir el state de B tras cambiar `user.id`; listado en vehículos/rutas/opciones y `retryFleetData` afectados. Sin fallo confirmado de autorización backend.
- Fix local en `FleetContext`: generación de sesión por owner, `AbortController` por sesión, wrapper `apiFetchForOwner` para todas las llamadas de flota y validación de identidad/versión antes de aceptar respuesta. Los retries cancelan su flujo y no escriben errores/cargas de sesiones viejas.
- E2E SPA real: solicitud de vehículos de A queda pendiente, logout/login B carga `B-PRIVATE-01`, luego se libera A y se verifica ausencia de `A-PRIVATE-01`. Test enfocado 1/1; spec 7/7; lint/build y discovery 25 pasan local.
- Primera prueba usó selector ambiguo para contraseña; corregido a `getByRole("textbox")`. ESLint reportó dependencias hook omitida/sobrante; corregidas. Ambos quedan en ERROR_LOG.
- Última Action Front `45040955335` pasó código previo `98f7c67` con Backend `a18a34f`: E2E 24/24, responsive/audit/lint/build. El fix de aislamiento está pendiente de commit, push y Action nuevo.
- Intento de subagente rebotó por límite de threads; se cerró al agente Backend completado y la auditoría se lanzó correctamente.

## Continuación — carrera de refresh entre sesiones — 2026-11-22

- Front branch `refactor/route-builder`. `AuthContext` estaba expuesto a respuestas tardías de refresh/API de A después de iniciar sesión como B; podía reemplazar tokens o limpiar la sesión B.
- Cambio local no publicado: generación monotónica de sesión protege restore/login/register/refresh/apiFetch/logout; refresh además comprueba el refresh token capturado. Logout invalida y limpia localmente de inmediato y envía el token de la sesión que cerró. `AbortError` esperado se silencia; verificación de sesión periódica sigue la identidad del usuario.
- E2E nuevo deja pendiente refresh A, hace logout/login B, y libera respuesta de A. Resultado: caso 1/1; `team-management-load-errors.spec.ts` 8/8; lint/build correctos; Playwright discovery 26; `git diff --check` correcto.
- Errores iniciales documentados en `ERROR_LOG.md`: primer E2E activó overlay Next por log de AbortError esperado e interceptó logout; repetir después de suprimir el log pasó. Lint y Playwright simultáneos chocaron con `test-results` recreado; los checks se secuenciaron y pasaron.
- Commit Front `c6441b6` publicado en `refactor/route-builder`; Actions `45042907944` pasó en 3m48s: backend Release, audit/lint/build, responsive 1/1, E2E API/MySQL 26/26 y cleanup.
- Próximo paso: continuar auditoría por CRUD/roles/responsive reales; el objetivo integral permanece abierto. Mantener cambios sólo en las ramas de trabajo y actualizar evidencia tras cada bloque.
- Dependencias sin decisión: política de Admin delegado; SMTP actual; provisioning de key ring/PFX en producción. Nativo móvil diferido por el usuario.

## Continuación — Mi Ruta responsive tablet — 2026-11-22

- Auditoría independiente read-only halló que el flujo Driver (GPS, parada y evidencia) estaba probado en 320×844, sin recorrido equivalente a 768×1024. Dashboard, rutas, vehículos, equipo e historial ya tienen varias comprobaciones 320/768.
- E2E ampliado en `e2e/fleet-admin.spec.ts`: valida Mi Ruta y botón iniciar en 768 px; comprueba overflow del documento y `<main>`; abre evidencia a 320 px, cambia el viewport a 768 y valida controles/encuadre; vuelve a 320 para guardar la nota; valida estado vacío final a 768.
- Lint/build/discovery 26 pasan. El test enfocado local se omitió porque no hay credenciales/fixtures Driver QA y la ejecución requiere mutaciones, documentado en `ERROR_LOG.md`; se confía en runner integrado efímero sólo después de pasar Actions del nuevo SHA.
- La auditoría encontró y corrigió el conteo obsoleto “21 pruebas” en el encabezado de `PROJECT_STATUS.md` (suite actual 26). También registró una búsqueda `rg` con rutas/capitalización equivocadas; resuelta usando `src/Components/fleet`.
- Action `45043342482` pasó en docs SHA `9793aa5` (código `c6441b6`): 26/26 E2E y responsive 1/1, pero antecede a este cambio y no lo valida.
- Próximo: diff-check, commit/push de la prueba/documentación, seguir Actions exacto; si falla, corregir y repetir. Después continuar con áreas CRUD/responsive restantes.


## Continuación — cobertura tablet Driver y consistencia de rutas — 2026-11-22

- Front `0dd5099` cubre Mi Ruta a 320/768 px; Actions `45043898907` pasó E2E 26/26, responsive 1/1, backend Release, audit/lint/build y cleanup. El bypass local de fixture Driver quedó compensado por CI con API/MySQL real descartable.
- Auditoría backend encontró que se podía iniciar una ruta de Driver cuyo usuario vinculado estaba inactivo, dejando vehículo `OnRoute`; también se podía desactivar la cuenta durante ruta `InProgress`. Backend `190f284` bloquea ambas operaciones bajo locks transaccionales y comprueba que no haya mutaciones indebidas. Release xUnit 88/88 y Actions `45045070288` pasó smoke tenant/flota, concurrencia y cleanup.
- Docs backend `e24e371` tiene Actions `45045329470` en curso al último chequeo. Debe completarse además una corrida Front integrada con el backend `190f284` (rama backend se resuelve al HEAD publicado).
- Documentación del hallazgo y prevención en Front `ERROR_LOG.md`; la cuenta de prueba local se dejó intacta. Misión abierta: seguir cubriendo CRUD, permisos/roles y responsive; móvil nativo aplazado; SMTP y aprovisionamiento productivo externos.


## Continuación — mapa y filtros probados por rol — 2026-11-22

- Front ya distingue el filtro de estado de los filtros de vehículo/Driver usando una ruta Pending y otra Cancelled; valida sólo segunda al cambiar el estado y vuelve a ambas al limpiar. Mientras filtra verifica documento/main en 320/768. Logistics mide editor/mapa en esos anchos y su lista después de guardar. `npm run lint`, `npm run build`, discovery Playwright **26** pasan; falta Actions con API/MySQL efímero.
- Acción Front `45045460102` pasó la SHA anterior `a761674` con 26/26 y cleanup; no cubre las nuevas aserciones.
- Fix backend separado mantiene Maintenance al cancelar ruta Pending; backend Release xUnit **89/89**, test focal 1/1, `bash -n` y diff-check. Smoke MySQL extendido pendiente de CI.


## Continuación — E2E filtros/Logistics validado — 2026-11-22

- Front `d05dcf8` pasó Actions `45046312974`: audit/lint/build, responsive browser **1/1**, Playwright autenticado API/MySQL **26/26**, cleanup. Incluye ruta Pending/Cancelled para comprobar filtro de estado y mapa/lista Logistics a 320/768.
- Nueva corrida será necesaria al cruzar este frontend con el siguiente backend SHA de seguridad y regresión de estado.


## Integración pendiente contra backend a207c08 — 2026-11-22

- Front Action `45046312974` validó `d05dcf8` con E2E 26/26, responsive 1/1, backend Release, audit/lint/build y cleanup.
- Backend `a207c08` pasó Action `45047226328`: xUnit **91/91**, smoke HTTP/MySQL, concurrencia y cleanup. Validó la fixture maintenance aislada. El siguiente lote backend agrega supresión de reset-email obsoleto (test focal 3/3; full suite local 92/92, build clean) y requiere nueva CI.
- Crear/pushear documentación Front para disparar E2E integrado contra `a207c08`; luego, una vez integrado el siguiente worker backend, repetir Front contra su SHA actual. Si falla, usar logs del step exacto, corregir y volver a ejecutar.

## Continuación — evidencia fotográfica y responsive CRUD — 2026-11-22

- Rama refactor/route-builder; no tocar main.
- Auditoría QA read-only encontró cuatro huecos: foto en parada/historial, ciclo Driver a 320 px, cambio de contraseña y registro a 320/768 px.
- Playwright ampliado en e2e/fleet-admin.spec.ts; intentos fallidos y viewport accidental documentados en ERROR_LOG.md.
- npm run lint, npm run build, discovery 33 y diff-check pasaron. Falta E2E real API/MySQL y Actions del nuevo SHA.
- Auditoría backend encontró también validación de cuenta Driver bajo locks y falta de pruebas HTTP activate/reset; revisar rama chore/stabilize-fleet-platform.
- No cerrar misión; seguir con cobertura restante. Admin delegado sigue pendiente de decisión; SMTP/infra productiva externas; móvil nativo aplazado.

## Continuación — fixtures operativos y ancho de Conductores — 2026-11-22

- Action Front `45060482928` falló 3/33: dos casos competían por ruta activa con el mismo Driver y uno encontró formulario de 413 px a 320 px. Diagnóstico y prevención documentados en `docs/ERROR_LOG.md`.
- Fix local: fixture Driver independiente para Mi Ruta/foto; tenant isolation crea su Driver propio; `DriversManagement` permite encogimiento con `min-w-0`. Backend `scripts/run-e2e-local.sh` crea/expone el fixture Driver operativo para CI. El runner extrae IDs usando Node, sin agregar dependencia jq.
- Front local lint/build/discovery 33/diff-check pasan. Backend runner `bash -n` y diff-check pasan; backend Release xUnit 100/100 y Action `45060714338` pasó antes del cambio de fixture.
- Pendiente inmediato: commit/push de ambos branches y seguir Actions integrados; corregir y repetir cualquier fallo. Misión sigue abierta, con cobertura CRUD/roles/responsive por completar y límites externos ya registrados.

## Continuación — evidencia fotográfica y CRUD móvil en Equipo — 2026-11-22

- Front Action `45061522878` pasó audit/lint/build/responsive pero terminó Playwright **31/33**. Trazas descargadas y revisadas: el test no cambiaba el diálogo de Nota a Foto, se agotaba a 30 s y el retry encontraba ruta Pending de ese intento (409); el otro caso midió formulario de edición Driver de Equipo en 413 px a 320.
- Correcciones locales no publicadas: click explícito “Foto” en E2E; `min-w-0` en main/layout/Equipo/chofer y `w-full min-w-0` en form. `DriversManagement.tsx` también conserva su fix del caso móvil.
- Backend `3f87af8` validado por Action `45061524504` (build/tests Release, tenant HTTP/MySQL, concurrencia/cleanup); documentación nueva `000dabc` registra evidencia. Branch frontend todavía requiere lint/build/discovery tras este parche y una Action nueva.
- Sigue misión: no cerrar hasta validar los fixes y completar restantes CRUD/roles/responsive; móvil nativo aplazado, decisión de política Admin delegado pendiente, SMTP/infra productiva externos.

## Continuación — mapa en 320 px e historial de evidencia real — 2026-11-22

- Front Action `45062280254` falló 2/33 (31 pasaron): Mapa medía `main.scrollWidth=363` con viewport 320; el Historial no mostraba recuento de foto guardada porque leía `route.evidencias`, mientras la API devuelve evidencia en `points[].evidence`.
- Frontend commit local: Mapa ahora limita anchos intrínsecos con `min-w-0`; Historial aplana evidencia real de cada parada y el E2E mide diálogo/foto/descrición Admin a 768 px. Lint, build, discovery de 33 pruebas y diff-check pasan; Action del nuevo SHA pendiente.
- Backend commit `adcc286` publicado: validación de campos Vehicle y traducción de colisiones de placa CREATE/UPDATE a 409. Release local 103/103, build 0 warnings/0 errors; Action `45063399400` está en curso para smoke HTTP/MySQL.
- Auditoría frontend read-only: pendientes para el siguiente lote son negativos de cambio rol/baja de Driver con ruta activa; cerrar ruta con parada sin evidencia; duplicate-email UI contra API real; historial Admin tablet. Consultar `docs/ERROR_LOG.md` y E2E actuales antes de implementarlos.
- Las dos ramas permanecen separadas de `main`; no cerrar misión. SMTP/producción y app nativa delimitados, política Admin delegado sigue siendo decisión de producto pendiente.

- Nueva corrección del lote: Mapa usa `min-w-0` en flex ancestors y paneles; Historial construye evidencia desde `RouteApiDto.points[].evidence` antes de pintar resumen/detalle. E2E mide diálogo Admin a 768×1024. Validación local final: lint/build, discovery 33, diff-check.

- Action `45063487802` volvió a fallar 2/33. Trace confirmó `main.scrollWidth=363` a viewport 320; añadido `w-full max-w-full overflow-hidden` al root y layout interno MapView. Historial mostraba 3 evidencias reales (dos notas + una foto), así que la aserción “1 evidencia” se actualizó a 3; conserva detalle de foto y descripción.
- Action Front `45064475585` aprobó 33/33 E2E autenticados, incluidos responsive mapa a 320 px e Historial/foto/descrición Admin a 768 px. Run de backend usado por esa integración estaba en `1534828`; backend login anti-enumeración `30bcb2f` tiene su Action propia en curso y requiere nueva integración Front luego de terminar.

- Registro público es neutral: `register` no persiste tokens; el formulario muestra el mensaje común y navega a Login. El E2E compara las respuestas de alta nueva/duplicada y autentica el usuario creado. Falta Action integrada con cambio frontend/backend actual.
- La Action Front `45065014129` aprobó 33/33 y responsive check con backend `30bcb2f`, pero precede al cambio de registro neutral; ejecutar nuevo Action tras publicar ambos repos.
- Action Front `45065745273` pasó **33/33** con registro neutral del backend `825bbed` y valida registro/email duplicado/login. No contiene el piso temporal añadido luego en `52d7e46`; nueva integración pendiente.
# Continuación — UX de asignación Admin — 2026-11-23

- Branch Front `refactor/route-builder`; branch Backend `chore/stabilize-fleet-platform`; mantener `main` intacta.
- El backend reservó crear/promover Admin a la cuenta raíz (decisión del usuario), validado por HTTP/MySQL y Action backend `45088129188`.
- La UI de Gestión de Equipo oculta “Gerente” (rol API Admin) a cuentas delegadas. E2E reveló clasificación falsa del root al inferir desde JWT; Backend ahora envía `isRootAccount` en `/Auth/me` y Front lo consume. El backend sigue autorizando la operación.
- E2E autenticado del root comprueba que “Gerente” sí aparece. Revisión independiente pidió cubrir el lado negativo; nuevo test delegado con `owner_id` distinto verifica que no aparece al crear ni promover.
- La primera corrida delegada expiró porque buscaba hamburger en desktop; navega ahora por barra lateral. Caso enfocado pasó 1/1 y el spec completo de carga/equipo pasó 10/10.
- Backend local Release 113/113 y build 0/0 warnings; bash syntax/diff-check pasan. Front local lint/build/discovery (40) y spec de gestión 10/10 pasan. `ERROR_LOG.md` registra hallazgos y correcciones.
- Action `45088879212` valida el commit `5784b36` y continúa en ejecución, antes del E2E delegado nuevo. Publicar el SHA actual y validar la suite integrada.
- Continuar auditoría de roles/CRUD y responsive. Misión abierta; móvil nativo aplazado.
- La Action `45088879212` terminó 38/39: root autenticado no vio “Gerente”. Backend añadió `isRootAccount` a `/Auth/me` y Front lo consume; smoke/API y Action integrada del fix quedan pendientes.

## Continuación — diagnosticar locator de Admin raíz — 2026-11-23

- Estado más reciente: Front `e262180`, backend `be84496` de funcionalidad (el branch backend avanzó después con documentación `df88238`). Branches de trabajo separadas de `main`.
- Action Front `45090273209` terminó **39/40**; responsive 1/1, audit, lint y build aprobaron. Descargué e inspeccioné las dos trazas Playwright del fallo: el diálogo sí renderizaba el botón; su nombre accesible real incluía descripción (“Gerente Administra equipos y rutas”), y el test lo buscaba con `exact: true`.
- Fix E2E local: usa `/^Gerente\\b/` y afirma `/Auth/me` con `{ isRootAccount: true, roles: ["Admin"] }` antes de comprobar UI. No cambiar política ni lógica de permisos por ese fallo del locator.
- Backend Action `45090274537`: Release build, xUnit 113/113, smoke HTTP/MySQL tenant/roles y concurrencia pasaron con cleanup.
- Documentación Front/Backend actualizada para decisión raíz; `ERROR_LOG.md` registra hipótesis incorrecta inicial y causa confirmada por trace.
- Validación local tras el fix: lint y build pasaron; Playwright discovery **40 pruebas**; `team-management-load-errors.spec.ts` **10/10**; `git diff --check` limpio. Suite E2E integrada del nuevo SHA pendiente; registrar su Action en `PROJECT_STATUS.md`, `TESTING.md` y este handoff. Luego continuar criterios funcionales; misión sigue abierta.

## Continuación — revisión completa de ruta y búsquedas geográficas — 2026-11-23

- Action Front `45091340306` terminó **success** para `9d84562`: backend Release/xUnit, audit, lint/build, responsive browser **1/1**, E2E integrado **40/40**, cleanup correcto. Confirma `isRootAccount` root y UI de rol Gerente con nombre accesible descriptivo.
- Auditoría Front read-only detectó que el paso final omitía la secuencia completa de paradas y que búsquedas Nominatim antiguas podían quedar asociadas a otro punto. Cambios locales en `RoutesManagement.tsx`: lista ordenada de origen/paradas/destino con nombre, tipo de operación y coordenadas; AbortController, contador de secuencia y ref de objetivo para cancelar/descartar respuestas obsoletas.
- Cambios locales del E2E tablet de ruta: selección desde búsqueda Nominatim, estados vacío/error, respuesta retrasada tras cambiar objetivo, lista de revisión en orden, primera creación forzada a HTTP 503 y segundo intento real exitoso. Debe validar que el formulario conserva datos y persistencia genera sólo la ruta reintentada.
- Pendiente: último lint/build, revisar selector y aserciones Playwright, ejecutar prueba con API/MySQL (CI al publicar), corregir errores y repetir Action. Actualizar error/status/testing con resultado.
- Auditoría Backend read-only: Admin raíz y aislamiento tenant están cubiertos (Action `45090274537`, 113/113 xUnit + smoke). Decisión de producto pendiente para permitir o prohibir rutas sin operación logística; usuario ya consultado, no modificar backend hasta respuesta. Añadir cobertura de ciclo con múltiples paradas hasta cierre y verificar continuidad de Data Protection para despliegue.
- No declarar misión completa; continuar con seguridad/CRUD/responsive restantes y mantener `main` intacta.

## Estado al 2026-11-23 — constructor validado, smoke multi-parada preparado

- Ramas activas: Front `refactor/route-builder`, Backend `chore/stabilize-fleet-platform`; no modificar `main`.
- Front commit `992053d` y Action `45092540906` pasaron: E2E 40/40, responsive 1/1, backend Release/xUnit, audit/lint/build y cleanup. Commit docs-only pendiente en el árbol.
- Backend `scripts/smoke-tenant-http.sh` ahora prueba cinco puntos (origen, recogida, entrega, recogida+entrega, destino), evidencia/estado para cada operación, GPS y cierre. API Release build local pasó; smoke HTTP/MySQL desechables exit 0 y fixtures limpiados. xUnit Release local en ejecución; luego documentar evidencia y publicar.
- Incidencias de ejecución: el `dotnet` del PATH falla porque `/usr/lib64/dotnet/host/fxr` no contiene SDK; usar `/home/leonardo/.dotnet/dotnet`. Iniciar API como sesión foreground persistente: `nohup` dentro de un shell efímero murió antes del smoke. Documentado en `ERROR_LOG.md`.
- Luego revisar/pushear Front docs y Backend smoke/docs, consultar Actions nuevos y reparar fallos. Política de ruta sin operación logística sigue pendiente de respuesta; no alterar backend hasta entonces.
- Decisión confirmada: sólo la cuenta raíz crea/promueve Admin. La app nativa queda aplazada; web responsive sigue en alcance. SMTP real y Data Protection/infra productiva siguen limitaciones externas. Misión global abierta.

## Continuación 2026-11-23 — Historial multi-operación y refresco protegido

- Front tiene cambios locales en `RouteHistory.tsx`, `fleetApi.ts` y `e2e/team-management-load-errors.spec.ts`: detalle por parada con tipo/estado, carga/vacío mutuamente excluyentes e in-flight guard para polling/focus.
- Local: lint/build correctos y E2E enfocado **2/2**. El primer intento falló por tipos `string | number` y por E2E que mantenía sólo una solicitud (dashboard) detenida; el segundo mostró navegación móvil como desktop en el test de foco. Causa/solución/previsión están en `ERROR_LOG.md`.
- Front Action `45093518006` pasó antes de este cambio: 40/40 E2E y responsive 1/1 para `2abbf9e`. La nueva Action se ejecutará al publicar el arreglo del Historial.
- Backend `e678e6c` tiene Action `45093565790` success: Release, 113/113, tenant HTTP/MySQL, concurrencia y cleanup. Smoke multi-parada detallado pasó localmente; el workflow publicado no ejercita esa ruta Logistics extendida, revisar si se requiere incluirla en Action.
- Auditoría read-only añadió hallazgos de seguridad: contraseña mínima 6 caracteres y límite global de 60/min por IP sin política específica de login. Endurecer de forma coherente y añadir pruebas; no afirmar resuelto.
- Decisión pendiente del usuario: permitir rutas de traslado sin operaciones. Admin sólo por cuenta raíz está confirmado. Web responsive sí, nativo móvil después. No cerrar misión global.

## Continuación — decisión de claves y fix del test de foco

- `/Routes/assignment-options` debe responder con vehicles/drivers vacíos en la prueba de foco. Sin mock, la llamada llegó al API real con token sintético, devolvió 401, intentó refresh 401 y AuthContext navegó a Login; locator hamburger acabó esperando un botón que desapareció. Fix local añade mock y E2E Historial vuelve a pasar 2/2. La causa y prevención están en ERROR_LOG.
- Mínimo nuevo de contraseña subió a 12 en todos los formularios; no afecta login de cuentas existentes. No perder esta política al cambiar frontend/API.

## Estado vigente — política de traslado y contraseñas

- Confirmado por el usuario: permitir rutas sólo de traslado; contraseñas nuevas de mínimo 12 caracteres; limitación de login por IP sin bloqueo de cuentas.
- Front refleja 12 caracteres en registro, cambio de perfil, activación y restablecimiento. E2E comprueba `minlength` en registro.
- Validación local actual: `npm run lint`, `npm run build`, Historial enfocado **2/2**, Playwright discovery **41 tests**, `git diff --check` correcto.
- Front Action `45094647703` quedó 40/41 por no simular `/Routes/assignment-options`; mock corregido y Historial 2/2 pasó. Publicar Front y Backend y verificar Actions integradas.

## Resultados integrados — cierre de fase

- Front `a15dffb` Action `45096403768`: **41/41 E2E**, responsive **1/1**, audit/lint/build y backend Release/xUnit correctos; API/MySQL desechables y cleanup.
- Backend `33e2499` Action `45096399172`: build Release, **120/120 xUnit**, aislamiento tenant y concurrencia HTTP/MySQL correctos; cleanup. `1e4a8e1` documentó la evidencia.
- Decisiones aplicadas: traslado sin paradas permitido; claves nuevas de 12 caracteres; login 10/minuto por IP sin bloqueo por cuenta.
- La misión general continúa abierta para criterios de CRUD/responsive restantes e infraestructura externa.

## Lote actual — disponibilidad y operaciones seguras

- Front `refactor/route-builder`: disponibilidad de conductor en constructor, confirmación de cambios de rol/estado, altura/scroll de diálogos, E2E de traslado sin paradas y pruebas de confirmación; local lint/build y discovery 43 pasan. No publicar como terminado hasta Actions.
- Backend `chore/stabilize-fleet-platform`: rate limit recuperación 5/10 min/IP; token 256 bits; TTL 60 min por defecto (1–1440 validado); HTTPS obligatorio en URLs de email productivas. xUnit Release completo 133/133, build 0 warnings/errores, shell check y diff check pasan. Smoke HTTP/MySQL real pendiente de Actions.
- Errores registrados: fixture con aridad incorrecta en `RouteE.Create` (corregido, test pasó); E2E de diálogo falló inicialmente al usar menú móvil a baja altura (flujo ajustado y 1/1 pasó).
- Siguiente: revisar estado/diffs, commit y push de ambas ramas, observar Actions completas; corregir fallos y documentar IDs/resultados. No tocar `main`. SMTP, rate limiter distribuido, proxy confiable y Data Protection persistente quedan como limitaciones externas/productivas; misión global continúa abierta.

## Seguimiento de Action Front fallida

- Action `45099148002` (commit previo `d61b7a8`) falló en 5 E2E; backend, lint/build y responsive pasaron. Causas/correcciones detalladas en `ERROR_LOG.md`.
- Fix local: `RoutesManagement` muestra conductores ocupados deshabilitados (antes se filtraban), fixture Playwright intercepta endpoint real; test de traslado no reabre mapa ya activo; cuatro mutaciones antiguas de equipo ahora confirman en diálogo.
- Verificación local después del fix: lint/build OK, confirmaciones 1/1, discovery 43, diff-check OK. Pendiente push y nueva Action con API/MySQL para validar los cinco escenarios.

- Action `45100344654` ejecutó **42/43 E2E**; quedó una confirmación de desactivar User vinculado a Driver en `fleet-admin.spec.ts` (línea cerca de 3820), añadida localmente. Cleanup del runner indicó error SQL al salir del test fallido; el script suprime stderr, se debe verificar en la Action posterior y hacer visible el diagnóstico si persiste.

- Action `45101175529`: 42/43; encontró la segunda omisión de confirmación en desactivación del User regular del test de ciclo Driver. Confirmación añadida. Limpieza SQL falla cuando el test aborta; comprobar con suite completa verde y diagnosticar si persiste.

- Action `45101809749` 42/43: detectó última mutación no confirmada, reactivación del User regular en el E2E de ciclo. Añadido click `Sí, activar cuenta`; nuevo run pendiente.

## E2E verdes, cleanup aún no verificado

- Front Action `45102498423`: los 43 E2E pasaron y responsive 1/1, pero el runner informó fallo al limpiar MySQL desechable.
- Backend commit `2ff5560` registra salida del error MySQL en cleanup sin exponer credenciales para diagnosticarlo en el próximo run.
- Siguiente paso: correr Front con backend branch actualizado; revisar si cleanup pasa o leer error mysql y corregir SQL/fixture. No declarar este lote terminado antes de limpiar fixtures.


- Commit Backend `7ea14a6` corrige FK 1451 en cleanup de Driver QA al eliminar primero RoutePositions/Routes referenciadas por `DocumentNumber E2EQA%`. Front debe correr de nuevo para verificar 43 E2E + cleanup success.


## Limpieza validada y lote actual cerrado

- Backend `7ea14a6`: Action `45103732510` success (Release, xUnit, HTTP/MySQL tenant y concurrencia).
- Front `85da39c`: Action `45103761122` success: backend Release/tests, audit, lint/build, responsive 1/1, Playwright API/MySQL **43/43**, cleanup success.
- Root cause del cleanup: rutas asignadas a Driver QA no coincidían con prefijo de nombre; SQL ahora limpia RoutePositions/Routes por relación `Driver.DocumentNumber E2EQA%` antes de Drivers.
- Las dos ramas quedaron sin cambios pendientes; no se tocó main. La misión amplia sigue abierta; consultar PROJECT_STATUS para los siguientes riesgos/producto.

## Continuidad — mapa OSRM y Actions integradas

- Front branch `refactor/route-builder`: `e2e/manager-map.spec.ts` reemplaza el mock de OSRM 503 por geometría exitosa determinista de tres puntos y comprueba al menos dos segmentos del SVG, verificando que el punto intermedio llegó a la ruta dibujada. Lint/build/discovery 51/diff-check pasan local. Publicar commit y validar Action.
- Action Front `45119404897` (HEAD anterior `43d20fb`) sigue en progreso y valida el E2E real de Admin delegado; revisar conclusión.
- Backend Action `45119396803` (HEAD `341161d`) sigue en progreso desde el repo Back_GPS; verificar antes de declarar cerrado el lote.
- Después de publicar el cambio OSRM, verificar que Actions ejecutan el caso real de mapa, Admin delegado, backend Release/xUnit, API/MySQL y cleanup; actualizar los documentos con SHA y evidencia. La misión integral permanece abierta.

## Hallazgo de Action y corrección pendiente de validación

- Action `45119404897` falló sólo en `company-admin.spec.ts`: el E2E de Admin delegado buscaba `Abrir menú` a 1280 px, donde la navegación es la barra lateral desktop. API 403, persistencia de rol y 50 pruebas adicionales pasaron.
- Fix local en `company-admin.spec.ts`: viewport 390×844 antes del login para habilitar el menú móvil. Causa/solución/previsión en `ERROR_LOG.md`. Ejecutar lint/build/discovery, publicar y comprobar Action completa + cleanup.
- Action Front `45119664116` para el E2E OSRM está en progreso; recoger el resultado antes de terminar.

## Ajustes OSRM/retry pendientes de Action

- Action `45119664116`: 49/51; Admin delegado falló por menú en desktop (corregido en `3c7d738`), y el caso de mapa apuntó al primer SVG del overlay (otra ruta), además de chocar con placa persistida tras delete en retry.
- Cambios locales sin publicar aún: E2E selecciona la ruta real y localiza su polilínea por `stroke-width="6"` antes de exigir segmentos OSRM y genera placa/nombre únicos por intento. Ejecutar lint/build, diff-check, publicar y validar que la Action cubra E2E Admin, mapa, persistencia y cleanup.

- Ajuste de viewport anterior quedó en el bloque simulado equivocado; esto produjo dos fallos adicionales: el simulado necesita sidebar desktop y el real necesita botón móvil. Corregidos ambos viewports por separado; documentado en `ERROR_LOG.md`. La Action del HEAD más nuevo debe confirmarlo.

- El selector del path SVG siguió fallando en Actions porque Leaflet simplifica geometrías; retirar esa comprobación. Cambio local: mostrar estado explícito de éxito “Trayecto por carretera calculado” cuando `geometryState` es road; el E2E espera ese estado después de OSRM mock válido; fallback mantiene su aviso estimado. Causa registrada en `ERROR_LOG.md`. Ejecutar lint/build, publicar y validar Action integrada.

- Action `45121718866` encontró 3 problemas: Admin delegado tiene `gerente` visible pero deshabilitado (assertar disabled), status OSRM es hermano de `.leaflet-container` (locator de página), E2E Driver consultaba API antes de completar POST (esperar 201). Detalle en `ERROR_LOG.md`; correcciones locales publicadas próximamente. La nueva Action debe verificar el suite entero y cleanup.

- Action `45122569784` pasó backend tests, audit/lint/build, responsive y **50/51 E2E**; cleanup incluido. El único fallo fue selector `getByRole("status")` ambiguo entre indicador de OSRM y tracking sin posiciones. Corregido a texto exacto del estado carretera. Publicar y validar Action completa.

## Cierre de lote Front — 2026-11-23

- Front branch `refactor/route-builder`, último commit de código validado `f0acce7`; Action [`45123444413`](https://github.com/Paul1578/Front_gpsR/actions/runs/45123444413) success.
- Ejecutó backend Release/xUnit, dependency audit, lint/build, responsive browser **1/1**, Playwright E2E real API/MySQL **51/51** en 3.6 min y teardown/cleanup de contenedores; no hubo skips de los escenarios Playwright y trace step fue skip al no haber fallos.
- Cambios clave: flujo real root-only Admin verificado UI/API, viewport correcto en dos E2E distintos, roles y opción deshabilitada conforme al contrato, sincronización Driver POST/GET, estado visible de geometría vial OSRM frente al fallback estimado, identidad de fixtures para retries. Errores y prevención están en `ERROR_LOG.md`.
- HEAD actual tras documentación debe cotejarse con `git rev-parse`; rama Backend `chore/stabilize-fleet-platform` sin cambios en este lote, commit `341161d`, Action `45119396803` verde. `main` no se modificó.
- Continuar la misión desde los pendientes de `PROJECT_STATUS.md`; no declarar terminado el producto global.

- El HEAD documental final `1d7b922` fue validado de nuevo por Action [`45124271067`](https://github.com/Paul1578/Front_gpsR/actions/runs/45124271067): success, 51/51, responsive 1/1, backend Release/xUnit y cleanup correcto.

## Continuación — validación integrada de permisos y rutas — 2026-11-23

- Front Action [45153408262](https://github.com/Paul1578/Front_gpsR/actions/runs/45153408262) terminó success en `d002a93`: backend Release/xUnit 139/139, audit, lint/build, responsive 1/1, E2E API/MySQL 51/51 y teardown.
- Comprobó aislamiento por tenant en cambios de User, promoción root-only con confirmación/cancelación y persistencia, baja lógica de rutas, geometría OSRM y responsive 320/768/desktop.
- Backend docs HEAD `fa4a3a3` pasó los Actions push/PR `45154037990` y `45154028662`. Se actualizará esta sincronización en el próximo commit Front; continuar misión global abierta desde los pendientes actuales.

## Siguiente brecha CRUD — editar paradas — 2026-11-23

- Auditoría Front independiente sobre `d03f3eb` halló que no se probaba cambiar contenido/orden de paradas de una ruta existente. Se amplió `e2e/fleet-admin.spec.ts`: cambia Recogida→Entrega y mueve la otra parada al primer lugar; GET verifica orden y operaciones tras PUT en tablet y móvil.
- Lint/build/discovery 51/diff-check pasan local. No hay credenciales QA en el shell; validar en Action autenticada con API/MySQL descartables.
- El E2E queda sin commit hasta que Action `45154834106` (documentación anterior) termine; después publicar y corregir cualquier fallo hasta verde.

## Resultado E2E de edición de paradas — 2026-11-23

- Código `ee49ce8` validado por Action [45155814687](https://github.com/Paul1578/Front_gpsR/actions/runs/45155814687): 51/51 Playwright API/MySQL, responsive 1/1, Backend Release/xUnit, audit/lint/build y cleanup exitosos.
- La prueba edita una ruta multi-parada, cambia operación pickup→delivery, reordena paradas y verifica nombres/operaciones completos por GET; repite guardado en móvil. No quedan fallos conocidos en este cambio.
- Action [45154834106](https://github.com/Paul1578/Front_gpsR/actions/runs/45154834106) validó el HEAD documental anterior `d03f3eb` con 51/51 y cleanup.
- Siguiente trabajo: continuar la matriz pendiente de CRUD/roles/responsive de `PROJECT_STATUS.md`; no cerrar la misión integral.

## Siguiente cobertura de roles — root promotion en Equipo — 2026-11-23

- E2E de `Gestión de Equipo` ampliado: promueve un miembro a Admin desde la UI raíz, confirma el PUT/`roleName=Admin`, relee el equipo, restaura Logistics y vuelve a comprobar persistencia.
- Lint/build y discovery 51 pasan local. Pendiente publicar tras cerrar Action documental `45157412228` y confirmar en API/MySQL/cleanup.

## Validación anterior y nueva cobertura de promoción — 2026-11-23

- Action [45157412228](https://github.com/Paul1578/Front_gpsR/actions/runs/45157412228) validó el HEAD `3a131a8`: 51/51 E2E, responsive 1/1, backend Release/xUnit, audit/lint/build y cleanup.
- La edición UI de paradas multi-entrega validó el commit `ee49ce8`, Action [45155814687](https://github.com/Paul1578/Front_gpsR/actions/runs/45155814687), con los mismos gates en verde.
- Nuevo test root-only desde Gestión de Equipo añadido después; local lint/build/discovery pasan. Falta su Action autenticada de API/MySQL tras publicar.

## Promoción root-only desde Equipo — validada — 2026-11-23

- Front `29e320b`, Action [45158497214](https://github.com/Paul1578/Front_gpsR/actions/runs/45158497214): success, 51/51 E2E, responsive 1/1, Backend Release/xUnit, audit/lint/build y cleanup.
- `Gestión de Equipo` probó promoción Manager→Admin usando root, validó PUT/roleName y lectura persistida, y restauró Logistics. Esta cobertura complementa la promoción existente de la vista heredada.
- Próximo: continuar la auditoría de criterios CRUD/responsive restantes; misión general no está cerrada.

## HEAD documental de promoción root validado — 2026-11-23

- Action Front [45159425207](https://github.com/Paul1578/Front_gpsR/actions/runs/45159425207) pasó en `357ffdc`: 51/51 E2E, responsive 1/1, Backend Release/xUnit, audit/lint/build y cleanup.
- El test principal ejecutó promoción root→Admin desde Gestión de Equipo y restauró Logistics. Continuar con pendientes globales de CRUD/responsive.

## HEAD Front actual — 2026-11-23

- Front `8f2e68a` pasó Action [45160390591](https://github.com/Paul1578/Front_gpsR/actions/runs/45160390591): 51/51 E2E, responsive 1/1, Backend Release/xUnit, audit/lint/build y cleanup.
- Ambas brechas E2E de la auditoría independiente están cerradas y validadas. Mantener la misión abierta y continuar con restantes criterios técnicos.

## Siguiente brecha de integridad — asignación conflictiva real — 2026-11-23

- Auditoría Front señaló que el caso 409 de asignación de vehículo en UI interceptaba la petición y devolvía JSON simulado. El caso ahora crea un Driver bloqueador, ocupa el vehículo por API real, intenta asignarlo desde la UI Manager y verifica 409 más `vehicleId` intactos en ambos Drivers; luego libera el recurso y continúa con asignación válida.
- Limpieza del bloqueador quedó añadida al `finally`; fixture usa prefijo `E2EQA` para el SQL de runner.
- Local lint/build/discovery 51/diff-check pasa. No hay credenciales QA locales; el run autenticado API/MySQL debe validar el cambio.

## Siguiente brecha de edición de recursos de ruta — 2026-11-23

- QA encontró que el constructor habilita cambiar Vehicle/Driver, pero las pruebas sólo persistían nombre/paradas y confirmaban los recursos originales.
- E2E Admin ahora crea un segundo Vehicle, lo elige al editar, valida PUT+GET `Route.vehicleId` y `Driver.vehicleId`, y comprueba persistencia tras el guardado móvil. `finally` desasigna el recurso de prueba y recupera el vínculo original del fixture.
- Validación local lint/build/discovery 51/diff-check pasa; falta API/MySQL integrado.

## Conflicto real de asignación — validado — 2026-11-23

- Front `7b23ac5`, Action [45162583023](https://github.com/Paul1578/Front_gpsR/actions/runs/45162583023): 51/51 E2E, responsive, backend Release/xUnit, audit/lint/build y cleanup success.
- El mensaje 409 y las relaciones VehicleId se validaron contra API/MySQL real, sin mock. El Driver bloqueador se desasigna/desactiva y el runner verifica cleanup.

## Reasignación al editar ruta — validada — 2026-11-23

- Front `5dd199d`, Action [45163668259](https://github.com/Paul1578/Front_gpsR/actions/runs/45163668259): 51/51 E2E, responsive 1/1, Backend Release/xUnit, audit/lint/build y cleanup exitosos.
- UI cambió el Vehicle de una ruta real; GET de Route/Driver confirmó persistencia y el guardado móvil mantuvo la relación. Cleanup devolvió el vínculo original del fixture y eliminó Vehicles temporales.
- Conflicto 409 de vehículo ocupado ya había pasado en `7b23ac5`/Action `45162583023`.

## Siguiente verificación de baja de Vehicle — 2026-11-23

- Añadido GET del Vehicle tras DELETE (`isActive=false`) y recarga completa antes de reactivarlo; la lista de bajas debe conservar el fixture después del reload.
- CI E2E API/MySQL pendiente. En el primer parche el contexto del callback de `waitForResponse` no coincidió y se rechazó sin modificar; se releyó la sección y se aplicó en fragmentos. Ver ERROR_LOG.

## HEAD anterior validado y baja Vehicle ampliada — 2026-11-23

- Action [45164864584](https://github.com/Paul1578/Front_gpsR/actions/runs/45164864584) validó `e8c058f`: 51/51, responsive, backend Release/xUnit, audit/lint/build y cleanup.
- E2E Vehicle ahora comprueba `isActive=false` por API tras baja y después de reload, antes de Reactivar. Lint/build/discovery 51 pasan; código aún no publicado, CI requerido.

## Baja de Vehicle antes de Reactivar — validada — 2026-11-23

- Front `6d85ddd`, Action [45165992095](https://github.com/Paul1578/Front_gpsR/actions/runs/45165992095): 51/51 E2E, responsive, Backend Release/xUnit, audit/lint/build y cleanup success.
- GET confirmó `isActive=false` tras DELETE y tras recargar la vista de bajas; reactivación posterior devolvió `true`.

## Siguiente estado de error en roles — 2026-11-23

- E2E de confirmación añade rechazo HTTP 500 al cambiar User→Logistics desde Gestión de Equipo: comprueba toast, rol User intacto y después repite el cambio permitido. Mock intencional para el error de transporte/UI.
- Focal Playwright 1/1, lint/build, discovery 51 y diff-check pasan local. Falta Action integrado sobre commit posterior.
- Incidente: ESLint y Playwright se ejecutaron en paralelo y ESLint recibió ENOENT en `test-results`; secuenciado de nuevo y pasó. Ver `ERROR_LOG.md`.

## HEAD documental validado y error de rol — 2026-11-23

- Action [45167032665](https://github.com/Paul1578/Front_gpsR/actions/runs/45167032665) pasó `7ce8aef`: 51/51 E2E, responsive, Release/xUnit, audit/lint/build y cleanup.
- Focal de TeamManagement que prueba 500, mensaje visible/rol sin mutación y luego cambio exitoso pasó local 1/1; código aún pendiente de commit/Action.
