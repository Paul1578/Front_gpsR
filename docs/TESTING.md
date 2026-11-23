# Administración de empresa — errores y reintento — validación local 2026-11-22

- Action `45076629351` en SHA `2147be7`: **37/37 E2E** autenticados con API/MySQL efímeros, responsive **1/1**, audit/lint/build y cleanup correctos. Incluye 503 separados para Users y Routes/Vehicles, reintentos recuperables, exportación parcial bloqueada, formulario Driver a 320/768 px y regresión de persistencia parcial Vehicle.
- Action `45077576665` en docs HEAD `8887649` repitió esos checks sin cambios funcionales: **37/37 E2E**, responsive **1/1**, build/lint/audit y cleanup success.

# Validación de asignación concurrente, creación Driver y mapa Manager — pendiente de CI

- Front Action `45085920993` para `d652652`: **39/39 E2E** y responsive browser **1/1**, sin skips; audit, lint, build, API/MySQL y cleanup pasaron. Incluye ejecución real Manager mapa.
- Front Action `45086519736` para `104723a`: **39/39 E2E**, responsive **1/1**, cleanup correcto; valida Manager mapa con sufijo estable del runner.
- Front Action `45086827516` para `8a90494`: **39/39 E2E**, responsive **1/1**, cleanup; incluye CRUD Vehicle con cancelar confirmación y selectores semánticos.
- Backend Action `45085910280` pasó Release/xUnit, aislamiento HTTP/MySQL, concurrencia y cleanup. Front Action `45085920993` pasó audit/lint/build y browser responsive; E2E integrado en curso.
- Front local tras los fixes actuales: lint/build correctos, discovery **39 tests**, diff-check correcto. El E2E Manager mapa se descubrió y usa API real; ejecución local se omitió sin API/fixtures QA.
- Actions `45082924174` y `45083215716` demostraron que un único worker no evita la escritura perdida; ambas llegaron a leer SQL `VehicleId=NULL` tras el éxito visual. Backend `f8edbcd` corrigió el mutador y pasó 113/113 xUnit; Action `45084368819` success.
- `45084368342` y `45084699175`: **38/39 E2E**. Pasaron asignación Driver comprobada por SQL, CRUD dedicado, alta de Driver empresa y búsqueda responsive. Manager mapa fue el único fallo: menú mobile-only en desktop y fixture compartido tras retry.
- Fix local sustituye fixture por Manager/Driver dedicados y hace setup/cleanup idempotentes. Lint/build/discovery **39**, `bash -n` y diff-check pasan; nueva Action debe validar Manager mapa.
- Manager mapa comparte `FLETFLOW_E2E_MAP_FIXTURE_SUFFIX`; Action `45086519736` completó 39/39, incluido el escenario sin skips y cleanup.
- CRUD Vehicle ahora selecciona tarjeta por ID y acción eliminar por nombre accesible, con una aserción adicional de cancelar confirmación. Local lint/build y discovery 39 pasan; CI pendiente.

## CRUD responsive de Gestión de Conductores — persistencia de asignación pendiente

- Nuevo Playwright en `e2e/driver-management-search.spec.ts`: alta desde la pantalla dedicada, edición, asignación y retiro de Vehicle, baja/reactivación; consulta API verifica persistencia. Interacciones a 320 px y comprobación tablet a 768 px.
- Local: `npm run lint`, `npm run build`, descubrimiento Playwright **38 tests** y `git diff --check` pasan. La Action de API/MySQL y el cleanup son requeridos para validar el caso integrado.
- Action `45078351055` ejecutó **37/38**; trace identificó un selector sin opciones por contexto anterior a la creación del Vehicle. El test recarga antes de navegar.
- Action `45079269083` ejecutó **37/38**; locator ambiguo al compartir texto placa y documento. Corregido con claves distintas e ID de Driver consultado por API.
- Action `45080069469` ejecutó **37/38**; UI mostró placa tras PUT 204, pero GET de Driver retornó `vehicleId:null`. Action `45080342001` finalizó success con 37 passed y **1 flaky**: el intento inicial falló igual y el retry pasó. No se considera validada la persistencia estable; ver `ERROR_LOG.md`.
- El siguiente test consulta el mismo Driver por el origen API directo y por `/api/backend`, comparando ambos `vehicleId` para localizar divergencia de persistencia/instancia o rewrite.
- Action `45081264602` confirmó que el GET directo al origen API también devolvió null; no se atribuye a Next rewrite. El test ahora lee además `Drivers.VehicleId` del MySQL efímero usando el cliente instalado por CI, para separar escritura de lectura.
- Action `45081992619` leyó SQL `VehicleId=NULL` tras el PUT 204; la corrida pasó sólo tras retry. Config CI de Playwright cambia a un worker para aislar interferencia entre pruebas; Action siguiente pendiente.

- `npm run lint`, `npm run build`, `npm audit --audit-level=low` (0 vulnerabilidades), discovery **37 tests** y `git diff --check` pasan.
- El nuevo E2E intercepta `/Users/my-team`, `/Vehicles` y `/Routes` con HTTP 503; comprueba errores visibles, valores no presentados como cero, exportación deshabilitada y recuperación al reintentar. Action API/MySQL pendiente.
- `340eb55` pasó Action `45072015727`: E2E **36/36**, responsive 1/1, backend xUnit 111/111, audit/lint/build y cleanup.

# Administración de empresa y alta Driver — validación local 2026-11-22

- `npm run lint`, `npm run build`, `npm audit --audit-level=low` (0 vulnerabilidades), `npm run test:e2e -- --list` (**36 tests**) y `git diff --check` pasan tras eliminar Equipos ficticios y completar el formulario.
- El E2E `company-admin.spec.ts` valida que la pestaña Equipos no aparezca, el campo de email sea de tipo email y al elegir Chofer se pidan documento y teléfono. Action autenticada Chrome/API/MySQL todavía pendiente.

# Registro duplicado visible desde formulario — 2026-11-22

- E2E registra la empresa, repite el mismo email desde UI y espera HTTP 200 con el mismo payload neutral; verifica mensaje visible y redirección a Login, después inicia sesión con la cuenta creada.
- Conserva además intento API directo de duplicado con status/body idénticos. Action `45071113746` pasó **36/36 E2E** con API/MySQL descartables, responsive 1/1 y cleanup; no se expone indicador de email existente.

# Evidencia obligatoria para cierre de parada/ruta — 2026-11-22

- E2E intenta por API cerrar parada `InProgress→Completed` sin evidencia y cerrar ruta sin evidencia; espera HTTP 400, vuelve a leer y comprueba ruta/parada abiertas, evidencia vacía y vehículo OnRoute. Luego completa el camino positivo con evidencia.
- Smoke backend prueba `Pending→Skipped` sin evidencia, `InProgress→Completed` sin evidencia y cierre ruta; compara en MySQL status, fecha de cierre, JSON completo de puntos y vehículo antes/después. Smoke completo y cleanup cero pasaron.
- Backend unit tests Release: **110/110**. Front lint/build/audit (0 vulnerabilidades)/discovery 36, `bash -n` y diff-check pasan local. API local Front no está disponible; los nuevos E2E quedan para Action autenticada con DB efímera.

# Validación de búsqueda de conductores y corrección E2E — 2026-11-22

- Front lint y build correctos; `npm audit --audit-level=low`: 0 vulnerabilidades; Playwright descubre **36 tests** en 5 archivos; `git diff --check` correcto.
- Action `45067692881`: backend Release/xUnit **107/107**, audit/lint/build y responsive browser **1/1** pasaron; E2E **34/35**. El único fallo fue un locator estricto ambiguo para Documento/Teléfono en el ciclo de alta Driver, no un fallo de API.
- Corrección con roles textbox y nombres accesibles pasó Action `45068474426`: **36/36** E2E autenticados, responsive **1/1**, backend, audit/lint/build y cleanup.
- Commit `58e2b4c` crea un Driver API temporal para que el E2E de búsqueda no dependa de datos preexistentes. Action `45069041959` pasó **36/36**, backend **107/107**, responsive **1/1**, audit/lint/build; cleanup por runner y DB MySQL efímera.
- La API local :5048 no está disponible, por lo que no se reporta ejecución funcional local de estos E2E.
- El caso de búsqueda ahora crea/desactiva su Driver API temporal, sin skip por lista vacía. Un primer build de este ajuste encontró tipo nullable de `localStorage`; corregido a `undefined` y se repite build antes de Actions.

# Actualización 2026-11-22 — administración de empresa, búsquedas y responsive

- Front Action previo `45066249833` sobre `57e44c6`: Release backend/xUnit 107/107, audit/lint/build, responsive browser 1/1, Playwright autenticado API/MySQL 33/33 y cleanup.
- El lote local añade navegación Admin al panel de empresa, remueve operaciones simuladas, búsqueda de miembros/conductores y cobertura de edición/cancelación de rutas a 320/768 px.
- Validación local del lote: lint/build/discovery 35/npm audit/diff-check; Action autenticada debe confirmar los E2E nuevos.
- El frontend local responde 200 en :3000, pero API :5048 responde HTTP 000; no se ejecutó una suite funcional local sin API/fixtures. CI usa API y MySQL descartables.

# Actualización 2026-11-22 — constructor, asignaciones y tablet

- `npm run lint`: correcto.
- `npm run build`: correcto (Next.js 16.4.6, TypeScript y páginas estáticas).
- `npx playwright test --list`: **31 casos** descubiertos.
- `npx playwright test e2e/team-management-load-errors.spec.ts`: **9/9**; incluye 503/reintento de assignment-options en Rutas y etiqueta temporal que no se confunde con vehículo/conductor ausente.
- E2E de API/MySQL: Action `45050067540` pasó **28/30**; selectores corregidos. Action `45051132073` pasó Release/xUnit, audit/lint/build y responsive; E2E **29/31**. El test de mapa agotó los 30 s y su cleanup quedó sin margen; Mi Ruta esperaba menú móvil con viewport desktop. Se amplió timeout del mapa a 90 s y se fijó 390×844 en Mi Ruta. Repetición pendiente.
- El lote local siguiente añade ciclo User a 768 px, rol a 320, acciones Driver a 768, edición ruta a 320 y cancelación a 768; integrado pendiente.
- El primer build del cambio produjo TS18047 por acceso a `point.lat/lng` nullable; se añadió guard explícito `point && validPoint(point)` y el build final pasó. Ver registro y prevención en `ERROR_LOG.md`.

# Validación integrada pendiente — Historial Logistics y cambio de contraseña — 2026-11-22

- `npm run lint`, `npm run build`, `npm run test:e2e -- --list` (**21 tests**) y `git diff --check` pasan localmente.
- Actions `45033061272` pasó 20/20 E2E autenticados, responsive 1/1 y cleanup. Actions `45033318956` ejecutó backend Release/xUnit, audit/lint/build y responsive con éxito; E2E **20/21** por locator ambiguo del caso de contraseña, luego corregido.
- Actions `45033927966` validó ruta/placa pero falló **20/21** porque el assert global `role=alert` encontró una alerta no relacionada. El assert quedó limitado a `No se pudieron cargar las rutas`.
- Actions `45034387245` pasó backend Release/xUnit, audit/lint/build, responsive browser **1/1**, E2E Chrome/API/MySQL **21/21** y cleanup. Incluye Historial Logistics en 320/768 px, cambio de contraseña, revocación del refresh/password anterior y nuevo login.
- Después del pase se añadió una aserción más estricta del diálogo de detalle de Logistics dentro del viewport a 320/768 px; lint/build/discovery 21 y diff-check locales pasan; Actions pendiente para esta ampliación.
- Dashboard Logistics verifica la cifra de vehículos disponibles contra `/Routes/assignment-options`, además de garantizar que el navegador no llame `GET /Vehicles`. Actions `45035807218` pasó **21/21** Chrome/API/MySQL, responsive browser **1/1**, backend tests y cleanup; incluye diálogo de detalle Historial en 320/768 px y cambio real de contraseña.
- Historial Logistics usa placa/marca/modelo del DTO de ruta, sin GET administrativo `/Vehicles`.

# Validación integrada local — creación Manager responsive — 2026-11-22

- `npm run lint`, `npm run build`, `npm audit --audit-level=low` (0 vulnerabilidades), `npx playwright test --list` (**33**) y `git diff --check`: correctos.
- Runner `scripts/run-e2e-local.sh` contra API y MySQL 8 efímero: **33/33** Chrome/API/MySQL; incluye creación Manager de ruta con punto Delivery, persistencia, edición/cancelación, alta Manager/Logistics en 320/768 px y ciclo User a 320 px. Cleanup final sin residuos.
- E2E Manager aislado pasó **1/1** antes de la suite completa.
- Action `45058535602` sobre Front `50bf9d0` pasó audit, lint/build, responsive **1/1**, Release/xUnit del Backend, E2E integrado **33/33** y cleanup.
- La primera corrida integrada fue 32/33. Se corrigieron guardas de rol, fixture Driver no asignable, selector Editar, aria-label de edición y prefijo del cleanup SQL; el primer cleanup falló por FK en el contenedor descartable, que se eliminó completamente. El siguiente pase focal y el suite final pasaron.

# Validación QA actual — 2026-11-22

- `npm run lint`: correcto después de corregir la carrera de `refreshTeamUsers`.
- `npm run build`: correcto; Next.js 16.4.6 compiló TypeScript y generó las 10 rutas.
- `npm run test:e2e -- --list`: descubre 37 escenarios. Incluye fallo HTTP 503, retry de usuarios y recuperación conjunta de rutas/vehículos; la Action del SHA actualizado debe ejecutar el flujo autenticado con API/MySQL efímeros.
- Action `45072706025` (SHA `7f4841c`): **35/37 E2E**. Fallaron (1) el test buscaba Exportar en Resumen, donde no se renderiza y (2) Gestión de Equipo no veía un error Driver compartido cuando una carga local obsoleta se descartaba por carrera. Ambos corregidos en el siguiente cambio; aún sin ejecución integrada.
- Action `45073324431` (`147ba89`): **36/37 E2E**; sólo falló el conteo global de `—` (7 encontrados frente a 3 esperados) porque métricas ajenas también usan el valor. Selector acotado a la tarjeta “Resumen de Datos”; repetir Action.
- Action `45074489447` (`00f3b7c`): **36/37 E2E**. Error-context confirma que quedaba toast “Bienvenido, admin” aunque el error consultado ya se hubiera retirado. Se sustituyó conteo global ARIA por aserciones de texto de error concretas; nueva Action pendiente.
- Action `45075092805` (`ae34fa9`): **36/37 E2E**. Al navegar entre tabs se recargaban rutas/vehículos y ya no existía su botón retry en el regreso; secuencia reordenada para recuperar rutas/vehículos primero desde Resumen, después usuarios.
- Action `45075805793` (`067793e`): **36/37 E2E**; el retry de flota recargó miembros también y el botón de Usuarios ya no existía. La secuencia invierte el orden: Users primero, luego verifica recuperación conjunta de la flota.
- Interceptor desacoplado: `shouldFailUsers` y `shouldFailFleet` evitan que una recarga de contexto reactive antes de tiempo el endpoint que todavía se prueba en 503; ahora se prueban los retries de cada grupo explícitamente.
- Action `45075980605` (`4eec893`): **36/37 E2E**. El formulario de empresa nuevo pasó responsive 320/768; el único error fue retry fleet ausente tras auto-recarga. El HEAD posterior desacopla fallos API y queda por ejecutar.
- E2E company-admin verifica que el formulario Driver acepte datos y siga visible sin overflow a 320/768 px; Action del test pendiente.
- E2E de vehículo amplía ahora ciclo real para provocar HTTP 409 en el segundo endpoint (estado) tras persistir los campos generales; verifica respuesta visible, tarjeta y GET real antes de continuar la operación válida. La prueba integrada de este parche está pendiente.
- QA independiente detectó que el segundo clic de retry también apuntaba a una alerta ya retirada. El test ahora ejecuta un solo retry conjunto. El resumen de datos muestra `—`/carga durante fallos en vez de arrays vacíos como ceros.

# Pruebas frontend

## Búsqueda de Equipo en móvil/tablet — ampliación local, Action pendiente

- `team-search.spec.ts` ahora ejercita la búsqueda de miembros a 320 px y la búsqueda de conductores a 768 px, además del flujo existente a 390 px; verifica que no haya overflow horizontal en móvil/tablet.
- El flujo autenticado necesita fixtures reales de miembros y conductores; la Action API/MySQL valida interacción y cleanup. Ejecutar lint/build/discovery local y repetir Action integrada.

## Alta de Driver en Administración de la empresa — ampliación local, Action pendiente

- La vista tenía un formulario de creación, pero el E2E sólo comprobaba campos responsive y no enviaba. Ahora crea un Driver con identidad aleatoria a 320/768 px, verifica POST 200, respuesta honesta de correo no enviado, persistencia en `/Users/my-team` y perfil Driver en API, y lo localiza en la lista.
- Email/documento usan prefijos incluidos en `cleanup-e2e.sql`. Lint/build y Action integrada de esta ampliación pendientes.

## Comandos y resultados

- 2026-11-21, rama aislada `test/route-builder-persistence`: `npm ci` correcto (0 vulnerabilidades), `npm run lint` correcto, `npm run build` correcto y `npm run test:e2e -- --list` descubre 14 casos.
- Action `45051977357`, SHA `bffe183`: backend Release/xUnit, audit, lint/build y responsive pasan; suite integrada **29/31**.
- Action `45053076619`, SHA `514c0b9`: backend, audit, lint/build y responsive pasan; E2E **30/31**. La falla de Mi Ruta quedó corregida y pasó; trace del mapa identificó el fill del destino cuando el editor estaba oculto. Orden corregido localmente: editar nombre antes de abrir mapa. Repetir la suite integrada para validar **31/31** y cleanup.
- Action `45053782460`, SHA `b1823db`: backend, audit, lint/build y responsive pasan; E2E **30/31**, cleanup completo. El único fallo fue el nombre del destino después de fijar ubicación; corregido en trabajo local.
- Corrección de nombre aplica la etiqueta después de fijar punto. E2E también cubre alta directa de Manager/Logistics y acceso responsive de Manager al constructor. Lint/build y discovery **33** pasan local.
- Action `45054550439`, SHA `a2c1ca1`: valida mapa final y roles; concluyó con **32/33**; detalle del único fallo abajo.
- Resultado `45054550439`: backend/audit/lint/build/responsive pasan; **32/33 E2E** y cleanup. Alta Manager/Logistics pasó; el único fallo fue heading incorrecto del nuevo test de Manager (esperaba “Gestión de Rutas”, h1 real “Rutas”). Locator corregido; nueva Action pendiente.
- Action `45055100816`, SHA `1a893c9`: pasó **33/33 E2E**, responsive **1/1**, backend Release/xUnit, audit, lint/build y cleanup de MySQL. Valida el mapa, roles directos Manager/Logistics y acceso/responsive de Manager.
- Constructor de rutas: el caso existente agrega tres paradas, elimina una, reordena otra y crea la ruta desde el navegador. La aserción API ahora compara cada punto persistido por nombre y operación en orden exacto (incluye origen/destino sin operación), lo que demuestra que la parada eliminada no quedó y que los tipos siguieron a sus paradas al reordenar. El `finally` verifica las respuestas de limpieza de la ruta y vehículo.
- Intento Playwright autenticado local: `CI=true npm run test:e2e -- --grep "Admin crea una ruta desde el mapa móvil"` arrancó Next y reportó 1 skipped; faltaban credenciales QA/mutaciones y API no estaba activa (Swagger local HTTP 000). No se crearon fixtures; para resultado funcional se requiere el runner con API/MySQL descartables y variables QA.

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

- Repetición integrada con backend actualizado `cff33c6`: Actions `44983346765` success, responsive 1/1 y Playwright Chrome/API/MySQL **14/14**; lint, build y audit también pasaron.

- Actions `44983694110`: **14/14** E2E y 1/1 responsive, éxito completo con backend branch actualizado y MySQL descartable. Lint/build/audit correctos.

## Driver completa recogida/entrega en móvil — 2026-11-21

- Ampliado el E2E Driver: recibe una ruta real de la API, inicia desde Mi Ruta, inicia la parada, agrega evidencia de nota, marca completada y cierra la ruta; API debe mostrar ruta Completed y vehículo Available.
- Viewport 390×844. Lint, build y discovery de 14 tests pasan localmente; MySQL/Chrome integrado queda pendiente de Actions del nuevo SHA.

- Run `44984300436`: suite 14 tuvo fallo nuevo en Driver por espera 204 en endpoint de parada, cuyo contrato entrega 200. La ruta InProgress residual provocó 409 en retry y en el test siguiente. Aserción corregida y cleanup `finally` añadido. No contabilizar como pase; Actions nuevo pendiente.

- Trace del fallo reveló modal de evidencia tapado por controles del mapa (`z-50`); se corrigió elevando Dialog a z-index 2000/2001. Cleanup de ruta ahora comprueba las respuestas de cancelación/baja. Prueba integral pendiente.

- `44985230566`: **13/14**. Dialog Note guardó evidencia y dejó que la parada se completara; assert falló por esperar 204 en vez del HTTP 200 real. Tenant cross-tenant y cleanup pasaron. La expectativa se corrigió y fue validada en Actions `44985541718`.

## Driver E2E integrado — 2026-11-22

- Actions `44985541718` en SHA `1f3a24c`: audit, lint y build correctos; backend Release **56/56** sin warnings/errores; responsive Chrome **1/1**; Playwright autenticado Chrome/API/MySQL **14/14**.
- El E2E Driver inicia y completa una ruta móvil con evidencia de nota, y verifica por API que el vehículo vuelve a `Available`. CI usó MySQL desechable.
- Las aserciones HTTP quedaron alineadas a 200 según el contrato observado; la ruta se limpia desde `finally`. El modal sobre Leaflet quedó comprobado en la ejecución integrada.

## Limpieza de fixture de reordenar paradas — 2026-11-22

- Actions `44986079119` ejecutó la nueva persistencia del orden/tipos, pero el `finally` falló con 409 al borrar el vehículo: la ruta había asignado ese vehículo al Driver. Se corrigió restaurando la asignación previa; Actions `44986497890` pasó responsive 1/1 y Playwright 14/14.
- Una revisión separada detectó que el cleanup podía cortar pasos posteriores si fallaba la ruta o la restauración. El `finally` ahora cancela rutas activas, intenta todas las operaciones aunque una falle y acumula errores explícitos. Validado local con lint/build/list/diff check y por Actions `44986877646` en SHA `aa49b83`: Release **57/57**, responsive **1/1**, E2E autenticado **14/14**; no se ejercitó el camino de cancelación de emergencia.

## Breakpoint de 320 px — 2026-11-22

- El E2E Admin responsive ahora reduce Mi Perfil a 320×844 y comprueba que el cambio de contraseña sigue visible sin overflow. Actions `44987222908` validó el navegador: responsive 1/1, Playwright autenticado 14/14; backend Release 57/57 y build sin warnings/errores.

## Cobertura negativa por rol y errores móviles — 2026-11-22

- Playwright discovery actual: 15 tests en dos archivos. `npm run lint`, `npm run build` y `git diff --check` pasan.
- El spec `team-management-load-errors.spec.ts` se ejecutó localmente: **2/2**. Equipo y Choferes a 390×844 conservan visibles los avisos/Reintentar y no desbordan documento ni área principal, antes y después de recuperar.
- Se añadió un caso API que espera 403 para mutaciones no permitidas de User/Driver/Logistics/Manager. Usa las identidades User y Driver efímeras del runner; el rol Driver se restaura en `finally`.
- El caso nuevo de permisos no se ejecutó localmente: API y frontend locales devolvieron HTTP 000 y no había credenciales QA disponibles. No se cuenta como aprobado ni omitido; requiere Actions con API/MySQL descartables.
- Verificación integrada: Actions `44989454133` para `286b100` terminó success; xUnit **57/57**, Playwright autenticado **15/15** (sin skips), responsive **1/1**, audit, lint y build correctos. El runner ejecutó la matriz por rol contra API/MySQL efímeros y limpió los datos al cerrar.
- Backend final `chore/stabilize-fleet-platform` ahora está en `029e94d`, con ciclo Logistics y cleanup verificados por Actions `44991181335`. Falta repetir el workflow frontend contra ese HEAD para confirmar la integración cruzada final.
# Reejecución integrada con backend actual — 2026-11-22

- GitHub Actions frontend run [`44991377967`](https://github.com/Paul1578/Front_gpsR/actions/runs/44991377967): `success`, frontend SHA `8b59308`.
- El workflow descargó `chore/stabilize-fleet-platform` en SHA `029e94d`.
- Backend: build Release correcto; xUnit **57/57**, 0 fallidas y 0 omitidas.
- Frontend: `npm audit --audit-level=low` con 0 vulnerabilidades, ESLint y build Next correctos.
- Navegador: responsive no mutante **1/1**; E2E autenticado Chrome/API/MySQL **15/15**, sin skips.
- Alcance: valida el estado publicado de ambas ramas y sus flujos automatizados; la cobertura no equivale a pruebas exhaustivas de cada acción CRUD/pantalla responsive.
# Nuevo caso responsive tablet pendiente de CI — 2026-11-22

- `fleet-admin.spec.ts` añade `Admin crea una ruta con parada operativa en tablet sin desbordamiento`: viewport 768×1024, creación visual por mapa, asignación, revisión, persistencia HTTP de origen/parada recogida+entrega/destino y verificación de overflow en cada etapa.
- El `finally` retira ruta y vehículo QA y restaura la asignación original del Driver; el workflow usa API y MySQL descartables.
- Verificación local posterior al cambio: ESLint correcto, build Next correcto, Playwright discovery **16 tests**, `git diff --check` correcto.
- Pendiente para considerar el caso probado: resultado CI completo en Chrome/API/MySQL; no se afirma ejecución local real porque no hay credenciales/servicios QA disponibles en esta sesión.

# Validación de ruta tablet y cleanup final — 2026-11-22

- Actions frontend `44993827707`, SHA `2932aa0`, backend `029e94d`: xUnit **57/57**, audit **0 vulnerabilidades**, lint/build correctos, responsive **1/1**, Playwright autenticado **16/16** y job success. El script de cleanup MySQL finalizó con código cero.
- La ruta de tablet se creó en UI a 768×1024, persistió tres puntos con recogida+entrega según GET real y el cleanup retiró registros temporales.
- Trabajo añadido después de esa corrida: el E2E de vehículos verifica estado operativo Mantenimiento→Disponible mediante UI, GET API y recarga. Aún no probado por CI.
- Primera corrida de esta ampliación (`44994219944`) falló en GET inmediato porque el waiter reconocía el PUT de datos generales, anterior al PUT `/status`. Se estrechó a ruta exacta `/status`, se validan 204/payload y luego GET; volver a correr CI.
- Resultado corregido: Actions `44994623654` en SHA `cf8dc13` terminó success con backend `029e94d`; xUnit **57/57**, responsive **1/1**, E2E **16/16**, cleanup MySQL, audit, lint y build correctos. Vehículo cambió `status 0→2→0` y el estado persistió en API y UI tras recarga.

# Manager: permisos positivos HTTP — 2026-11-22

- La matriz E2E ahora también comprueba que Manager lee vehículos y rutas y completa el ciclo API de vehículo crear/editar/cambiar a mantenimiento/volver a disponible/leer/eliminar.
- Cuenta QA cambia a Manager y se restaura a Driver en `finally`. Vehículo usa prefijo `E2EQA` y limpieza local más fallback SQL del runner.
- ESLint/build/discovery local pasaron; Actions `44994997016` para Front `202ec3d` + Back `029e94d` terminó success: xUnit 57/57, audit 0, lint/build, responsive 1/1, Playwright autenticado 16/16 y cleanup MySQL correctos.
- Manager leyó vehículos/rutas y completó por API crear, editar, cambiar estado a mantenimiento/disponible, leer y eliminar vehículo; el fixture de rol se restauró.
- Primera corrida Actions `44991979019`: backend 57/57, audit/lint/build y responsive 1/1; E2E 15/16. Caso tablet expiró al timeout 30 s; cambio aplicado a límite 90 s y cleanup con fixture `request` independiente. Repetición de CI pendiente; no contar el nuevo test como aprobado.
- Actions `44992464372` identificó el locator exacto tras bajar el límite de espera: el botón `Abrir menú` no existe en breakpoint tablet, el sidebar está desplegado. El selector se corrigió; 15 casos y cleanup pasaron, pero la ruta no se creó y el E2E sigue sin aprobar.
- Actions `44992803081` falló después al no encontrar el vehículo creado por API en el selector del contexto ya cargado. Se agregó reload antes de crear la ruta; no se cuenta el E2E como pase hasta otra corrida (los otros 15 y cleanup sí pasaron).
- Actions `44993132771` llegó a revisión; falló una expectativa de nombre de parada que no forma parte del resumen UI. Ahora se comprueba el conteo de puntos y los datos exactos se dejan al GET de ruta persistida. Quedan 15 E2E y cleanup aprobados, nuevo caso pendiente.
- Actions `44993456874`: backend 57/57, build/audit/lint y responsive 1/1 correctos; Playwright autenticado **16/16**. El job terminó fail porque cleanup SQL no reconoció el nombre `E2E QA tablet ...`; ya se ajustó a `E2E QA ruta tablet ...`, prefijo requerido por `cleanup-e2e.sql`. CI debe confirmar cleanup después del fix.

## Validaciones negativas de vehículo y GPS móvil Driver — 2026-11-22

- `npm run lint`, `npm run build`, `npm run test:e2e -- --list` (**16 tests**) y `git diff --check` pasan localmente.
- Se amplió el E2E móvil Admin para intentar alta con placa repetida: espera 409, comprueba el mensaje del backend y confirma que queda un solo vehículo.
- Se amplió el E2E móvil Driver con geolocalización Playwright fija: espera `GPS en vivo`, inicia la ruta en UI, verifica el POST de posición y GET API con latitud/longitud esperadas.
- Backend local Release 59/59; Actions backend para `6ec5315` en curso. La ejecución integrada Playwright/API/MySQL frontend sigue pendiente.

## Negativo de placa duplicada y GPS Driver móvil — 2026-11-22

- Backend `6ec5315` pasó Actions `44995681296`: build, xUnit y smokes HTTP/MySQL de tenant y concurrencia. Release local backend 59/59.
- E2E Admin móvil valida que repetir una placa recibe HTTP 409, muestra el mensaje en español y no duplica la tarjeta.
- E2E Driver móvil usa geolocalización Playwright conocida, valida `GPS en vivo`, inicia la ruta, comprueba POST y lectura GET de coordenadas persistidas.
- `npm run lint`, `npm run build`, discovery Playwright **16 tests** y `git diff --check`: correctos. Actions frontend/API/MySQL del nuevo código pendiente.

## Seguimiento de GPS móvil — corrección posterior a Actions 44995899244

- Primera ejecución integrada: **14/16**. La cobertura nueva de GPS reveló que el throttle de 20 s se actualizaba cuando la ruta aún estaba pendiente; el inicio no enviaba posición y expiraba el test. El timeout además impedía cleanup con `page.request`; retries encontraron recursos activos (409).
- Se movió la guarda de estado antes del throttle y setup/cleanup pasa al request fixture independiente; ambos E2E restauran asignación de Driver y eliminan vehículo/ruta.
- Nueva repetición integrada pendiente. La corrida anterior no valida el caso GPS.
- Resultado: Actions `44996497487` validó Front `6fe66f7` + Back `104cda8`: xUnit 59/59, responsive 1/1, E2E 16/16, audit/lint/build y cleanup completos. Driver recibió GPS en vivo y el GET de ruta confirmó coordenadas; placa duplicada mostró el 409 sin duplicar vehículo.

## Documento Driver duplicado — 2026-11-22

- Backend Release local **61/61**; cambios de CreateDriver, UpdateDriver y `POST /Users` para HTTP 409 en documento repetido.
- E2E Admin móvil vuelve a enviar el documento con correo nuevo, espera 409/mensaje claro y verifica por GET `/Users/my-team` que el correo no fue creado.
- `npm run lint`, `npm run build`, discovery **16 tests** y diff-check pasaron. CI browser/API/MySQL integrado pendiente.
- Resultado de la nueva validación: Actions `44997054375`, Front `1bb7d71` + Back `a7f7c4e`, success con 61/61 xUnit, 16/16 E2E y responsive 1/1. El nuevo caso verifica el 409 y ausencia en el equipo.

## Edición de miembros — 2026-11-22

- npm run lint, npm run build y discovery Playwright (18 tests): correctos.
- Spec de estados de error/reintento: 2/2. El test Historial conserva 503 hasta observar el alert y luego permite reintentar.
- Dos primeras E2E API/MySQL dieron 16/18 y 17/18; tras corregir selectores y mock, repetición completa pasó 18/18 en Chrome. Runner local acabó código 0 y eliminó la DB/fixtures efímeros.
- Actions Front `45023625523` para SHA `42b1b4b35b3489e388488910e1ee084595f8b3b7` terminó `success`; el workflow incluye backend Release/xUnit, frontend lint/build, responsive y E2E autenticado con API/MySQL/cleanup.

## Actions integradas más recientes — 2026-11-22

- Run 45025319275 para Front 000d6cb terminó success: backend Release/xUnit/smoke, audit/lint/build, responsive 1/1, E2E autenticado Playwright/API/MySQL y cleanup.
- Este run usó Backend 8d3cb32. La implementación posterior de EmailOutbox requiere un nuevo run integrado para confirmar migración y API actuales.

## Matriz adicional Manager/Logistics y filtros — 2026-11-22

- Agregados asserts HTTP con tokens reales: GET /Users/my-team devuelve 403 a Manager y Logistics y el body no contiene el email de la cuenta objetivo.
- E2E crea dos rutas/vehículos/conductores temporales; combina estado+vehículo+conductor, exige sólo la ruta que coincide, limpia filtros y exige restaurar ambas.
- Logistics recorre asignación y diálogo de cancelación a 320×844 y 768×1024; se comprueba sin overflow y con selecciones/dialog visible dentro del viewport.
- La prueba encontró que Limpiar filtros desaparecía cuando aún había resultados; UI corregida.
- Validación local final: npm run lint, npm run build, discovery Playwright 20 y runner completo Chrome/API/MySQL 20/20. MySQL en container y esquema fletflow_ci_front_routes_20261122 fueron descartables; runner cleanup final se ejecutó y el container/key ring se eliminaron.
- Errores de la primera iteración (acción de limpiar ausente, DELETE Driver 405, prefijos de cleanup y path inicial del runner) constan en ERROR_LOG.
# Validación integrada 2026-11-22 — `da70521`

- Actions `45028577152`: **success** para Front `da70521` + Backend `f2f18cd`.
- `npm audit --audit-level=low`, lint, build, browser responsive y suite autenticada Playwright Chrome/API/MySQL: **20/20**, cero skips.
- El workflow finalizó API, MySQL y cleanup sin errores.

## Validación integrada posterior — `505d6c3`

- Actions `45030366554` success: backend Release/xUnit **80/80**, npm audit, lint, build, responsive browser **1/1** y Playwright autenticado Chrome/API/MySQL **20/20**.
- Runner ejecutó cleanup de la DB MySQL efímera; backend descargado `43c074d`. El backend ya había pasado su propio HTTP/MySQL smoke `45029798323` y el worker outbox está cubierto por SQLite.

## Dashboard Logistics: error y reintento de flota

- Nuevo caso de Playwright valida el endpoint autorizado `/Routes/assignment-options`: un 503 se representa con `—` y alerta (sin confundirlo con cero vehículos); tras Reintentar, el endpoint devuelve un vehículo y el dashboard presenta `1`.
- El test verifica además que el navegador no use GET `/Vehicles` para el rol Logistics y mide overflow a 390×844.
- Verificación local: caso enfocado **1/1**, `npm run lint`, `npm run build`, discovery **22 tests** y `git diff --check` correctos.
- E2E integrado con API/MySQL descartable pendiente en Actions para el SHA que incluye esta prueba.

- Cierre CI del E2E Dashboard Logistics: Actions [`45036661541`](https://github.com/Paul1578/Front_gpsR/actions/runs/45036661541), Front `a75914f`, **22/22** Playwright autenticado API/MySQL, responsive **1/1**, auditoría/lint/build correctos y cleanup completado.
- El run previo [`45036249291`](https://github.com/Paul1578/Front_gpsR/actions/runs/45036249291) pasó **21/21** para SHA `4e3ddc8`, incluyendo validación del diálogo History en 320/768 px.
- Revalidación cruzada Front [`45037486681`](https://github.com/Paul1578/Front_gpsR/actions/runs/45037486681): Front docs SHA `c7b0771`, checkout Backend `0b1c1d1` (código de seguridad `94c3e90`), **22/22 E2E**, responsive 1/1, backend build/tests, audit/lint/build y cleanup success.

## Gestión de Vehículos: error de carga inicial

- E2E en 320×844 simula 503 de GET `/Vehicles`, comprueba alerta visible y ausencia de “No hay vehículos registrados”; tras reintentar con 200, valida vehículo renderizado y sin overflow.
- `npx playwright test e2e/team-management-load-errors.spec.ts`: **5/5**; lint/build y discovery **23** correctos localmente. Actions integrado pendiente.
- Cierre E2E de Vehículos: Actions [`45038229853`](https://github.com/Paul1578/Front_gpsR/actions/runs/45038229853), Front `40bdcea`, **23/23** API/MySQL, responsive **1/1**, audit/lint/build y cleanup success. Checkout Backend `4090176`.
- Backend integrado actual `b625c28`: Actions [`45038446662`](https://github.com/Paul1578/Back_GPS/actions/runs/45038446662), xUnit **86/86**, build 0 warnings/0 errors, HTTP/MySQL y concurrencia/cleanup success. Repetir Front contra este SHA tras publicar esta evidencia.
- Revalidación completa contra backend actual: Actions [`45038687601`](https://github.com/Paul1578/Front_gpsR/actions/runs/45038687601) validó Front `f972e19` + Backend `b625c28`: xUnit **86/86**, E2E API/MySQL **23/23**, responsive 1/1, audit/lint/build y cleanup success.

## Logout global y desactivación de usuario — 2026-11-22

- E2E añadidos: dos contextos de navegador inician sesión; logout-all termina la sesión actual y el refresh del segundo contexto recibe 401; otro caso autentica un miembro, lo da de baja desde Gestión de Equipo y comprueba 401 tanto de refresh como de access.
- El runner crea una cuenta de baja independiente para mantener aislado el test de cambio de contraseña y la elimina con el cleanup de fixtures `fletflow.e2e.user.*`.
- ESLint y `npm run build` pasan; Playwright descubre **28 pruebas**. Suite autenticada contra API/MySQL descartable pendiente.

## E2E de Mi Ruta y cierre de sesiones — 2026-11-22

- Acción Front `45048803279`: 26/28 E2E pasaron. Los dos fallos esperaban el botón responsive “Abrir menú” con el viewport desktop por defecto; corregido fijando 390×844 en logout-all y offboarding. El fallo y prevención están en `ERROR_LOG.md`.
- Mi Ruta: agregados casos para ruta InProgress sobre Pending más reciente, GET `/Routes` 503 y retry, y avance de “Siguiente punto” al completar dos operaciones. `npm run lint`, `npm run build` y discovery **30** pasaron tras el ajuste del viewport. E2E autenticado integrado de estas pruebas sigue pendiente.

## Cobertura añadida — 2026-11-22

- Driver adjunta PNG; Playwright comprueba respuesta, render/persistencia y evidencia en Historial tras completar ruta.
- Ciclo Driver de asignación, edición, baja/reactivación a 320 px.
- Registro y cambio de contraseña a 320/768 px sin overflow.
- Validación local: lint/build/discovery 33. E2E API/MySQL y CI pendientes.

## Corrida integrada 33 escenarios — repetición requerida

- Action `45060482928`: 30/33. Dos escenarios recibieron HTTP 409 porque compartían el mismo Driver de QA y solicitaron rutas activas en paralelo; el formulario de Driver excedió el viewport 320 px (413 px).
- Correcciones posteriores: fixtures Driver independientes para escenarios operativos y aislamiento tenant; ancho mínimo corregido en `DriversManagement.tsx`. `npm run lint`, `npm run build`, `npx playwright test --list` (33) y `git diff --check` pasan localmente.
- Estado: no declarar E2E integrados como aprobados hasta repetir Actions con frontend/backend actualizados.

## Acción Front `45061522878` — 31/33; nueva repetición requerida

- Evidencia: el diálogo conservó modo “Nota” cuando el test esperaba el campo de foto. Venció el límite de 30 s; el retry vio la ruta pendiente del primer intento y recibió 409 para el mismo Driver. Las trazas Playwright están descargadas y la causa quedó confirmada.
- El segundo caso de Equipo midió el formulario CRUD de Driver a 413 px en viewport 320 px. Se añadieron `min-w-0` en sus ancestros y `w-full min-w-0` al form; la prueba selecciona explícitamente el modo Foto.
- Estado de este fix: local y Actions pendientes.

- Front Action `45062280254`: **31/33**. El caso de Mapa detectó overflow interno a 320 px (363 px) y el de evidencia llegó a Historial pero no encontró evidencia en `route.evidencias`; el endpoint la entrega en cada `points[].evidence`. Fix local mapea evidencia por parada y limita ancestros del mapa; se agregó aserción de detalle Admin a 768 px. Nueva ejecución pendiente.

- Tras la Action `45062280254` (31/33), se corrigieron el desborde interno del mapa a 320 px y el mapeo de evidencia desde las paradas; el E2E ahora mide también el detalle Admin en 768 px. Lint/build, discovery 33 y diff-check pasan localmente. Action del SHA actualizado pendiente.

- Action integrada `45063487802`: **31/33**. El mapa siguió excediendo `<main>` 43 px; ahora su wrapper también tiene ancho máximo y recorta overflow. El test de Historial esperaba 1, pero el flujo real agrega 3 evidencias; expectativa alineada a dos notas+foto. Volver a ejecutar 33 E2E.
- Action integrada `45064475585`: **33/33 E2E autenticados**, Responsive browser check, lint, build y audit pasaron. Cubre mapa a 320 px e Historial/foto/descripción a 320/768 px.
- Registro neutral: UI redirige a Login; E2E compara status/payload para email nuevo/duplicado y valida login posterior. Discovery sigue en 33 pruebas; lint/build pasan localmente. Action integrada pendiente.
- Action `45065014129` pasó **33/33 E2E** con backend `30bcb2f`; no incluye aún el commit de registro neutral, que requiere nueva integración.
- Action `45065745273` pasó **33/33** e incluye alta neutral, email duplicado y login posterior sobre backend `825bbed`. Sólo falta integrar en Front el piso temporal de backend `52d7e46`.
# Validación UX Admin raíz — 2026-11-23

- E2E ampliado: cuenta Admin raíz autenticada abre el formulario de creación en Gestión de Equipo y ve la opción “Gerente”.
- `isRootAccount` llega de `/Auth/me` y es calculado por el backend desde la propiedad de la entidad autenticada; alimenta la UX de creación y cambio de rol.
- Local: `npm run lint` y `npm run build` pasaron; Playwright enumeró 39 pruebas. El escenario autenticado completo queda pendiente de CI integrado.
- Backend Action `45088129188` validó la regla real mediante HTTP y MySQL efímero: root permitido, Admin delegado denegado, 113/113 pruebas y cleanup.
- E2E simulado de Admin delegado verifica ausencia de “Gerente” al crear y cambiar rol; foco 1/1 en 0.8 s y archivo completo 10/10 en 15.3 s. La primera corrida expiró al usar locator hamburger en desktop; cambiado a navegación directa.
- Lint, build, discovery de 40 E2E y diff-check pasan. Action `45088879212` cubre SHA anterior `5784b36`; queda publicar y ejecutar Action para este SHA con test delegado.
- Action `45088879212` terminó **38 passed, 1 failed**: root-only opción falló porque el flag inferido del JWT no coincidió con el contexto integrado. Backend añadió `isRootAccount` a `/Auth/me`; validar build, smoke root/delegado y E2E completo en Actions del nuevo SHA.
- Tras integrar el flag: lint/build y discovery Playwright 40 pasan; `team-management-load-errors.spec.ts` pasa **10/10** local. Backend Release xUnit **113/113**, build 0 warnings/0 errores y `bash -n`/diff-check correctos. HTTP/MySQL y suite browser integrada del SHA nuevo quedan pendientes.

## Revisión del selector de rol raíz — 2026-11-23

- Action `45090273209`: responsive browser 1/1, audit, lint y build correctos; suite integrada **39/40**. El fallo fue locator con nombre exacto, no autorización: la traza mostraba el botón “Gerente” con su descripción accesible.
- El trace/error-context se descargó y revisó. Fix afirma primero `/Auth/me.isRootAccount === true` y usa locator por prefijo del nombre accesible.
- Backend Action `45090274537`: Release build correcto, xUnit **113/113**, smoke HTTP/MySQL y concurrencia con limpieza.
- Front Action `45091340306` aprobó el fix integrado: backend Release/xUnit, audit, lint/build, responsive **1/1**, E2E **40/40** y cleanup.
- Local antes del ajuste al constructor: `npm run lint`, `npm run build`, discovery **40** y `npx playwright test e2e/team-management-load-errors.spec.ts` **10/10**.

## Constructor de rutas — revisión/search retry — validado

- E2E existente de creación mapa mantiene puntos reales y operaciones. Se amplía el test tablet para probar búsqueda de dirección, estado sin resultados, fallo de servicio, respuesta tardía al cambiar objetivo, orden/operación en revisión y primer POST 503 seguido de retry.
- Local tras el refactor: lint/build correctos, discovery 40 y diff-check limpio.
- Action Front `45092540906` para `992053d`: **40/40 E2E**, responsive **1/1**, backend Release/xUnit, audit, lint/build y cleanup correctos. El caso tablet valida Nominatim con resultado, vacío, error y respuesta tardía tras cambiar objetivo; valida revisión ordenada/tipos y 503 seguido de creación/persistencia exitosa al reintentar.

## Constructor de rutas — validado

- Action Front `45092540906` para `992053d`: E2E autenticado API/MySQL **40/40**, responsive **1/1**, build/audit/lint y cleanup exitosos. Casos: Nominatim con resultado, vacío, error y respuesta tardía tras cambio de destino; orden/tipos en revisión; creación que responde 503 seguida de retry persistido.
- Backend smoke local actualizado: ruta con origen, pickup, delivery, parada pickup+delivery y destino; evidencia individual, cambios de estado en secuencia, GPS y finalización con vehículo disponible. API + MySQL descartables, resultado exit 0 y cleanup completo. La Action backend debe ejecutarse tras publicar este cambio.
