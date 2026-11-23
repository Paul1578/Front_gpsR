## 2026-11-22 — Edición concurrente podía borrar la asignación de vehículo — CORREGIDO LOCALMENTE; CI PENDIENTE

- Action `45082924174` con un worker y Action `45083215716` reprodujeron que `PUT /Drivers/{id}/assign-vehicle` terminaba con `Drivers.VehicleId=NULL`, aunque la UI recibiera éxito; el retry también podía pasar, así que se conservó la aserción SQL.
- Causa encontrada al trazar escritores: `UpdateDriverCommand` podía leer el Driver con `VehicleId=NULL`, quedar concurrente con la asignación y luego guardar el objeto obsoleto. `DriverRepository.UpdateAsync` copia también `VehicleId`, lo que permite una actualización perdida.
- Corrección local: editar bloquea el Driver con el mismo lock de asignaciones, vuelve a leerlo dentro de la transacción y actualiza el perfil con el `VehicleId` vigente. Una regresión simula una asignación entre lectura inicial y lock; Actions aún debe validar el cambio.
- Prevención: todo mutador de Driver que escriba el registro completo debe usar los locks de asignación y volver a leer el estado después del lock. No quitar la verificación SQL del E2E hasta que el workflow pase.

## 2026-11-22 — Tres pruebas E2E confundían contrato o nodos responsive — CORREGIDOS LOCALMENTE; CI PENDIENTE

- Action `45083215716` falló en administración porque esperaba que `/Users/my-team` mostrara el documento del Driver en el renglón User. Ese DTO no contiene `identificacion`; el documento sí persiste en el perfil Driver. La UI ahora omite `ID:` cuando falta y el E2E valida el username, conservando la lectura API del perfil/documento.
- `team-search.spec.ts` localizaba el texto Doc por toda la página y Playwright resolvió un nodo que el layout responsive reportó oculto. Se añadió `data-testid` al contenedor Driver y el test usa el ID recibido de API.
- La asignación de Driver continuaba siendo flaky en ambas Actions y motivó la corrección backend registrada arriba. Tras cada arreglo se debe correr el suite integrado; no inferir éxito desde estado optimista.
- Prevención: al verificar campos de usuario respetar el DTO que realmente devuelve la API; en E2E usar el contenedor de la entidad por ID, no texto global duplicable por responsive.

## 2026-11-22 — E2E Manager mapa esperaba menú móvil en desktop y compartía Driver de otros tests — CORREGIDO Y VALIDADO EN CI

- Actions `45084368342` y `45084699175` ejecutaron **38/39 E2E**; los demás casos, incluido el CRUD Driver y su asignación SQL, pasaron. Manager mapa agotó 90 s al abrir la navegación como si el viewport desktop fuera móvil. El retry encontró el rol del mismo Driver ya cambiado a Manager y el primer intento había dejado recursos Pending porque expiró antes de cleanup.
- Corrección: el runner prepara una cuenta Manager dedicada y un Driver de ruta dedicado. El E2E navega directamente por la opción de escritorio, conserva móvil/tablet sólo para aserciones responsive y usa un sufijo estable para limpiar recursos de un retry anterior antes/después del escenario.
- Se añadió limpieza SQL de la cuenta `fletflow.e2e.manager.map.*`; Driver/Vehicle/Ruta usan los prefijos QA ya cubiertos. `bash -n`, lint/build/discovery 39 y diff-check pasan local; requiere Action autenticada nueva.
- Prevención: no operar el hamburger mobile-only en desktop; no mutar fixtures de rol compartidos entre tests; timeout nunca debe dejar estado que invalide un retry.
- Validación: Actions `45085920993`, `45086519736` y `45086827516` completaron **39/39 E2E**, responsive **1/1** y cleanup.

## 2026-11-22 — Sufijo aleatorio del mapa podía cambiar al reiniciar worker — CORREGIDO Y VALIDADO EN CI

- La revisión independiente detectó que un retry tras reiniciar el worker podía regenerar `randomUUID()` y dejar sin limpiar la ruta/vehículo del primer intento.
- El runner exporta `FLETFLOW_E2E_MAP_FIXTURE_SUFFIX` desde el identificador de la ejecución y el spec lo reutiliza para nombrar fixtures; el test se omite si falta esta variable.
- Prevención: identificadores para cleanup E2E deben sobrevivir los retries del worker, no crearse sólo al cargar el módulo.
- Validación: Action `45086519736` pasó 39/39 y cleanup con `FLETFLOW_E2E_MAP_FIXTURE_SUFFIX` compartido.

## 2026-11-23 — E2E Vehicle dependía del orden de botones y estructura visual — CORREGIDO Y VALIDADO EN CI

- La auditoría observó que el flujo de vehículos localizaba tarjetas con `.grid > div` + texto y accionaba eliminar con `nth(1)`, frágil si cambia el layout o aparece otro botón.
- Se agregó `data-testid` por VehicleId y nombre accesible `Eliminar vehículo <placa>`; el E2E usa la tarjeta y acción identificadas y comprueba que cancelar confirmación conserva el registro.
- Prevención: los E2E de CRUD deben buscar entidades por ID y acciones por nombre accesible, sin depender del orden visual.
- Validación: Action `45086827516` pasó **39/39 E2E** y responsive **1/1**, incluyendo cancelación y posterior baja real.

## 2026-11-22 — Runner E2E no suministraba UserId a Manager mapa — CORREGIDO EN RUNNER

- Al auditar la nueva prueba se detectó que esperaba `FLETFLOW_E2E_DRIVER_USER_ID`, pero `run-e2e-local.sh` sólo exportaba DriverId. Eso habría omitido el test de Manager aunque el suite terminara verde.
- Backend runner ahora exporta el ID de User creado para el fixture Driver. La siguiente Action Front debe mostrar explícitamente el caso Manager como ejecutado.

## 2026-11-22 — E2E de errores de administración tenía selectores y recuperación incorrectos — CORREGIDO LOCALMENTE

- Revisión QA detectó que el test buscaba Exportar en la pestaña Resumen y pulsaba dos veces un reintento que recupera rutas y vehículos en conjunto. También halló ceros aparentes en el resumen de exportación tras fallos 503.
- El E2E ahora valida `—` y exportación bloqueada en Gestión de Datos, recupera usuarios en su propia pestaña y usa una sola recarga conjunta para rutas/vehículos. Las lecturas tardías de miembros ya no pisan resultados de recargas posteriores; logout/rol distinto invalida peticiones pendientes.
- Prevención: al probar interfaz con tabs, ubicar controles dentro de la vista correspondiente y modelar los efectos combinados de cada acción de reintento.

## 2026-11-22 — Error de carga de choferes se perdía entre solicitudes paralelas — CORREGIDO LOCALMENTE

- La Action `45072706025` corrió 35/37: además del selector de exportación, falló el escenario de error/reintento de Gestión de Equipo. La vista dependía sólo del estado de su solicitud local; `FleetContext` también carga Drivers al autenticar y descarta respuestas obsoletas por secuencia. Si la carga paralela vigente fallaba y la vista recibía una respuesta descartada, el error compartido no aparecía en Equipo.
- Gestión de Equipo combina el resultado local con el error de recurso del contexto. Una respuesta obsoleta no oculta el error de la solicitud actual; al recuperar exitosamente, el contexto limpia el error y se muestra el estado vacío real.
- Prevención: consumidores con cargas duplicadas deben mostrar el estado del recurso compartido; probar carreras además de respuestas HTTP aisladas.

## 2026-11-22 — Aserción de valores de exportación contaba métricas ajenas — CORREGIDO LOCALMENTE

- Action `45073324431` pasó **36/37**; el único fallo fue esperar exactamente tres guiones buscando en toda la página. El DOM incluye otros indicadores “—” de métricas del resumen, fuera de la tarjeta de exportación.
- La aserción ahora se limita al contenedor encabezado “Resumen de Datos”, que contiene únicamente los tres conteos de exportación. No se cambió el comportamiento visual.
- Prevención: acotar aserciones E2E al componente/contenedor cuyo estado se está verificando; datos similares pueden aparecer en widgets vecinos.

## 2026-11-22 — E2E contaba todos los roles alert y atrapó el toast de bienvenida — CORREGIDO LOCALMENTE

- Action `45074489447` terminó **36/37**. Error-context/trace: tras reintentar usuarios, el mensaje de carga sí se eliminó; quedaba un `role=alert` distinto, el toast “Bienvenido, admin” del login. El test usó `getByRole("alert").toHaveCount(0)`, demasiado global para una página con notificaciones.
- Ahora espera que desaparezca cada mensaje de error de carga específico de usuarios/rutas/vehículos. El toast independiente no afecta el resultado.
- Prevención: asertar estados de negocio por contenido/localizador del recurso y no inferir que todas las alertas ARIA deben desaparecer al recuperar una consulta.

## 2026-11-22 — Navegar a Usuarios recuperaba rutas/vehículos antes del click de retry — CORREGIDO LOCALMENTE

- Action `45075092805` terminó 36/37. El retry de Usuario se hacía primero; al navegar de vuelta a Resumen la aplicación ya había reconsultado y recuperado rutas/vehículos desde el mock HTTP 200. Por eso no quedaban botones de retry y el test agotaba 30 s.
- El flujo ahora vuelve a Resumen mientras los errores siguen visibles, libera HTTP 200 y hace allí el retry conjunto; después cambia a Usuarios para recuperar `/Users/my-team`, y al final verifica que Exportar se habilitó.
- Prevención: ordenar una prueba de reintentos según las transiciones que disparan cargas automáticas de la pantalla.

## 2026-11-22 — Retry de flota también refrescó el equipo, ocultando el siguiente botón — CORREGIDO LOCALMENTE

- Action `45075805793` terminó 36/37. Tras reintentar rutas/vehículos, el efecto compartido recargó `/Users/my-team`; al entrar a la pestaña Usuarios, el error ya se había eliminado y no existía botón Reintentar.
- E2E ahora entra en Usuarios mientras el mock aún mantiene 503, verifica que el botón está visible, libera la respuesta y ejecuta retry de miembros primero. Luego comprueba que rutas/vehículos se recuperan con los renders/refrescos derivados y que Exportar vuelve a habilitarse. Los retries directos de flota siguen comprobados en pruebas específicas de su pantalla.
- Prevención: probar cada botón antes de acciones que desencadenan recargas compartidas y pueden limpiar su estado.

## 2026-11-22 — El mock compartía un único interruptor de fallo para tres APIs — CORREGIDO LOCALMENTE

- El test usaba `shouldFail` común para `/Users/my-team`, `/Vehicles` y `/Routes`. Al reintentar un recurso, los efectos/recargas de contexto podían volver a consultar los otros endpoints y recibir 200 prematuramente; sus errores/botones desaparecían antes de su propio retry.
- Se separó en `shouldFailUsers` y `shouldFailFleet`. Usuarios conserva 503 hasta su acción explícita; rutas y vehículos conservan 503 hasta que se ejecuta su retry conjunto. Luego se verifican mensajes específicos desaparecidos y exportación habilitada.
- Prevención: los interceptores E2E deben modelar cada fuente de error de forma independiente, no usar un toggle global cuando se prueban reintentos por recurso.
- Action `45075980605` sobre `4eec893` pasó 36/37 y reprodujo la carrera en el último reintento de flota; su prueba responsive de formulario a 320/768 px y 36 escenarios pasaron. La corrección de banderas separadas quedó en el siguiente HEAD.

## 2026-11-22 — Panel de empresa requería cobertura responsive estrecha — EN VALIDACIÓN

- QA detectó que la prueba del formulario verificaba los campos Driver a 390 px y sólo medía el ancho general en 320 px dentro de otra pestaña; no probaba escribir ni la presentación del formulario en 320/768.
- E2E ahora llena campos de Driver a 320 px y verifica overflow/heading/inputs a 320 y 768 px. No crea datos en este caso.
- Prevención: cubrir interacción y visibilidad de controles responsive en cada viewport, no sólo el ancho del documento.

## 2026-11-22 — Edición de vehículo podía ocultar una actualización parcial — CORREGIDO LOCALMENTE

- Auditoría independiente confirmó que el frontend envía datos generales y estado a endpoints distintos. Si `/Vehicles/{id}` respondía 200 y `/Vehicles/{id}/status` fallaba, la base ya tenía marca/modelo nuevos, pero la UI conservaba el objeto viejo y reportaba un fallo total sin explicar que hubo persistencia parcial.
- Tras guardar datos generales, la UI actualiza inmediatamente esos campos conservando el estado previo. Si falla el endpoint de estado, devuelve un mensaje explícito de actualización parcial. E2E de edición intercepta el segundo PUT con 409 y compara toast, tarjeta y API GET para probar los valores realmente persistidos; luego continúa el ciclo válido del vehículo.
- Prevención: no presentar una secuencia de endpoints como operación atómica; probar fallo del segundo paso y comparar pantalla con lectura backend.

## 2026-11-22 — Administración mostraba cero cuando fallaba la carga y exportaba datos parciales — CORREGIDO LOCALMENTE

- El panel tomaba arreglos vacíos tras fallos de `/Users/my-team`, `/Vehicles` o `/Routes` y los mostraba como cero. La exportación generaba archivo aunque faltaran consultas; al crear usuario tampoco actualizaba la lista visible.
- AuthContext expone error/carga/reintento de miembros; el panel distingue estados y no habilita exportación parcial. Tras el alta refresca la lista y avisa si el refresco falla. Playwright simula HTTP 503 y recuperación; lint/build/audit 0/discovery 37 pasan local, Action pendiente.
- Prevención: distinguir cero confirmado de error, probar carga y recuperación, y bloquear exportaciones hasta recibir todas las fuentes requeridas.

## 2026-11-22 — Administración de empresa ofrecía equipos que API no guarda — CORREGIDO LOCALMENTE; CI APROBADO

- El panel mostraba la lista “Equipos” agrupando por `teamId`, pero `/Users/my-team` no devuelve ese campo y `POST /Users` ignora el valor enviado. El contador y los detalles podían aparentar una relación inexistente. El mismo alta ofrecía Chofer sin recoger email/documento/teléfono completos.
- Se retiraron la pestaña y el selector de equipo; alta ahora pide email y, para Chofer, documento/teléfono, que se envían a API. Action `45072015727` sobre `340eb55` pasó 36/36 E2E, responsive 1/1, backend 111/111 y cleanup.
- Prevención: no presentar relaciones de negocio como reales sin verificar su persistencia y lectura posterior desde API; probar que cada formulario incluya los campos obligatorios del contrato.

## 2026-11-22 — Email duplicado sólo se probaba por API, no por el formulario — CORREGIDO Y VALIDADO

- El registro E2E comprobaba el contrato neutral con HTTP directo, pero no ejecutaba la segunda presentación de email desde la UI ni verificaba el mensaje/redirección del usuario.
- Se añadió submit duplicado por formulario, comparación exacta del payload con el primer registro, toast neutral y regreso a Login. El caso luego inicia sesión con la cuenta creada originalmente.
- Prevención: probar respuestas neutrales de negocio tanto en endpoint como en el flujo visible; no afirmar que la UI es correcta sólo porque el API responda bien.
- Action `45071113746` pasó **36/36 E2E**, backend xUnit 110/110, responsive, audit/lint/build y cleanup contra MySQL descartable.

## 2026-11-22 — API permitía cerrar parada sin evidencia y dejar ruta atascada — CORREGIDO LOCAL; ACTION PENDIENTE

- `Route.UpdatePointStatus` aceptaba Completed/Skipped con cero evidencia; luego `AddPointEvidence` rechazaba la parada cerrada y `ChangeStatus(Completed)` rechazaba la ruta, dejándola imposible de finalizar. La interfaz bloqueaba Completar, pero Omitir también podía crear la inconsistencia.
- Dominio ahora rechaza terminales sin evidencia antes de mutar; DriverView deshabilita Omitir. xUnit cubre ambos rechazos y Skip válido con evidencia; Release **110/110**.
- Smoke tenant HTTP + MySQL 8 efímero exit 0. Snapshot de Routes.Status, EndedAt, PointsJson y Vehicles.Status idéntico tras los tres HTTP 400; cleanup cero. Front lint/build/audit/discovery 36 correctos. Action nueva pendiente.
- Prevención: validar transiciones terminales en API/dominio, comprobar no mutación en DB y no confiar sólo en UI.

# 2026-11-22 — Manager no recibía opciones para crear rutas — CORREGIDO Y VALIDADO LOCALMENTE

- Síntoma: Manager podía abrir el constructor, pero los selectores de vehículo/conductor quedaban vacíos.
- Evidencia: `GET /Routes/assignment-options` devolvía recursos válidos; el trace del navegador no mostraba ninguna solicitud a ese endpoint. `FleetContext` sólo solicitaba opciones para `gerente` y `logistica`, aunque el rol backend `Manager` se normaliza como `manager`.
- Corrección: incluir `manager` en carga, actualización y reintento. La prueba crea recursos QA aislados, Manager crea una ruta con varios puntos, confirma persistencia y edita/cancela en móvil; también abre el constructor en tablet.
- El Driver vinculado del fixture general no aparecía como asignable; se sustituyó por un Driver QA independiente sin usuario, evitando depender de otro fixture.
- Errores de prueba corregidos: el estado del Driver se envió primero como query y dio 415; se cambió a JSON `{ isActive: false }`. El botón real dice “Editar ruta”, no “Editar <nombre>”. El botón de salida de edición anunciaba “Cancelar creación”; ahora anuncia “Cancelar edición”.
- En la primera ampliación tablet, el test no avanzó de Información porque omitió nombre y descripción obligatorios. El formulario se comportó correctamente; se completaron los campos antes de Continuar y el escenario Manager volvió a pasar.
- El primer nombre no coincidía con el patrón `E2E QA ruta %` del limpiador SQL y la FK impidió eliminar el Driver QA. Se alineó el prefijo y se descartó el contenedor MySQL efímero completo; no se modificó la base persistente.
- Validación final: E2E Manager aislado **1/1**, suite API/MySQL **33/33** y cleanup; lint/build/audit (0 vulnerabilidades) y discovery **33** pasan.
- Prevención: agregar roles a todas las guardas de carga/reintento; nombrar fixtures con los prefijos del limpiador y comprobar el contrato de cada endpoint en E2E.

# 2026-11-22 — Actions 45051977357/45053076619: E2E de mapa móvil — CORREGIDO Y VALIDADO

- Action `45051977357` pasó Release/xUnit del backend, audit, lint/build y browser responsive; E2E **29/31**. El mapa agotó 90 s y el cleanup; Mi Ruta no mostró el alert 503.
- En `45053076619` pasó Mi Ruta y el suite mejoró a **30/31**. El timeout individual capturó la causa del mapa: la prueba abrió la vista de mapa móvil con “Ubicar destino” y luego intentó llenar el input de destino, oculto mientras el mapa permanece abierto. El trace confirma `Ubicando destino` y el botón “Ver paradas y detalles”.
- El siguiente intento confirmó que el `onMapClick` asigna la etiqueta genérica “Destino”. Por eso el nombre escrito antes de abrir el mapa también se reemplazaba al fijar coordenadas.
- Corrección aplicada: verificar que el campo escrito sin coordenadas se muestre pendiente; abrir el mapa y seleccionar ubicación; al regresar al editor, escribir el nombre final con las coordenadas ya persistidas.
- La interceptación persistente de `/Routes**` hizo determinista el 503; la prueba confirmó el alert y el retry de “Mi Ruta” en la última Action.
- Prevención: cuando el mapa móvil está abierto, los campos del editor quedan ocultos; toda edición requiere el panel visible. La selección de mapa puede también reemplazar el nombre visible, así que aplicar la etiqueta final después de seleccionar. El timeout individual identifica rápido futuros fallos de visibilidad. CI conserva traces cinco días.
- Action `45053782460` terminó **30/31**; el cleanup funcionó y el único fallo siguió en el nombre de destino, sobrescrito por el click de mapa. El nuevo orden conserva la verificación pendiente, fija coordenadas, y luego aplica el nombre final desde el editor visible. La repetición con ese cambio y los nuevos casos de roles está pendiente.
- Action `45054550439` pasó **32/33**, incluido el E2E de altas Manager/Logistics. Manager llegó a Rutas, pero el test esperaba heading “Gestión de Rutas”; el h1 real es “Rutas”. Causa: selector E2E no coincide con el texto accesible real, no error de permisos ni UI. Corregido el locator a `heading: Rutas` para la lista y al cancelar el constructor.
- Action `45055100816` sobre `1a893c9` pasó **33/33**, además de backend Release/xUnit, audit, lint/build, responsive y cleanup. Confirmó el heading corregido, creación Manager/Logistics, navegación Manager y constructor móvil con nombre/geometría persistidos.
- Actions `45053076619` y `45054550439` emitieron warning por Node 20 en `upload-artifact@v4`; los artifacts sí se cargaron y traces se descargaron. Actualizado a `actions/upload-artifact@v7.0.2` (release actual consultada en GitHub); esa versión aún requiere ejecutarse en un workflow fallido para comprobar la subida condicional.

# 2026-11-22 — Action 45051132073: timeout de test de mapa y menú responsive — CORREGIDO

- Action validó backend Release/xUnit, audit, lint, build y responsive; E2E **29/31**.
- El E2E de ruta desde mapa a 320 px excedió timeout de 30 s tras agregar validación de ubicación pendiente. El finally intentó restaurar el Driver/eliminar vehículo cuando ya no quedaba presupuesto de test, y Playwright reportó timeout también durante cleanup.
- Solución: ampliar a 90 s sólo el caso completo de mapa, que incluye varios puntos, validación, API real y limpieza. Reejecutar en MySQL descartable; no se ignorará un error de cleanup.
- El E2E Mi Ruta volvió a asumir menú móvil, pero Playwright inicia en viewport desktop. Solución: fijar 390×844 al inicio. Prevención: todo test que dependa de hamburger debe declarar viewport responsive explícito, no asumirlo por el tipo de flujo.
- Action actual requiere repetición; cualquier cambio de fixture ocurrido en el run fallido fue en contenedor/MySQL descartable y el runner desmontó los servicios.

# 2026-11-22 — Crear/editar rutas mostraba coordenadas de Quito sin seleccionar punto — CORREGIDO

- Síntoma: al escribir un nombre en origen/destino sin elegir una ubicación, el formulario podía mostrar/persistir las coordenadas predeterminadas de Quito como si fueran reales.
- Causa: el cambio de nombre inicializaba `origin`/`destination` desde un punto geográfico real por defecto; la vista también trataba cualquier objeto como una ubicación fijada.
- Solución: se retiró `DEFAULT_POINT`; los puntos sin selección tienen coordenadas `NaN`, el indicador usa `validPoint`, y la validación impide avanzar hasta definir origen/destino. E2E verifica el estado pendiente, bloqueo de avance y selección real posterior en mapa.
- Prevención: no usar coordenadas reales como placeholders. Los nombres de ubicaciones y su geometría sólo pasan a estado válido después de un evento de mapa/búsqueda que entregue coordenadas.
- También se muestra error/reintento de `assignment-options` en la lista, los IDs sin etiqueta no se anuncian como “sin vehículo/conductor”, y la confirmación de cancelación evita prometer disponibilidad incompatible con mantenimiento.
- Validación local: lint/build correctos, Playwright discovery **31**, E2E de carga/error **9/9**. E2E API/MySQL integrado del constructor y CRUD tablet pendiente de Actions.

# 2026-11-22 — Action E2E falló por supuestos de alertas y locator ambiguo — CORREGIDO EN TESTS

- Actions `45050067540`: backend, auditoría de dependencias, lint, build y responsive pasaron; E2E **28/30**.
- Caso “Mi Ruta”: el test esperaba el fallo en Dashboard, pero las rutas se solicitan al abrir “Mi Ruta”. El rol `alert` global resolvía al anuncio accesible de Next. Solución: entrar primero a Mi Ruta y localizar `role=alert` filtrando por el texto esperado.
- Caso de evidencia: el locator `name: "Nota"` también coincidía con “Agregar Nota”. Solución: botón selector por nombre exacto.
- Prevención: afirmar cuándo y qué pantalla solicita la API; en apps con anuncios accesibles, filtrar los roles por contenido; usar `exact: true` cuando un botón comparte prefijo con su acción.

# Error local de TypeScript — narrowing de punto nullable — CORREGIDO

- El primer build del cambio geográfico falló porque TypeScript no infiere que `point` deja de ser `null` al llamar `validPoint(point)`.
- La rama de render ahora comprueba explícitamente `point && validPoint(point)` antes de acceder a `lat/lng`. Build posterior pasó.

# 2026-11-22 — Historial de Logística fallaba por una consulta administrativa — CORREGIDO Y VALIDADO

- Síntoma: una cuenta Logistics podía leer `/Routes` pero Historial mostraba error al cargar.
- Causa: `RouteHistory` esperaba que `/Routes` y `/Vehicles` terminaran correctamente con `Promise.all`; `/Vehicles` devuelve 403 a Logistics. El DTO de rutas ya incluye placa, marca y modelo.
- Solución: el Historial usa los datos de vehículo incluidos en el DTO de cada ruta y deja de pedir el listado administrativo de vehículos. El E2E de Logistics ahora abre Historial, comprueba placa/detalle y revisa 320 y 768 px.
- Validación: lint/build pasan; Actions `45034387245` confirmó historial/detalle responsive dentro de **21/21 E2E** Chrome/API/MySQL y cleanup.

# 2026-11-22 — Dashboard de Logística calculaba cero vehículos disponibles — CORREGIDO Y VALIDADO

- Síntoma: Logistics podía consultar vehículos disponibles por `Routes/assignment-options`, pero el dashboard mostraba cero porque intentaba contar la colección `vehicles` vacía.
- Causa: el contexto omite correctamente GET administrativo `/Vehicles` para Logistics; `MainDashboard` sólo contaba ese listado y no usaba el recurso autorizado.
- Solución: disponibilidad usa `routeAssignmentVehicles` para Logistics; cantidad en ruta usa IDs únicos de vehículos de rutas activas. Si falla el endpoint de opciones o rutas, muestra `—` en la métrica afectada.
- E2E compara dashboard con opciones reales y asegura que el navegador no emita GET `/Vehicles`. Actions `45035807218` pasó 21/21, responsive 1/1 y cleanup con API/MySQL/Chrome descartables.

# 2026-11-22 — E2E Logistics contaba alertas ajenas al Historial — CORREGIDO Y VALIDADO

- Síntoma: Actions `45033927966` pasó 20/21. El E2E llegó a encontrar la ruta y su placa, pero `getByRole("alert").toHaveCount(0)` falló al encontrar otro elemento accesible como alerta.
- Causa: el assert global no diferenciaba el error de carga del Historial de otras alertas de la pantalla.
- Solución: comprobar sólo la alerta con el texto exacto `No se pudieron cargar las rutas`; el test ya comprueba que la ruta y su vehículo se muestran.
- Actions `45034387245` pasó **21/21** con el assert específico; ruta, vehículo y detalle visibles sin error del Historial.

# 2026-11-22 — Selector E2E ambiguo al cambiar contraseña — CORREGIDO Y VALIDADO

- Síntoma: Actions `45033318956` pasó backend, auditoría, lint, build y responsive; falló 20/21 E2E en el flujo nuevo de contraseña antes del POST.
- Causa: `getByPlaceholder("Nueva contraseña")` también coincidía con “Confirmar nueva contraseña” y Playwright activó strict mode.
- Solución: localizar ambos campos por nombre exacto de textbox.
- Prevención: al usar locators por placeholder, revisar prefijos compartidos; preferir nombres accesibles exactos en formularios con campos similares. Actions `45034387245` pasó **21/21** y verificó cambio, revocación de refresh/clave antigua y nuevo login.

# 2026-11-22 — Lectura de archivos E2E desde el repositorio equivocado — CORREGIDO

- Síntoma: inspecciones buscaron E2E Front desde Backend, y código Backend o carpetas `app/components` desde Front; devolvieron “No such file”/`rg` IO error.
- Causa: se cruzaron las raíces hermanas `/home/leonardo/Front_gpsR` y `/home/leonardo/Back_GPS`, y se asumió estructura `app/components` en vez de la real `src/Components`.
- Solución: localizar cada archivo con `rg --files` desde su raíz y repetir lectura desde el repositorio/carpeta real.
- Prevención: especificar `workdir` correcto para recursos hermanos; verificar `pwd`/`rg --files` antes de consultas dependientes del cwd.

# Registro de errores y decisiones

## 2026-11-22 — Respuesta tardía de refresh podía afectar otra sesión — CORREGIDO

- Revisión de seguridad Front halló que `AuthContext` podía aceptar una renovación o un `401` iniciado bajo la cuenta A después de que el usuario cerrara sesión e iniciara como B. Una respuesta tardía podía reemplazar los tokens de B o cerrar su sesión. La operación remota de logout también podía limpiar estado de una sesión nueva al finalizar.
- Se añadió una generación de sesión a restauración, login/registro, refresh, consultas autenticadas y logout. Las respuestas sólo cambian estado si pertenecen a la generación y al refresh token actuales; logout captura el token previo y limpia el estado local al inicio. Los AbortError esperados por invalidación ya no se reportan como fallos inesperados.
- E2E mantiene el refresh de A pendiente, cierra sesión, inicia B y libera la respuesta de A; verifica usuario B y `auth-account-b-token`. El caso pasó 1/1 y el spec de carga/error pasó 8/8.
- Primer intento E2E falló: un `AbortError` normal de la sesión invalidada se registró con `console.error`; el overlay de Next dev interceptó el clic de logout. Se suprimió ese log esperado y la repetición pasó. En otra corrida, lint se ejecutó al mismo tiempo que Playwright y ESLint recibió `ENOENT` al recorrer `test-results`, directorio que Playwright recreaba. Prevención: ejecutar lint/build después de finalizar Playwright, no en paralelo.
- `npm run lint`, `npm run build`, discovery Playwright (**26 pruebas**) y `git diff --check` pasan localmente. Front commit `c6441b6` pasó Actions `45042907944`: backend Release, audit/lint/build, responsive **1/1**, Playwright autenticado API/MySQL **26/26** y cleanup completo.

## 2026-11-22 — Auditoría E2E consultó rutas de archivos con mayúsculas/carpeta equivocadas — CORREGIDO EN LA BÚSQUEDA

- Un `rg` buscó `src/Components/Routes`, `Drivers`, `Vehicles`, `TeamManagement` y `RouteHistory`; el repositorio organiza esas vistas en `src/Components/fleet` y el sistema distingue mayúsculas. La búsqueda emitió “No such file”.
- Solución: consultar las rutas reales bajo `src/Components/fleet`. No fue error del producto ni modificó archivos.

## 2026-11-22 — E2E local de Mi Ruta omitido por falta de fixtures de flota — LIMITACIÓN DE ENTORNO

- La ejecución local aislada descubrió el caso pero Playwright lo marcó skipped porque faltan credenciales/ID Driver QA y `FLETFLOW_E2E_ALLOW_MUTATIONS=true`. El test requiere un API/MySQL descartable y realiza operaciones que luego limpia.
- No se ejecutó contra la base compartida ni se creó un usuario bootstrap local. La validación real debe ejecutarse en Actions, cuyo runner genera credenciales y base efímera. Actions `45043342482` pasó 26/26 antes de añadir la comprobación tablet; el SHA nuevo aún requiere CI integrado.

## 2026-11-22 — Asignación fallida sin E2E negativo en Gestión de Conductores — COBERTURA AÑADIDA

- Auditoría confirmó que el componente ya mostraba el error de API al asignar, pero no había prueba de que un HTTP 409 se presentara sin un toast de éxito.
- E2E Manager inyecta respuesta 409, exige el mensaje del backend y ausencia de confirmación; después retira el stub y ejecuta la asignación real.
- `npm run lint`, `npm run build` y discovery Playwright **20** pasan local. Actions `45032626648` pasó E2E autenticado **20/20**, responsive 1/1 y cleanup correcto.

## 2026-11-22 — Cambio de contraseña web sin E2E exitoso — COBERTURA AÑADIDA

- Auditoría observó que el perfil probaba visibilidad responsive y un 503 de `logout-all`, pero nunca completaba el cambio de contraseña desde la UI.
- Nuevo E2E al final de la suite cambia la contraseña del User QA, espera logout, comprueba que refresh antiguo y contraseña anterior dan 401 y vuelve a autenticarse con la nueva.
- `npm run lint`, `npm run build`, discovery Playwright y Actions integrado pendientes para este caso.

## 2026-11-22 — Runner E2E local detenido por guard de mutaciones — CORREGIDO

- Primera invocación de `run-e2e-local.sh` terminó en código 2 porque no estaba definida `FLETFLOW_E2E_ALLOW_MUTATIONS=true`; el guard se ejecutó antes de tocar servicios o datos.
- Al relanzar con autorización, el precheck pidió una cuenta Admin bootstrap temporal `fletflow.e2e.admin.*@example.test`; no se proporcionó ni se creó una cuenta en la base local del desarrollador.
- Para evitar mutar datos locales no descartables, el runner se detuvo y la prueba autenticada se delega a Actions, donde se generan credenciales y MySQL efímeros. Lint/build/discovery locales sí se ejecutan.
- Prevención: para pruebas E2E destructivas locales, revisar `docs/TESTING.md` y habilitar la variable de consentimiento en el proceso de esa ejecución; no exportarla globalmente.

## 2026-11-22 — Matriz E2E preparaba Manager por API, no desde la UI; modal móvil sin verificación estrecha — COBERTURA AÑADIDA

- Auditoría de suite descubrió que el E2E autenticaba como Manager después de cambiar el rol con API; no probaba la acción Admin en Gestión de Equipo. El diálogo de usuario se usaba a 390 px y sin afirmar que controles/scroll cupieran en 320/768.
- El E2E ahora cambia el fixture Logistics→Manager desde el botón visible del rol, espera HTTP 200, lee persistencia desde /Users/my-team y luego inicia sesión con esa cuenta para comprobar su acceso y restricciones.
- El diálogo Admin verifica contenido y acciones a 320×844/768×1024 y alterna rol de Driver a Gestor de flota, confirmando los campos condicionales.
- Solución validada: lint/build local pasan; Actions `45017898939` ejecutó 18/18 E2E autenticados contra Chrome/API/MySQL, responsive 1/1 y cleanup success.

## 2026-11-22 — Formulario Driver aceptaba documento/teléfono sobre el límite y E2E medía overflow incompleto — CORREGIDO

- La revisión independiente encontró que el formulario permitía 100 caracteres de documento y 30 de teléfono, pero MySQL admite 20 para ambos; altas podían fallar en persistencia y ediciones eran rechazadas por API.
- Se fijó `maxLength=20` en ambos campos y el comando de creación backend valida longitudes y campos obligatorios antes de persistir; hay pruebas unitarias para el límite, su aceptación exacta y el trim.
- La revisión responsive medía sólo el documento antes de crear una tarjeta. El E2E ahora mide `main.scrollWidth/clientWidth` y la tarjeta del Driver creado en 320 px.
- Verificación local pendiente para este SHA; repetir E2E integrado/API/MySQL en Actions.
- Validación del commit base `88b0907`: Actions `45016257079` pasó responsive 1/1 y E2E 18/18 con API/MySQL. Los hallazgos adicionales del formulario Equipo/tablet se corrigieron después y requieren su propia integración.

## 2026-11-22 — Gestión de Equipo no aplicaba límites del nuevo formulario Driver — CORREGIDO

- La auditoría detectó que Admin conserva la creación de Drivers dentro de Gestión de Equipo, donde documento/teléfono no tenían `maxLength` y los campos del perfil no eran obligatorios, a diferencia de la pantalla nueva.
- Se alineó el formulario de Equipo con campos requeridos y límites 100 para nombres/20 para documento y teléfono. El E2E Admin comprueba ambos atributos; el E2E de Manager verifica acciones y formulario de Drivers también a 768 px.
- Lint/build/discovery Playwright 18 y diff-check pasan localmente. Actions `45016638974` para `d79ecb8` pasó responsive 1/1 y E2E autenticado 18/18 con cleanup; la vista tablet y formulario Admin quedaron cubiertos.

## 2026-11-21 — Playwright autenticado local omitido por falta de entorno QA

- El caso del constructor se invocó de forma aislada; Playwright inició Next, pero lo marcó skipped porque no estaban configurados Admin QA/`FLETFLOW_E2E_ALLOW_MUTATIONS` ni Driver fixture. La API local tampoco respondía en Swagger (`HTTP 000`). No se realizaron mutaciones.
- No es una falla de producto ni del test. La suite real requiere levantar API/MySQL en configuración descartable y proporcionar los fixtures QA; el runner del backend ejecuta esas precondiciones y limpia por prefijo.
- No se reutilizó la base del checkout backend compartido: presentaba cambios locales no relacionados y su runner opera sobre fixtures QA. La prueba queda pendiente de ejecución autenticada aislada.

## 2026-11-21 — Playwright de alta Driver seleccionaba dos campos por placeholder parcial — CORREGIDO

- La prueba UI de Equipo buscó `jperez` y Playwright también encontró el email `jperez@empresa.com`; strict mode detuvo el caso antes de enviar el formulario.
- Solución: seleccionar el textbox por nombre accesible exacto. El runner local ejecuta cleanup aunque Playwright falle.
- Verificación: suite completa posterior pasó 5/5, incluyendo alta/edición/baja/reactivación del Driver.

## 2026-11-21 — Alta Driver quedaba con el diálogo abierto durante rate limit — CORREGIDO

- En E2E API/MySQL el POST de usuario terminó 200 con `driverId`, `invitationSent=false`; después, un refresco excedió el límite local de 60 solicitudes/minuto y la interfaz no cerró el diálogo ni mostró el aviso de correo.
- La UI cierra el diálogo inmediatamente después del alta confirmada y ejecuta refrescos como tareas independientes; si un refresco falla, comunica que el alta persistió y que la lista necesita recargarse.
- El backend omite el rate limit sólo para loopback en Development. El límite de 60/min sigue activo en los otros entornos.
- Verificación: creación desde Equipo, aviso SMTP, edición persistida, baja/reactivación y suite Chrome 5/5 con API/MySQL.

## 2026-11-21 — Locator del Driver inactivo seguía exigiendo texto exacto — CORREGIDO EN TEST

- Al dar de baja al conductor, la UI concatena “Inactivo” en el mismo párrafo del nombre; `exact: true` impedía localizar ese elemento.
- Se quitó la coincidencia exacta sólo para ese estado. La ejecución posterior pasó la baja y reactivación completas.

## 2026-11-21 — E2E de rutas intentó saltar pasos que móvil oculta — CORREGIDO EN TEST

- A 390×844 el constructor oculta las pestañas que permiten saltar a “Revisión” en escritorio y guía al usuario con “Continuar”; el test de escritorio buscaba ese botón y expiró.
- El caso ahora completa Información → Recorrido → Asignación → Revisión con los botones disponibles, y verifica el ancho de contenido en móvil.
- Verificación: suite autenticada Chrome 5/5; la ruta conserva `PickupAndDelivery` y no hay overflow horizontal.

## 2026-11-21 — Cambio de rol no refrescaba la lista de conductores — CORREGIDO

- API desactiva el perfil Driver cuando el usuario pasa a Logistics y lo reactiva al volver a Driver; la colección React podía conservar el perfil previo.
- `handleRoleChange` ahora recarga conductores al entrar o salir del rol Driver y comunica por separado un fallo de refresco.
- La lista del equipo muestra el nombre de cuenta, mientras que el perfil Driver muestra el nombre operativo; la prueba se corrigió para localizar cada recurso por su identidad correspondiente. Un XPath inicial tenía una barra final inválida y se corrigió.
- Con rol Logistics el perfil inactivo debe salir de la lista Driver, no aparecer como chofer de baja; al volver a Driver reaparece activo. La aserción se ajustó a la regla de negocio.
- Verificación: Chrome/API/MySQL confirmó ambos cambios de rol y la suite pasó 5/5.

## 2026-11-21 — Locator inicial de Playwright coincidía con el botón de mostrar contraseña — CORREGIDO

- La primera ejecución de la suite E2E falló porque `getByLabel("Contraseña")` coincidía tanto con el input como con el botón que hereda `aria-label="Mostrar contraseña"`.
- Se cambió el locator al textbox accesible con nombre `Contraseña`; el campo sigue identificado por su etiqueta visible y el botón no se confunde con el input.
- La repetición queda registrada en `docs/TESTING.md`; el flujo autenticado de CRUD requiere credenciales QA y se omite explícitamente si faltan.

## 2026-11-21 — Wrapper E2E esperó al proceso API de larga vida — RESUELTO

- El wrapper puntual usó `wait` sobre el servidor reiniciado en background; el E2E ya había terminado, pero la shell seguía abierta por el proceso API.
- Se interrumpió únicamente la espera, se confirmó limpieza SQL (cero usuario/cero vehículo QA) y se inició API Development de forma desacoplada.
- Verificación posterior: Swagger y dashboard HTTP 200; la API volvió a ejecutarse sin variables de bootstrap.
- El intento de desacoplar la API con `nohup` se cerró junto al grupo de procesos de la terminal y devolvió HTTP 000 después de una verificación inicial. Se reinició en una sesión PTY persistente; ahora Swagger responde 200 y la ruta protegida devuelve 401 sin token.

## 2026-11-21 — No fue posible abrir nuevos subagentes en esta continuación — LIMITACIÓN DEL ENTORNO

- La solicitud de dos revisiones auxiliares fue rechazada por el límite de hilos concurrentes del entorno.
- No se afirmará que participaron en este pase. Las auditorías independientes frontend/backend ejecutadas antes siguen documentadas; esta continuación se revisó y probó localmente.

## 2026-11-21 — Playwright directo no encontró Chromium descargado — CORREGIDO

- `npm run test:e2e` sin variable de navegador buscó el Chromium empaquetado de Playwright, que no estaba instalado; el wrapper local sí elegía Chrome del sistema.
- `playwright.config.ts` ahora usa la variable explícita si existe y, de lo contrario, detecta `/usr/bin/google-chrome`; si no hay Chrome del sistema, usa el navegador Playwright habitual.
- Se repetirá la suite sin variable manual para verificar la ruta por defecto.
- Resultado: `npm run test:e2e` sin ruta explícita ejecutó login negativo correctamente y omitió los dos escenarios que requieren Admin QA; suite completa autenticada 3/3 fue confirmada con el runner.

## 2026-11-21 — Cleanup E2E omitía la cuenta Driver QA — CORREGIDO

- La nueva fixture Driver quedó con perfil y rol de equipo, pero el SQL de limpieza sólo borraba Admin y User; la verificación posterior halló dos usuarios QA remanentes (Admin bootstrap y Driver) aunque rutas/conductores/vehículos estuvieran en cero.
- Se añadió el namespace `fletflow.e2e.driver.*@example.test` al cleanup; la repetición de 4/4 y la consulta posterior confirmaron todos los conteos QA en cero.

## 2026-11-21 — Consulta de verificación asumió una columna de revocación inexistente — CORREGIDO

- La lectura SQL final usó `RefreshTokens.IsRevoked`; el esquema real almacena la revocación en `RevokedAt`.
- La consulta falló antes de devolver resultados y no modificó datos.
- Corrección: inspeccionar las columnas reales y contar tokens vigentes con `RevokedAt IS NULL AND ExpiresAt > UTC_TIMESTAMP()`; repetir después los conteos de fixtures y migraciones.

## 2026-11-21 — Ajuste del fixture de ruta dejó al primer wrapper sin completar — CORREGIDO

- La primera edición del runner omitió la comilla de cierre de una captura `export VAR="$(node <<HEREDOC ...)"`; `bash -n` señaló el error antes de mutar datos.
- Después, el wrapper recibió HTTP 400 al iniciar sesión con el bootstrap temporal; al usar `export VAR="$(...)"`, el shell continuaba pese al error. Se cambió a asignación simple seguida de `export` para que `set -e` aborte y ejecute el cleanup.
- Se reinició el API con el bootstrap temporal y el siguiente intento pasó 4/4. El motivo del HTTP 400 inicial no pudo aislarse; no se reporta como fallo de producto.
- Verificación final: fixtures Admin/User/Driver/ruta/conductor/vehículo en cero y 22 migraciones.

## 2026-11-21 — Sondeo de salud consultó una ruta API inexistente — CORREGIDO EN EL DIAGNÓSTICO

- Un sondeo manual probó `/api/Dashboard` y recibió 404; se había asumido sin revisar el contrato que existía un endpoint dedicado.
- El dashboard se compone en frontend con los recursos reales de Vehicles/Routes/Drivers. Se verificaron por separado la página web 200, Swagger 200 y endpoints protegidos 401 sin sesión.
- El 404 de la ruta no implementada no es un error de la aplicación ni se reporta como funcionalidad fallida.

## 2026-11-21 — El filtro “Mostrar bajas” no incluía conductores inactivos — CORREGIDO

- `refreshDrivers(false)` recibía filas inactivas de la API, pero el frontend las eliminaba con un filtro incondicional.
- Se filtra sólo cuando `onlyActive=true` y se secuencian cargas concurrentes para ignorar respuestas anteriores que lleguen tarde.
- Chrome/MySQL: edición de Driver, baja, aparición en filtro, reactivación persistida y 390×844 sin overflow.

## 2026-11-21 — Locators E2E no coincidían con texto accesible real — CORREGIDO EN EL TEST

- “Gestión de Equipo” coincidía con menú y tarjeta; se hizo exacto el selector de menú.
- Badge “Inactivo” se concatena al nombre; se verifican badge y acción “Reactivar” sin exigir coincidencia exacta del nombre.
- El texto real de User es “Tu cuenta no tiene permisos operativos asignados”; Chrome confirmó controles ocultos y API 403.

## 2026-11-21 — Fixture Logistics usaba cuenta fuera del tenant y aún no activada — CORREGIDO EN LA PRUEBA

- El primer intento usó el ID de Admin en el cambio de rol; la API lo rechazó con 400 y el fixture se limpió.
- El segundo Manager estaba bajo invitación pendiente y login devolvió 400 porque SMTP no está configurado.
- Se creó el Manager con API autenticada dentro del tenant correcto y se activó sólo el fixture QA en DB; Chrome verificó Logistics: Rutas visible/200, Equipo/Vehículos ocultos y Vehicles 403. Se borró la cuenta al terminar.

## 2026-11-21 — E2E de vehículo esperaba borrado físico y tenía XPath mal formado — CORREGIDO EN EL TEST

- El API implementa baja lógica para conservar historial; GET por ID devuelve `isActive=false`, mientras `onlyActive=true` lo excluye. El assert de 404 era incorrecto.
- Un locator XPath terminó en `/` y el navegador lo rechazó. Se corrigió a cuatro pasos ascendentes.
- Chrome volvió a ejecutar crear/buscar/editar/baja lógica; API confirmó edición y exclusión de activos, y la UI quitó la tarjeta. Fixture limpiado al final.

## 2026-11-21 — Llamada a ubicación de vehículo no implementada — CORREGIDO

- DriverView llamaba `PUT /Vehicles/{id}/location` y actualizaba la UI pese al fallo.
- Se eliminó esa llamada; posiciones provienen del endpoint real de tracking por ruta.

## 2026-11-21 — Seguimiento de mapa ocultaba error y fallback parecía ruta real — CORREGIDO

- Se conservaba un array vacío tras error y el trazado directo de OSRM fallback no se identificaba como aproximado.
- Ahora se conserva el último dato, se ofrece reintentar y se indica cuando la geometría es estimada; el fetch tiene timeout.

## 2026-11-21 — Restauración de sesión podía esperar indefinidamente — CORREGIDO

- `/Auth/me` y refresh carecían de timeout. Se añadió AbortController de 12 segundos y limpieza de sesión inválida.
- Verificación: lint y build de producción.

## 2026-11-21 — E2E autenticado no repetido después de rotación de JWT — PENDIENTE

- No existen credenciales QA Admin disponibles en variables locales; los tokens previos fueron revocados al rotar JWT.
- No se reutilizaron ni registraron credenciales. Los E2E previos están documentados en `TESTING.md`.
- Actualización: se generaron cuentas QA efímeras mediante el flujo de registro y se comprobó API autenticada/aislamiento multiempresa; la limpieza dejó el entorno sin cuentas ni recursos de prueba. El E2E visual de navegador aún no se repitió.

## 2026-11-21 — Prueba de proxy usó ruta Next inexistente — CORREGIDO

- Síntoma: la consulta manual `GET /api/Routes` devolvió 404.
- Causa: Next configura el proxy bajo `/api/backend/:path*`.
- Solución: probar `/api/backend/Routes`; proxy respondió 401 esperado sin token.

Este documento registra errores encontrados durante la estabilización del producto y la solución aplicada. Se actualiza antes de cerrar cada tarea técnica.

## 2026-11-20 — Clic del mapa no registraba ubicaciones

- Síntoma: el usuario veía “Seleccionando”, pero un clic en Leaflet no creaba el origen, la parada o el destino.
- Causa: el código intentaba usar `whenCreated`, que no forma parte del flujo soportado por React-Leaflet 5.
- Solución: `RoutePickerMap` usa la referencia (`ref`) de `MapContainer` y registra/remueve el evento `click` directamente sobre la instancia de Leaflet.
- Verificación: lint específico del mapa y del constructor; `/dashboard` responde HTTP 200.

## 2026-11-20 — Marcadores sin identificación visual

- Síntoma: el mapa mostraba círculos, pero no era evidente cuál era el origen, una parada o el destino.
- Solución: se añadieron etiquetas visuales `A`, `1..n` y `B`, además del estado “Ubicando...” en el panel del mapa.

## 2026-11-20 — Build bloqueado por dependencias y tipos existentes

- Síntomas: faltaba `embla-carousel-react`; había errores de tipos en `DriverRouteMap`, `aspect-ratio`, `calendar` y `carousel`.
- Soluciones aplicadas: se añadió la dependencia faltante y se corrigieron tipos puntuales sin cambiar la lógica de negocio.
- Soluciones adicionales: se añadieron `@radix-ui/react-collapsible`, `@radix-ui/react-hover-card`, `@radix-ui/react-progress`, `cmdk`, `recharts` e `input-otp`; se corrigieron tipos incompatibles de `react-hook-form`, `recharts` e `input-otp`.
- Verificación: `npm run build` termina correctamente y genera las 11 rutas de la aplicación.

## 2026-11-20 — Lint global heredado (resultado inicial)

- Resultado inicial: `npm run lint` reportaba 86 errores y 27 advertencias en componentes preexistentes.
- Causa: uso extendido de `any`, reglas de pureza de React 19, interfaces vacías y deuda de tipado fuera del constructor de rutas.
- Corrección: se tiparon los módulos de mapa, dashboard, autenticación, cliente de flota, vistas de equipo, gráficos y componentes auxiliares.
- Estado en esa fase: `npm run lint` reportó 0 errores y 14 advertencias; se limpiaron después.

## 2026-11-20 — Lint/type safety del mapa y vista del conductor

- Síntomas: el mapa del conductor y el mapa general tenían respuestas OSRM sin tipo (`any`), lectura de coordenadas con casts inseguros y una actualización de estado sincrónica dentro de un efecto. `DriverView` también tenía imports/estado sin uso y dependencias de efectos incompletas.
- Solución: se tipó la forma de respuesta OSRM y se usaron los DTO `RoutePositionDto`/`RouteApiDto` existentes; se quitó el estado derivado innecesario del efecto del mapa y se usa la ref admitida por React-Leaflet 5. Se limpiaron imports/estado no usados y se corrigieron dependencias.
- GPS simulado: `DriverView` movía artificialmente la posición hacia la primera parada cada tres segundos y usaba esa parada como ubicación actual si faltaba GPS. Se eliminó esa simulación y el fallback planificado. La vista ahora muestra ubicación GPS en vivo, la última ubicación guardada del vehículo o “Sin ubicación GPS”. Sólo la posición recibida por `navigator.geolocation` se registra como una nueva posición; no se cambiaron permisos ni contratos de API.
- Verificación: ESLint focalizado en `DriverRouteMap.tsx`, `DriverView.tsx` y `MapView.tsx`: 0 errores; permanecen advertencias sobre el elemento `<img>` de evidencia y una advertencia informativa de versión de `baseline-browser-mapping`.

## 2026-11-20 — Lint de componentes auxiliares y tema

- Síntomas: ESLint reportaba interfaces vacías en `calendar.tsx` y `checkbox.tsx`, accesos con `any` en `chart.tsx`, `Math.random()` durante el render del esqueleto del sidebar y actualizaciones síncronas de estado dentro del efecto de inicialización del tema.
- Solución: se cambiaron las interfaces sin miembros por alias de tipos; se estrechó `unknown` a registros tipados en la lectura de configuración de gráficos; el ancho del esqueleto se deriva de `useId()` de forma estable; `ThemeContext` ahora observa `localStorage` y `matchMedia` con `useSyncExternalStore` y escribe cambios mediante un callback estable, sin estado local actualizado desde efectos.
- Verificación: `npx eslint src/Components/ui/calendar.tsx src/Components/ui/checkbox.tsx src/Components/ui/chart.tsx src/Components/ui/sidebar.tsx src/Context/ThemeContext.tsx` pasa con 0 errores y 0 advertencias. ESLint imprime únicamente el aviso informativo de que `baseline-browser-mapping` está desactualizado.

## 2026-11-20 — Tipado seguro en autenticación y cliente de flota

- Síntoma: ESLint reportaba 24 usos de `any` en `AuthContext.tsx` y `fleetApi.ts`, además de un helper de identificación sin uso.
- Causa: los errores de API y las variantes de coordenadas/JSON se leían mediante casts sin validar; las coordenadas recibían formas camelCase, abreviadas y PascalCase.
- Solución: se modeló el error de petición y se estrechó `unknown` antes de leer estado, mensaje o errores de validación; los puntos de ruta usan una forma explícita y el JSON se parsea como `unknown` para validar cada elemento antes de normalizarlo. Se eliminó el helper sin referencias.
- Seguridad y comportamiento: no se aflojó ESLint ni se añadió `any`; las respuestas con elementos mal formados se descartan de forma segura y se conservan los nombres/campos de coordenadas admitidos.
- Verificación: `npx eslint src/Context/AuthContext.tsx src/services/fleetApi.ts` finaliza sin errores ni advertencias de archivo. ESLint imprime el aviso informativo de que `baseline-browser-mapping` está desactualizado.

## 2026-11-20 — Lint focalizado de vistas de flota y equipos

- Archivos: `RouteHistory.tsx`, `RoutesMapView.tsx`, `SuperAdminView.tsx`, `TeamDetailsView.tsx` y `TeamManagement.tsx`.
- Síntomas: ESLint detectaba 27 errores por `any` y una llamada a `Date.now()` dentro de la función de exportación durante el render.
- Solución: se tiparon las evidencias del historial con `RouteEvidence`, la respuesta de OSRM con una interfaz explícita y las colecciones de rutas/vehículos con sus modelos existentes. El usuario editado en gestión de equipo ahora tiene un tipo mínimo con permisos. La hora del nombre de respaldo se obtiene desde el callback del clic de exportación. También se retiraron dos imports sin uso.
- Verificación: ESLint focalizado terminó con 0 errores y 1 advertencia preexistente por el elemento `<img>` de evidencia en `RouteHistory.tsx`; imprime además el aviso informativo de `baseline-browser-mapping` desactualizado. `git diff --check` pasó.

## 2026-11-20 — Eliminación de `any` en contexto y dashboard

- Síntoma: ESLint detectaba accesos `any` en el manejo de errores y DTO de FleetContext, en la consulta del permiso de geolocalización, y en los shims globales de Leaflet/React-Leaflet.
- Solución: se declararon contratos concretos para errores de API y coordenadas PascalCase; se tipó la consulta del permiso `geolocation`; y se reemplazaron los shims permisivos por tipos estructurales de Leaflet y props usados por React-Leaflet. No se alteraron reglas de negocio ni flujos.
- Verificación: `npx eslint src/Context/FleetContext.tsx globals.d.ts src/Components/FleetDashboard.tsx` termina con 0 errores. Persisten dos advertencias preexistentes por las dependencias de `refreshRoutes` y `refreshDrivers` en efectos, además del aviso informativo de `baseline-browser-mapping` desactualizado.

## 2026-11-20 — Lint global final de primera iteración (histórico)

- Resultado de aquella fase: 0 errores y 14 advertencias. La verificación final actual pasa limpia.

## Regla de trabajo

No se debe marcar una tarea como terminada si falla el build, si el endpoint principal no responde o si el flujo crítico no fue probado manualmente.

## 2026-11-20 — Vulnerabilidades de dependencias frontend — RESUELTO

- Hallazgo: `npm audit` detectó una vulnerabilidad crítica y varias altas en Next.js y dependencias transitivas.
- Solución: `npm audit fix` actualizó el lockfile; Next resuelve a 16.4.6.
- Error durante la reparación: el build falló inicialmente en `ui/form.tsx` por las declaraciones de react-hook-form. Se ajustó el wrapper a `React.ComponentProps<typeof Controller>`.
- Verificación: `npm audit` reporta 0 vulnerabilidades; `npm run build` y `npm run lint` terminan correctamente.

## 2026-11-20 — Nueva versión del plugin de React Hooks cambió reglas del lint — RESUELTO

- Síntoma: al reinstalar dependencias, npm seleccionó `eslint-plugin-react-hooks` 7.1.1 y el lint pasó de limpio a 14 errores de reglas nuevas.
- Solución: se fijó la versión 7.0.1 que estaba en el lockfile y con la que las fuentes actuales pasan lint; Next.js conserva la versión 16.4.6.
- Verificación: `npm run lint`, build y `npm audit` pasan; 0 vulnerabilidades.

## 2026-11-20 — Diagnósticos de lint corregidos

- Resultado previo documentado quedó desactualizado: marcaba 14 advertencias.
- Solución: se atendieron warnings de dependencias de efectos, catch sin uso, SVG generado e imágenes de evidencia.
- Verificación actual: `npm run lint` termina sin diagnósticos.

## 2026-11-20 — Operación/evidencia de paradas no llegaba desde Driver — RESUELTO

- Síntoma: la interfaz sólo guardaba evidencias en estado local y los cambios de ruta usaban el endpoint de edición, que no es el contrato para transiciones operativas.
- Solución: Driver llama endpoints de evidencia/estado por índice, reconsulta API; el estado de ruta usa `/status`. El backend valida la transición y evidencia antes del cierre.
- Hallazgo adicional: la edición frontend serializaba puntos sin `operation`; se agregó el campo y el mapper de endpoints conserva evidencia de origen/destino.
- Verificación: build/lint, backend 30/30 y prueba real HTTP/MySQL de recogida, entrega, notas, GPS y cierre.

## 2026-11-20 — Fixtures iniciales de QA no cumplían formato esperado — RESUELTO

- Error de herramienta: `utf-utf-8-sig` no es un codec válido; se corrigió a `utf-8-sig`.
- Error de dato: la primera placa QA superaba la longitud de columna y MySQL rechazó la inserción; se usó una placa corta válida.
- Error del fixture de ruta: sólo mandaba puntos intermedios cuando el endpoint espera origen + paradas + destino; se corrigió el payload. No quedaron filas QA.

## 2026-11-20 — Indicadores de dashboard/login eran cifras ficticias — RESUELTO

- Hallazgo visual con Chrome headless: panel mostraba `+12%`, `+8 esta semana`, “Completadas Hoy” aunque no existían series temporales, y el login afirmaba 99.9% y +2k usuarios sin fuente.
- Solución: se quitaron cifras no sustentadas, se muestran subtítulos cualitativos y “Rutas Completadas / Total registrado”.
- Verificación: inspección de dashboard autenticado y página de login desktop/móvil; datos visibles de inventario vienen de API.

## 2026-11-20 — API local reiniciada durante revisión de navegador — RESUELTO

- Síntoma: durante el reinicio de backend para probar el binario final, Next registró errores de proxy `ECONNREFUSED` y Chrome mostró el panel de desarrollo con incidencias.
- Solución: se levantó el backend final en `127.0.0.1:5048` y se repitió la sesión del navegador; APIs protegidas respondieron como se esperaba.
- La captura reveló además el texto de rendimiento estático “Excelente” para choferes; fue reemplazado por el conteo real de paradas completadas.

## 2026-11-20 — Limpieza de tendencia falsa dejó un import de icono ausente — RESUELTO

- Síntoma: al quitar el icono `TrendingUp` del dashboard general, ESLint detectó que aún se usaba en la tarjeta del conductor.
- Solución: la tarjeta ahora usa `CheckCircle` y muestra el número real de paradas completadas.
- Verificación: se vuelve a ejecutar lint/build global al cierre.

## 2026-11-20 — Constructor abría mapa sin objetivo seleccionado — RESUELTO

- Síntoma: al entrar al paso 2, el mapa decía “Selecciona un punto” y el clic se ignoraba hasta que el usuario activara manualmente Origen.
- Solución: al avanzar por primera vez a Recorrido, Origen queda seleccionado y el mapa muestra “Ubicando origen” + instrucción de clic.
- Verificación con Chrome headless: avanzar al paso 2 seleccionó origen; un clic real en el mapa fijó coordenadas visibles y dibujó el marcador `A`.

## 2026-11-20 — Alta de chofer duplicaba el registro y ocultaba fallo SMTP — RESUELTO

- Síntoma: la gestión de equipo enviaba la creación del usuario y luego intentaba crear otro Driver, aunque el backend ya lo asociaba; el correo también podía hacer fallar toda la operación.
- Solución: el formulario envía nombre/documento/teléfono a una sola creación; elimina la segunda inserción y muestra advertencia cuando la API informa `invitationSent=false`.
- Verificación: lint/build frontend pasan; E2E API/MySQL mostró un Driver único con datos correctos y fallo SMTP comunicado sin fingir entrega.

## 2026-11-20 — Desasignación desde Gestionar choferes devolvía 415 — RESUELTO (frontend + backend)

- Reproducción real en navegador: tras asignar un vehículo, `Quitar` fallaba con `Unsupported Media Type`.
- Causa en backend: el middleware exigía `Content-Type: application/json` para PUT aun si no tenía cuerpo; el endpoint de desasignación no recibe cuerpo.
- Solución en backend: validar Content-Type JSON sólo en métodos mutantes que llevan body, usando parseo MIME exacto. Se agregaron tres pruebas automatizadas.
- Verificación: prueba de navegador repetida después de reiniciar backend; se desasignó y se mostró `Sin vehículo`. Backend: 33/33 tests.

## 2026-11-20 — Operaciones de rutas para Logistics recibían 403 — RESUELTO (backend)

- Revisión de roles encontró que la UI habilita creación de rutas para Logística, pero las policies nombraban `Dispatcher`; además, el rol Logistics permitido por la API no estaba creado por el seeder.
- Backend alineó las policies al rol `Logistics` y añadió su seed. La suite backend quedó en 35/35; prueba real confirmó Logistics 200 en listado de rutas y User 403.

## 2026-11-20 — Selector de rol no activado por fixture de navegador — RESUELTO (QA)

- Síntoma: el primer script intentó crear un Manager sin cambiar la opción Driver; la validación respondió correctamente que al chofer le faltaban documento y teléfono.
- Solución de prueba: localizar la tarjeta por texto visible y comprobar que quedó seleccionada antes de enviar.
- Verificación: crear Manager, cambiar a Logistics, validar persistencia tras reload y activar/desactivar desde UI; registros QA borrados.

## 2026-11-21 — Driver no podía iniciar su ruta y no veía el vehículo — RESUELTO (backend + frontend)

- La vista Driver mostraba `Iniciar Ruta` pero `PUT /Routes/{id}/status` respondía 403; además, la tarjeta de vehículo estaba vacía porque Driver no consulta el inventario completo.
- Backend permite cambio de estado sólo al Driver asignado y enriquece RouteDto con resumen seguro del vehículo; frontend muestra ese resumen como fallback.
- Chrome móvil 390×844 completó inicio, evidencia persistente, parada y ruta; vehículo volvió a disponible. Segundo Driver del tenant fue bloqueado (403 detalle/404 estado) y no hubo overflow.
- Error del fixture corregido: el login devuelve `token`, no `accessToken`; los QA fueron eliminados tras verificar persistencia en API/MySQL.

## 2026-11-21 — Fixture responsive perdió viewport y el primer clic quedó fuera del mapa — RESUELTO (QA)

- Durante la prueba tablet, Chrome DevTools restauró temporalmente su ventana base de 780×437 al cambiar de navegación; las coordenadas del primer clic quedaron fuera del mapa visible y no crearon marcador.
- Solución del fixture: reaplicar 768×1024 justo antes de medir, desplazar el mapa al centro, recalcular su rectángulo visible y hacer el clic en un punto no cubierto por el panel de búsqueda.
- Verificación: origen A y coordenadas `-0.28152, -78.39294`, 768 px de viewport y document scrollWidth 768. La cuenta QA se eliminó.
- Un intento de preparar ese fixture recibió conexión rechazada porque el backend local se había detenido; se reinició, se verificó HTTP y luego se repitió el alta sin error.

## 2026-11-21 — Alta de vehículo incluía coordenadas ficticias y panel mostraba avisos de muestra — RESUELTO

- Hallazgo: el formulario de vehículo agregaba Lima (`-12.0464, -77.0428`) como ubicación inicial aunque el servidor no la persistía; el panel de notificaciones mostraba avisos inventados y una acción inerte sin API de notificaciones.
- Solución: el alta no asigna ubicación hasta recibir GPS real; el panel presenta un estado vacío honesto.
- Verificación: lint/build frontend repetidos con el cambio final.

## 2026-11-21 — Equipo confirmaba cambios aunque la API fallara y permisos eran sólo locales — RESUELTO

- Hallazgo: activar/desactivar y cambiar rol mostraban éxito incluso cuando las llamadas fallaban; los permisos individuales se guardaban sólo en React/localStorage y el backend autoriza por rol.
- Solución: las acciones reportan éxito o error según respuesta real; se quitó la edición de permisos que nunca persistía y se aclara que el acceso deriva del rol del servidor.
- Error durante verificación: la primera compilación encontró que el nuevo manejador invocaba `resolveApiMessage`, utilidad que sólo existe en FleetContext; se reemplazó por `getApiRequestError` disponible en AuthContext.
- Verificación: lint/build final pasaron; el ciclo Admin de rol y activación/desactivación ya se comprobó en API/UI en la sesión actual.

## 2026-11-21 — Nombre del equipo se guardaba sólo en el navegador — RESUELTO EN UI

- Hallazgo: Perfil persistía `teamName` en localStorage y mostraba éxito; Equipo detallado abría un editor cuyo botón sólo mostraba “actualiza desde backend”. No hay entidad/API de empresa para persistir ese campo.
- Solución: se retiró la edición local/inoperante y quedó el nombre derivado del gerente o el valor recibido por API. El helper de localStorage de usuarios ya no existe.
- Límite funcional pendiente: crear una configuración de empresa persistida requiere un modelo/API de organización; no se presenta como guardado.

## 2026-11-21 — Gestión de conductores no permitía editar ni dar de baja — CORREGIDO

- Hallazgo: el formulario sólo creaba y asignaba; el perfil Driver no podía corregirse ni desactivarse desde el equipo.
- Solución: se conectó edición de datos y baja/reactivación lógica con filtros de activos; la baja desasigna el vehículo y se rechaza mientras haya una ruta en curso. El acceso Driver a rutas requiere perfil activo.
- Verificación: lint/build frontend y suite backend se repiten con el código final; se agregó cobertura de dominio y prohibición de baja durante ruta activa.

## 2026-11-21 — Usuarios desactivados desaparecían tras recargar y no podían reactivarse — CORREGIDO

- Hallazgo: `GET /Users/my-team` sí devuelve inactivos, pero AuthContext los filtraba; la interfaz ofrecía reactivar sólo antes de recargar.
- Solución: se conserva el estado de todos los miembros en el contexto y el selector de vínculo de conductor limita opciones a usuarios activos.
- Las opciones de asignación de rutas también excluyen usuarios inactivos, aunque permanezcan visibles para que un administrador los reactive.
- Verificación: lint/build frontend al cierre.

## 2026-11-21 — Reactivar conductor oculto no era posible desde la lista — CORREGIDO

- Hallazgo al revisar el nuevo flujo: al dar de baja, el estado local quitaba la fila aun cuando estuviera visible el filtro de inactivos.
- Solución: conserva la fila con `isActive=false`; la vista filtra sólo activos por defecto y vuelve a consultar todos para permitir reactivación.
- Verificación: frontend lint/build final en verde y tests backend de reglas de baja.

## 2026-11-21 — Constructor permitía elegir Logistics/Manager como conductor — CORREGIDO

- Hallazgo: el selector de rutas incluía Logística/Gerente y usaba el ID de usuario como fallback, aunque el API requiere un Driver real con perfil.
- Solución: lista sólo usuarios activos con rol Driver y `driverId` válido; los perfiles se sincronizan/desactivan al cambiar el rol.
- Verificación posterior: lint/build y pruebas de cambio de rol completados; los E2E Chrome documentados en `docs/TESTING.md` confirman persistencia del rol y visibilidad por permiso.

## 2026-11-21 — `User` heredaba permisos de Logistics — CORREGIDO

- Síntoma: la API mapea el rol `User` a 403 para flota, pero el contexto lo presentaba como `logistica`, con acceso visual al mapa y rutas.
- Solución: `User` ahora es `usuario` con permisos operativos falsos, no carga endpoints de flota y recibe una vista que informa que la cuenta no tiene acceso operativo.
- Verificación: lint/build; el dashboard administrativo no muestra métricas inventadas para esa cuenta.

## 2026-11-21 — Crear ruta podía confirmar éxito con vínculo de vehículo fallido — CORREGIDO

- Síntoma: la UI creaba ruta y después intentaba asignar vehículo al Driver; el helper absorbía el error.
- Solución: CreateRoute/UpdateRoute guardan vínculo Driver-vehículo y ruta en la misma unidad de trabajo; se retiró el segundo request frontend.
- Verificación: nuevo `CreateRouteCommandTests` usa EF InMemory y confirma persistencia conjunta; suite 43/43.

## 2026-11-21 — Estados vacíos ocultaban errores API y faltaban filtros — CORREGIDO

- Síntoma: errores de carga sólo iban a consola, el dashboard mostraba cero y la lista no filtraba por conductor/vehículo/estado.
- Solución: se conserva estado de error por recurso, se muestra aviso y reintento; se agregan búsqueda y filtros operativos.
- También se previene doble envío, se conserva el diálogo de borrado si falla API y se muestra su mensaje.
- Verificación: ESLint y build de Next correctos.

## 2026-11-21 — Vista `Super Admin` afirmaba alcance global y evaluaba el resultado de alta como booleano — CORREGIDO

- Síntoma: recursos `/Users/my-team` del propietario se rotulaban como globales; `createUser` devuelve objeto `{ok, invitationSent}` y el objeto siempre es truthy.
- Solución: se rotula como datos de empresa y se evalúa `result.ok`; la UI informa si la invitación SMTP falló.
- Verificación: frontend lint/build completados.

## 2026-11-21 — Proxy local indicaba puerto backend 5046 — CORREGIDO

- Solución: default local actualizado a 5048; configuración explícita `FLETFLOW_API_URL` continúa teniendo precedencia.
- Verificación: build y respuestas HTTP del frontend/API local.

## 2026-11-21 — Restauración de sesión confiaba en rol cacheado localmente — CORREGIDO

- Hallazgo: al recargar, AuthContext aceptaba el perfil de `localStorage` y sólo revalidaba ciertos conductores; un rol/permiso obsoleto podía controlar la navegación.
- Solución: tokens con forma inválida se limpian y el perfil/rol sólo se restaura desde `/Auth/me`; si el backend no valida la sesión, se borra.
- Límite pendiente: tokens siguen almacenados en `localStorage`; la migración a cookies HttpOnly requiere soporte BFF/backend.
- Verificación: lint y build de producción completos tras el cambio.

## 2026-11-21 — Estado de flota podía quedar visible al cambiar de cuenta — CORREGIDO

- Riesgo: los estados React de rutas/vehículos/conductores persistían durante logout y cambio de usuario en la misma pestaña.
- Solución: `FleetContext` limpia colecciones/errores al cambiar el `user.id` y sólo expone datos asociados a la cuenta actual.
- Verificación: lint/build completos; el backend mantiene los filtros de tenant como límite de seguridad.

## 2026-11-21 — Campo de nombre de parada invisible en móvil — CORREGIDO

- El E2E de alta desde mapa creó la parada, pero el nombre no se podía editar a 390 px porque el selector de operación y los botones reducían el campo a ancho cero.
- Se aplicó `flex-wrap` a la fila y un ancho mínimo de 130 px al área de nombre.
- Verificación: ruta con dos operaciones, cuatro puntos persistidos y borrado desde UI; suite Chrome/API/MySQL 7/7.

## 2026-11-21 — Selector de vehículo E2E se montó antes del fixture — CORREGIDO EN EL TEST

- El test dio de alta un vehículo por API después del montaje de `FleetContext`; el selector conservó la lista anterior y no ofrecía el vehículo QA.
- Se recarga la aplicación después de crear el fixture y antes de abrir el constructor.
- Verificación: E2E autenticado 7/7 y MySQL limpio.

## 2026-11-21 — Runner Playwright exige servicios iniciados — DOCUMENTADO

- La primera ejecución se detuvo en el precheck HTTP porque el frontend no estaba levantado. Aún no había provisionado fixtures.
- Se inició Next en `127.0.0.1:3000`; la siguiente ejecución terminó 7/7 y el cleanup retiró los registros QA.

## 2026-11-21 — Contrato de consulta de posiciones cross-tenant y estado previo — CORREGIDO EN EL TEST

- El primer assert esperaba 404 en `GET /Routes/{id}/positions`; el endpoint devuelve 200 con colección vacía porque el filtro global oculta posiciones de otra empresa. No había fuga de datos. Se actualizó la prueba para exigir `[]` en B y una posición visible para A.
- El fixture recibió HTTP 400 al crear posición sobre ruta pendiente; la regla de negocio sólo permite GPS en ruta en progreso. Se añadió transición real a InProgress antes de registrar la posición.
- El Driver QA aislado no estaba ligado a una cuenta, lo que volvió frágil la vista de Equipo en la ejecución fallida. Se reutilizó el Driver QA vinculado que crea el runner.
- Verificación: HTTP/MySQL comprobó aislamiento de Vehicles, Drivers, Routes y posiciones, y la suite completa pasó 8/8; cleanup sin filas QA.

## 2026-11-21 — Runner autenticado dependía de Docker exec local — CORREGIDO

- Causa: `scripts/run-e2e-local.sh` usaba `docker exec mysql-gps`, que no existe en GitHub Actions aunque el job tenga un servicio MySQL accesible en loopback.
- Solución: cliente MySQL del host con `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PWD` y `DB_NAME`; cargar `.env` sólo en local si `DB_NAME` no está inyectada; rechazar bases fuera de `fletflow_ci*` con `CI=true`.
- Verificación: Chrome/API/MySQL autenticado pasó 8/8 contra una DB descartable; cleanup confirmado y esquema de prueba eliminado.

## 2026-11-21 — Primera preparación E2E no exportó MYSQL_PWD — CORREGIDO EN LA INVOCACIÓN

- El cliente host rechazó `root` con `using password: NO` antes de crear el esquema temporal. No se detuvo la API ni se escribieron datos.
- Se exportó `MYSQL_PWD` y se repitió el E2E completo en una DB nueva: 8/8 y fixtures limpiados. La API principal se reinició y quedó saludable.

## 2026-11-22 — E2E frontend de Actions abortó porque Playwright aún no había iniciado Next — CORREGIDO

- El primer workflow pasó checkout cruzado, backend, npm audit/lint/build y prueba responsive; el runner final falló en su precheck HTTP porque esperaba el frontend ya disponible, aunque en CI `playwright.config.ts` lo inicia como `webServer`.
- Se cambió el precheck: API obligatoria siempre; URL frontend obligatoria sólo en ejecución local. En CI se deja que Playwright inicie Next.
- GitHub Actions también avisó que checkout/setup-dotnet/setup-node usaban runtime Node 20. Se actualizaron a checkout v7, setup-dotnet v6 y setup-node v7 (runtime Node 24).
- Pendiente repetir el workflow remoto para comprobar el arreglo.

## 2026-11-21 — E2E móvil del mapa aceptaba una parada sin coordenadas — CORREGIDO

- El escenario esperaba cuatro puntos, pero llegaba al resumen con tres. La aserción usaba el padre DOM incorrecto, así que no detectaba `NaN, NaN` en la fila de una parada.
- Solución: cada tarjeta tiene `data-testid`; la prueba desplaza el mapa a la vista antes de calcular el clic, evita marcadores y rechaza coordenadas pendientes o `NaN`. Leaflet cancela movimientos previos y recentra sin animación; el handler conserva el target actual durante los renders.
- Verificación: Chrome/API/MySQL autenticado, bases descartables `fletflow_ci_validation_06` y `fletflow_ci_validation_07`: **8/8** en ambas ejecuciones; los cuatro puntos y operaciones se persistieron y cleanup eliminó la base.

## 2026-11-21 — Preparación local de E2E usó rutas y contratos incorrectos — CORREGIDO

- Se apuntó al directorio incorrecto del DLL; corregido a `Back_GPS/bin/Release/net8.0`. El runner sólo acepta `FLETFLOW_API_URL` sin `/api`; se configuró `http://127.0.0.1:5048`. Para que Playwright iniciara Next como en CI se usó `CI=true`.
- Cambios intermedios del API de mapa dejaron un build inválido por tipos Leaflet incompletos y un lint por mutar refs durante render. Se completaron los tipos locales y la actualización de refs pasó a `useLayoutEffect`; lint/build quedaron limpios.
- Los intentos usaron exclusivamente las bases `fletflow_ci_validation_06` y `fletflow_ci_validation_07`, eliminadas por `trap`; no se alteró la base local normal.

## 2026-11-21 — Primer test tablet esperaba un título inexistente — CORREGIDO EN EL TEST

- La prueba esperaba el encabezado “Gestión de Rutas”, pero esa vista usa “Rutas”; el nombre “Gestión de Rutas” corresponde al botón de navegación.
- Se alineó la aserción al título real observado en `RoutesManagement.tsx`; no era un error de producto.

## 2026-11-21 — Fallos al cargar Equipo se ocultaban como estados vacíos — CORREGIDO

- `/Users/my-team` capturaba el error y dejaba la colección vacía, que la pantalla presentaba como “No hay otros miembros”. El fallo de `/Drivers` se propagaba sin `finally`, así que el indicador podía quedarse cargando.
- Solución: AuthContext propaga fallos de equipo; TeamManagement muestra errores separados con botón Reintentar, y ambas cargas liberan su estado en `finally`. Un refresh fallido después de crear usuario ya no informa erróneamente que la creación falló.
- Verificación: nuevo Playwright intercepta 503 en ambos endpoints, comprueba que no aparezca el estado vacío y repite la carga con 200. Suite completa Chrome/API/MySQL: **12/12**.

## 2026-11-21 — Cobertura automatizada omitía tablet y roles Driver/Logistics — CUBIERTO

- Se añadieron pruebas de navegación/overflow a 768×1024, menú de Driver y denegación API, y menú de Logistics con rutas permitidas y vehículos/equipo denegados.
- El primer test tablet esperaba “Gestión de Rutas” como heading, pero la vista se titula “Rutas”; se corrigió la aserción tras revisar el DOM real.
- Verificación final de la suite extendida: Chrome/API/MySQL **12/12**; SQL cleanup removió los fixtures de la base efímera.

## 2026-11-22 — Preparación de E2E local pasó `/api` al runner como origen — CORREGIDO EN LA INVOCACIÓN

- El runner exige `FLETFLOW_API_URL=http://127.0.0.1:5048` (origen), mientras que el cliente/frontend agrega `/api` o usa el proxy `/api/backend`. La primera invocación incluyó `/api` y abortó en la validación previa, antes de instalar el cleanup o crear fixtures.
- La API sólo inició sobre `fletflow_ci_validation_15`; el `trap` externo la detuvo y descartó el esquema. La repetición usa el origen sin `/api`.

## 2026-11-21 — Historial asociaba mal conductores y fechas — CORREGIDO

- La vista intentaba resolver `Route.driverId` sólo contra `User.id`, aunque el modelo de equipo expone `driverId`; las fechas planificadas aparecían como creación/inicio reales aunque el contrato no tiene `createdAt` y `startedAt`/`endedAt` son campos distintos.
- Solución: resolver por `driverId` con fallback a `id`, etiquetar `plannedStart`/`plannedEnd` como planificados y mostrar inicio/cierre real sólo con `startedAt`/`endedAt`. El error de carga ahora muestra alerta y permite reintentar sin presentar un vacío falso.
- Se ajustó `RouteApiDto` para reflejar fechas planificadas nullable y timestamps reales opcionales. E2E valida nombre de conductor en tarjeta/detalle, etiquetas y error 503→retry.

## 2026-11-21 — Cobertura E2E omitía filtros de rutas y asignación de vehículo — CUBIERTO

- Se añadieron filtros combinados de estado, vehículo y conductor, búsqueda sin coincidencia y limpieza de filtros a la prueba de rutas.
- El flujo de Conductores ahora crea un vehículo real, asigna/quita el vehículo desde la UI y comprueba vía API que `vehicleId` persiste y luego queda `null`.
- Suite Playwright completa local: **13/13** en Chrome con frontend, API y MySQL; base desechable `fletflow_ci_validation_16` eliminada por cleanup. `npm run lint` y `npm run build` finalizaron correctamente.

## 2026-11-21 — Runner local recibió URL de API con `/api` — CORREGIDO EN LA INVOCACIÓN

- El runner valida `FLETFLOW_API_URL` como origen HTTP, pero la invocación inicial incluyó `/api` y terminó antes de cargar fixtures. Se repitió con `http://127.0.0.1:5048`; la base temporal inicial `fletflow_ci_validation_15` fue descartada y la suite pasó en `fletflow_ci_validation_16`.

## 2026-11-21 — Rol visual Super Admin no existe en el contrato backend — PENDIENTE DE DEFINICIÓN DE PRODUCTO

- El contrato backend actualmente expone Admin, Driver, Manager, User y Logistics; no hay rol SystemAdmin/SuperAdmin ni permisos de plataforma globales. La interfaz no puede validar de forma real ese escenario y no debe elevar Admin ni inventar un rol.
- Hace falta definir si se requiere administración global multiempresa y diseñar ese rol y sus controles en backend antes de añadir una prueba de autorización Super Admin. Los roles existentes sí se prueban en los recorridos cubiertos.

## 2026-11-22 — E2E de Dashboard sin fixture `request` — CORREGIDO

- El build de producción detectó TS2552: la nueva comprobación de KPIs consultaba Routes/Vehicles por API, pero el test sólo recibía `page`.
- Solución: inyectar el fixture `request` de Playwright en la firma del test. Después pasan lint, build, discovery (18) y `git diff --check`.
- Prevención: al ampliar un test para API, declarar explícitamente los fixtures usados en el callback.

## 2026-11-22 — `PlannedStart` se mostraba como fecha de creación — CORREGIDO EN FRONT; API EN VALIDACIÓN

- Gestión de Rutas llamaba “Creada el” a la fecha planificada y, si no existía, FleetContext inventaba `new Date()`; el backend no guardaba CreatedAt y `/Routes` no garantizaba orden cronológico.
- Front ahora consume `createdAtUtc`, no fabrica fechas para registros legacy, muestra “No registrada” cuando falta y ordena actividad por fecha de creación o timestamps reales de operación.
- El E2E de rutas creadas exige `createdAtUtc` y el dashboard compara cifras/primera actividad con API. Lint/build/discovery 18 pasan. La migración/MySQL y Actions integrada quedan pendientes.
- Prevención: no etiquetar fechas planificadas como eventos reales ni generar timestamps de respaldo en mapeadores.

## 2026-11-21 — Alta de usuario convertía cualquier fallo en “usuario duplicado” — CORREGIDO

- `createUser` devolvía sólo `ok=false`, y Gestión de Equipo mostraba “El nombre de usuario ya existe” aunque la API respondiera otro error. Se propaga el mensaje de servidor como parte del resultado y cada formulario lo muestra con un fallback genérico.
- Playwright simula HTTP 409 con “El correo ya está registrado” y comprueba que no se muestre el diagnóstico de duplicado de usuario equivocado.

## 2026-11-21 — No existía flujo para recuperar vehículos dados de baja — CORREGIDO

- El backend conservaba el registro, pero el listado sólo mostraba activos y no ofrecía endpoint ni acción para reactivar.
- Se agregó `POST /api/Vehicles/{id}/reactivate`, con lock de vehículo y validación de rutas en curso; Gestión de Vehículos muestra bajas, errores/reintento y acción Reactivar. El E2E valida baja, consulta `isActive=false`, reactivación y persistencia `isActive=true`.
- Smoke local API/MySQL y Playwright móvil verificaron el ciclo completo.

## 2026-11-21 — Desactivar cuenta no invalidaba sesiones y operaciones de ruta permitían estados contradictorios — CORREGIDO

- Baja de usuario no revocaba refresh tokens y una ruta podía aceptar JWT de cuenta desactivada. Ahora se revocan todos los refresh al desactivar y JWT verifica la cuenta activa al validar cada solicitud; `/Auth/refresh` también rechaza cuentas inactivas.
- Iniciar ruta comprueba `Vehicle.IsActive`; no se permite dar de baja una ruta en progreso, desasignar un Driver durante ruta en progreso ni dar de baja vehículos con asignación de conductor/ruta pendiente o en curso. Las mutaciones de estado/evidencia de paradas serializan por lock de ruta para no sobrescribirse.
- Smoke HTTP/MySQL real comprobó access/refresh inválidos tras baja, 409 ante bajas/desasignaciones conflictivas, rechazo de inicio con vehículo inactivo y persistencia de dos actualizaciones concurrentes a paradas distintas.

## 2026-11-21 — Validación local de estabilización encontró fallos del harness — CORREGIDOS

- El primer arranque API encontró `DB_PASSWORD` distinto de `MYSQL_ROOT_PASSWORD`; la CLI podía conectar pero la app no. La prueba aislada pasó `DB_PASSWORD` por entorno igual a la credencial activa, sin cambiar el `.env` ni mostrar valores.
- Una primera repetición usó el DLL previo al último cambio del comando de desactivación y observó HTTP 200 con la cuenta todavía activa. Se recompiló desde el código actual y la repetición confirmó 401 para access y refresh.
- El primer smoke de bajas excedió el máximo de longitud de Plate; se cambiaron las placas/documentos QA a sufijos breves. La repetición final de ambos smokes pasó.
- Una primera suite completa dio 13/14: el test de Historial activaba el mock 503 mientras aún había un GET `/Routes` inicial en curso, por lo que el fallo podía consumirse antes de entrar a Historial. Se espera explícitamente la respuesta inicial, `networkidle` y luego la respuesta 503/200 del flujo Historial. Caso aislado y suite final 14/14.

## 2026-11-21 — Pruebas E2E de rol Usuario asumieron un nombre accesible y contrato incorrectos — CORREGIDO

- El selector `getByRole(button, {name:"Usuario", exact:true})` no encontraba la tarjeta porque su nombre accesible incluye también la descripción. Se inspeccionó el snapshot DOM y se usó una expresión regular que valida el prefijo del nombre completo.
- La prueba de persistencia buscaba `member.role`; `/Users/my-team` entrega `roles: string[]`. Se alineó la aserción al DTO real y se comprobó que la lista contiene `User`.
- Verificación tras ambas correcciones: suite Playwright autenticada Chrome/API/MySQL **14/14**, incluyendo alta UI y lectura persistida. Base efímera eliminada.

## 2026-11-22 — E2E de Driver esperaba 204 para estado de parada y dejó una ruta activa — CORREGIDO Y VERIFICADO

- El endpoint `PUT /Routes/{id}/points/{index}/status` responde `200` con la ruta, mientras que el test esperaba `204`. La aserción queda alineada al contrato observado en el controlador.
- Al fallar la aserción antes de completar la ruta, quedaba una ruta InProgress en el MySQL de esa ejecución. El retry y el test cross-tenant intentaban usar el mismo Driver y recibían 409 por conflicto de agenda; no fue una regresión de backend.
- Se añadió `finally` que cancela y da de baja la ruta temporal aun cuando falle la prueba. Los nombres/placas mantienen el prefijo del cleanup existente.
- Actions `44984300436` falló sólo en este nuevo caso y en los casos posteriores afectados por ese residuo. La siguiente corrida `44985541718`, SHA `1f3a24c`, terminó success: responsive 1/1 y Playwright autenticado 14/14; cleanup y cross-tenant pasan.

### Causa visual adicional — Leaflet interceptaba el diálogo de evidencia

- El trace de `44984722584` muestra que el diálogo `z-50` quedaba debajo de los controles Leaflet (`z-index` superior), por eso el botón “Nota” era visible pero el mapa interceptaba el clic.
- `DialogOverlay`/`DialogContent` ahora usan capas 2000/2001; el mapa no debe cubrir el modal. La limpieza ahora lee el estado real de la ruta y exige respuesta exitosa al cancelarla y darla de baja, sin tragarse errores.
- Lint/build y discovery pasaron localmente; Actions `44985541718` confirmó el flujo de evidencia/cierre sobre Chrome, API y MySQL efímero.

### Repetición `44985230566` — contrato uniforme del endpoint de parada

- La capa del modal corrigió el clic: CI guardó evidencia y llegó a completar la parada. La respuesta de `PUT .../points/{index}/status` es `200` tanto al iniciar como al completar, pues el controlador devuelve la ruta actualizada. El test todavía esperaba 204 sólo al completar.
- El cleanup pasó: los 13 casos siguientes, incluido el tenant cruzado que antes devolvía 409, quedaron verdes. Se alineó la última aserción a 200; Actions `44985541718` pasó 14/14.

## 2026-11-22 — Cleanup del E2E de paradas dejó un Driver asignado — CORREGIDO

- El E2E que reordena y elimina paradas completó la creación de ruta y las aserciones de persistencia, pero su limpieza recibió HTTP 409 al dar de baja el vehículo.
- Causa: `CreateRoute` asigna el vehículo seleccionado al Driver; borrar la ruta no elimina la asignación del perfil. La limpieza anterior intentaba retirar el vehículo sin restaurar el `vehicleId` original.
- Corrección: capturar la asignación original del Driver y, en `finally`, restaurarla si la ruta temporal la cambió (o desasignar si no había una previa) después de borrar la ruta. Luego se elimina el vehículo temporal y se comprueba el status HTTP.
- Run Actions `44986079119` reveló el problema: el test nuevo falló sólo en cleanup (409 esperado por la guarda real); restante suite pasó. Se capturó/restauró la asignación anterior. Actions `44986497890` para `010bc31` pasó responsive 1/1 y Playwright 14/14.
- Revisión adicional: el primer `finally` podía abandonar pasos de limpieza posteriores tras un error en DELETE/restauración, y no cancelaba una ruta activa. Ahora cada paso se intenta independientemente, las rutas InProgress se cancelan primero y los fallos se acumulan para reportarlos sin ocultarlos. Lint/build/listado pasan. Actions `44986877646` para `aa49b83` validó el flujo normal de cleanup y el E2E 14/14; la rama de cancelación ante fallo no se ejercitó en esta corrida.

## 2026-11-22 — Matriz E2E de roles tuvo un error inicial de tipos — CORREGIDO

- El primer build de la matriz falló con `TS2304: Cannot find name 'MutationCheck'` y `TS2304: Cannot find name 'AuthHeaders'` en `fleet-admin.spec.ts`; ambos tipos habían quedado declarados dentro del test de vehículos, fuera del alcance del test de permisos.
- Corrección: mover los tipos auxiliares al test de la matriz y pasar los headers explícitamente a las factories de operaciones en vez de depender de una variable mutable compartida.
- Verificación local posterior: lint/build pasan y Playwright descubre 15 casos; la matriz HTTP no se ejecutó localmente por falta de servicios/credenciales. Actions `44989454133` para `286b100` confirmó después 15/15 Playwright sin skips, incluidas las denegaciones de rol, contra API/MySQL descartables.
# 2026-11-22 — Búsqueda de auditoría con rutas relativas de otro repositorio — CORREGIDO

- Durante el inventario cruzado se ejecutó `rg` desde el repositorio equivocado usando rutas relativas `BackEnd_Gps`/`src`; `rg` devolvió “No such file or directory” y esos intentos no inspeccionaron archivos ni cambiaron estado.
- Corrección: ejecutar cada búsqueda desde la raíz de su repositorio y usar sus rutas reales (`src` en Front; `fletflow` y `BackEnd_Gps.Tests` en Back). Repetición del inventario Backend encontró el uso esperado de refresh token y ningún TODO/FIXME/NotImplementedException en el alcance buscado.
- Prevención: confirmar `pwd` y `rg --files` del repositorio objetivo antes de búsquedas con prefijos de directorio.

# 2026-11-22 — E2E de ruta tablet expiró antes de cerrar — EN VALIDACIÓN

- Actions `44991979019` pasó build backend (57/57), audit/lint/build frontend y responsive 1/1; de los E2E autenticados, **15 pasaron y el nuevo tablet expiró** al timeout general de 30 s. El `finally` estaba usando `page.request`, ligado al contexto del navegador que Playwright cerró al cortar el test; por eso las consultas de cleanup fallaron sin respuesta. La base era descartable y el runner elimina sus datos QA al finalizar.
- El workflow no publicó el trace de ese fallo, así que el paso de UI que agotó los 30 s no puede afirmarse con evidencia. Corrección aplicada para la repetición: elevar a 90 s el límite total solo de este flujo, limitar esperas de UI a 8 s para obtener locator/paso concretos y usar el fixture independiente `request` en setup, verificación y cleanup para que siga vivo ante errores del page.
- Estado: lint/build/discovery local ya habían pasado el primer SHA; falta repetir Actions con estas correcciones y confirmar 16/16, persistencia tablet y limpieza.

# 2026-11-22 — Selector de navegación móvil usado en tablet — CORREGIDO

- Actions `44992464372` volvió a fallar sólo en el caso nuevo: con viewport 768×1024 la página no renderiza `Abrir menú`; la barra lateral de escritorio/tablet está visible desde el inicio. El timeout de 8 s ahora identificó el locator exacto. Los otros 15 E2E y el cleanup del caso nuevo pasaron.
- Corrección: eliminar la apertura del menú móvil y seleccionar directamente `Gestión de Rutas`, como ya hace el test tablet existente. El request context separado confirmó que cleanup devuelve respuestas aun cuando falla el flujo UI.
- Verificación pendiente: lint/build y Actions integrado del siguiente SHA; contar el test tablet sólo tras completar y persistir la ruta en navegador/API/MySQL.

# 2026-11-22 — El vehículo de prueba no aparecía en el selector — CORREGIDO

- Actions `44992803081` avanzó por el mapa y la revisión tablet, pero agotó 8 s al asignar el vehículo: se creó por API después de la carga inicial del Dashboard, así que `FleetContext` conservó la lista anterior sin ese registro. Los otros 15 E2E pasaron y el fixture temporal sí se limpió.
- Corrección: recargar Dashboard después del POST de vehículo y antes de entrar al constructor, replicando el patrón del E2E móvil ya validado.
- Pendiente repetir Actions: el nuevo caso aún no ha guardado la ruta ni cuenta como aprobado.

# 2026-11-22 — Aserción de revisión buscaba texto que la pantalla no renderiza — CORREGIDO

- Actions `44993132771` completó los pasos de mapa y asignación, pero falló al buscar el nombre de parada dentro de “Revisa y crea”. El componente de revisión muestra el conteo de puntos, origen/destino y recursos; no lista nombres individuales de paradas en esa etapa.
- Corrección: comprobar `3 puntos` en la fila Recorrido y mantener la verificación del nombre y `PickupAndDelivery` en el GET de ruta guardada, que sí es la fuente persistida.
- Los otros 15 E2E y cleanup pasaron. La ruta del test tablet no se guardó; la siguiente ejecución debe verificar creación/persistencia antes de contar el caso.

# 2026-11-22 — Ruta E2E tablet no coincidía con el prefijo de limpieza MySQL — CORREGIDO

- Actions `44993456874` pasó los **16/16 E2E** (incluida creación/persistencia de la parada tablet) y responsive 1/1, pero el runner terminó fallando al limpiar MySQL. La ruta nueva usaba `E2E QA tablet ...`, mientras `scripts/cleanup-e2e.sql` retira rutas únicamente con `Name LIKE 'E2E QA ruta %'`; el SQL de limpieza conservó la ruta y su vehículo en la DB de ese job.
- Corrección: renombrar el fixture a `E2E QA ruta tablet ...`, para que el cleanup probado incluya esa ruta y elimine en orden Positions→Routes→Vehicles.
- La base pertenece a un servicio MySQL efímero del workflow y se destruye al terminar el job. Repetir CI para demostrar Playwright 16/16 y cleanup SQL exitoso antes de marcar el lote validado.

- Resultado de corrección: Actions `44993827707` completó success con 16/16 Playwright; el cleanup SQL pasó y no reportó fixtures retenidos.

# 2026-11-22 — E2E leyó estado antes de completar PUT `/status` — CORREGIDO EN EL TEST

- Actions `44994219944`: los otros 15 E2E pasaron; el nuevo ciclo vehículo cambió visualmente a Disponible, pero el GET inmediato devolvió todavía `status=2`. El test esperaba cualquier PUT cuyo URL contuviera `/Vehicles/{id}`. `updateVehicle` primero persiste datos generales en `PUT /Vehicles/{id}` y después cambia el estado en `PUT /Vehicles/{id}/status`; el waiter podía resolver en la primera respuesta antes de que terminara la segunda.
- Corrección: esperar el pathname exacto `/status`, verificar HTTP 204 y comprobar el body `{status: 0|2}` antes de hacer GET. Se aserta además el valor elegido en el select. La próxima corrida discriminará claramente una carrera de test de un problema de backend.
- CI de ese SHA falló solo por la aserción de estado; no pasó el test agregado. Repetición integrada pendiente.
- Resultado: Actions `44994623654` pasó el flujo de edición y persistencia de estado del vehículo y toda la suite; la carrera quedó corregida en el test.

## Ampliación Manager positiva — 2026-11-22

- La matriz cubría denegaciones de Manager pero no operaciones permitidas. Se agregó un ciclo autenticado positivo de vehículo y lectura de flota/rutas.
- Actions `44994997016` pasó con 16/16 E2E, responsive 1/1, xUnit 57/57 y cleanup completo. No se detectó error de producto en el flujo permitido de Manager.

## 2026-11-22 — Búsqueda del controlador de posiciones con ruta relativa del repositorio equivocado — CORREGIDO

- Desde Front se intentó consultar `fletflow/Api/Controllers/RoutesController.cs`; esa ruta sólo existe desde la raíz backend y, además, se buscó el nombre de archivo antes de confirmar el inventario. `rg` informó que no encontraba el archivo; no cambió estado.
- Corrección: usar `/home/leonardo/Back_GPS` como `workdir` y `rg --files` para localizar los controladores reales antes de leerlos. No se basó ninguna decisión en el resultado fallido.

## 2026-11-22 — Referencia al controlador de posiciones desde repositorio equivocado — CORREGIDO

- Desde Front se buscó `fletflow/Api/Controllers/RoutesController.cs`, ruta que sólo existe desde la raíz backend. `rg` indicó archivo inexistente y no cambió nada.
- Corrección: cambiar el `workdir` a `/home/leonardo/Back_GPS`, localizar primero con `rg --files` y leer `fletflow/Api/Controllers/RoutesController.cs`. El contrato GET/POST de posiciones se confirmó desde el archivo real.
- Prevención: no asumir rutas relativas entre repositorios; confirmar raíz antes de cada búsqueda cruzada.

## 2026-11-22 — GPS móvil consumía la ventana de envío mientras la ruta estaba pendiente — CORREGIDO

- Actions `44995899244` ejecutó backend Release y checks frontend, pero terminó 14/16 E2E. El nuevo flujo Driver mostró GPS autorizado, pero el efecto registró la marca temporal de 20 s antes de comprobar que la ruta estuviera en progreso. Al iniciar la ruta, ese límite suprimió el POST; el test esperó hasta el timeout de 30 s.
- La expiración cerró el contexto de página y la limpieza dependiente de `page.request` no pudo finalizar. Los retries encontraron la ruta activa que quedó de la primera ejecución y respondieron HTTP 409 en la creación; el test de tenant también vio ese conflicto de recurso compartido.
- Corrección de producto: `DriverView` ahora valida ruta en progreso antes de consumir la ventana de 20 s, por lo que registra la ubicación inmediatamente después de iniciar.
- Corrección de E2E: setup/cleanup usa fixture `request` independiente; `try/finally` ahora envuelve alta de vehículo/ruta y restaura la asignación original del Driver. También se endureció cleanup del caso cross-tenant: cancelar ruta activa, eliminar ruta, restaurar asignación y quitar vehículo.
- Lint/build/discovery 16 y `git diff --check` pasan localmente. La repetición Actions debe confirmar las dos rutas de prueba, GPS POST/GET y cleanup sin fixtures residuales.
- Actions `44996497487` para Front `6fe66f7` + Back `104cda8`: 16/16 E2E, responsive 1/1, xUnit 59/59, audit/lint/build y ejecución completa con cleanup/containers success. Se resolvieron las dos fallas del run anterior.

## 2026-11-22 — Runner backend referido como subdirectorio local de Front — CORREGIDO

- Desde Front se intentó leer `Back_GPS/scripts/run-e2e-local.sh`; ese checkout no está anidado localmente bajo Front. `sed`/`cat` devolvieron archivo inexistente, sin cambiar archivos o datos.
- Corrección: abrir `/home/leonardo/Back_GPS/scripts/run-e2e-local.sh` y `cleanup-e2e.sql` desde la raíz real del backend. La inspección confirma que trap ejecuta cleanup SQL al salir; Actions `44996497487` terminó todos los pasos y detuvo la API/MySQL.
- Prevención: no inferir que el checkout hermano está montado dentro del repositorio frontend; usar la raíz absoluta registrada en AGENTS.md.
- Actions `44997054375` corrigió la validación pendiente: 61/61 xUnit, responsive 1/1 y E2E 16/16; documento duplicado retorna 409 y GET del equipo confirmó ausencia de la cuenta. Job y cleanup finalizaron en success.

## 2026-11-22 — Auditoría responsive con raíces/rutas equivocadas — CORREGIDO

- Durante la revisión de tablet se asumieron rutas de Next (`app/dashboard/routes/history/page.tsx`) y carpetas `app/`/`components/` que no existen en este frontend; también se leyó `e2e/fleet-admin.spec.ts` y `fletflow/Application/...` desde el checkout Backend, aunque las rutas correctas están en Front y la capa backend se llama `Aplication`.
- Los comandos devolvieron “No such file or directory” y no modificaron datos ni archivos. La inspección correcta confirmó `src/Components/fleet/RouteHistory.tsx`, `MapView.tsx`, `RoutesMapView.tsx` y `ProfileView.tsx`; backend `fletflow/Aplication/Fleet/Commands/CreateRouteCommand.cs`.
- Corrección: comprobar la raíz y localizar primero con `rg --files` antes de leer rutas relativas. Se leyó además la guía local de Next 16 sobre interacciones y desarrollo antes de editar el E2E.
- Prevención: mantener separadas las rutas de los repositorios hermano y no inferir la estructura App Router estándar a partir de que el proyecto use Next.

## 2026-11-22 — E2E de tracking tablet pendiente de ejecución integrada — EN VALIDACIÓN

- El inventario independiente encontró que la vista Mapa se abría a 768×1024 sin probar la selección de ruta ni el tracking.
- Se añadió un E2E con dos rutas reales API/MySQL, selección alterna, GET de posiciones y marcador GPS visible; usa geometría OSRM como dependencia visual opcional fallable y mide overflow de documento y `main`.
- `npm run lint`, `npm run build`, `npm run test:e2e -- --list` (17 tests) y `git diff --check` pasan. La ejecución local autenticada no pudo arrancar porque Front `:3000` y API `:5048` devuelven HTTP 000; no se crearon fixtures locales.
- Actions integrada `44997939176` para Front `a5dd689` + Back `a7f7c4e` pasó: Release xUnit 61/61, audit/lint/build, responsive 1/1, E2E **17/17** y cleanup/stop containers success. El caso nuevo quedó incluido; se puede contar como cubierto.
- `run-e2e-local.sh` ejecutó su trap de cleanup SQL sin error; eliminó los prefijos de la cuenta Driver, documento/vehículos y rutas temporales. La base MySQL del job se destruyó al finalizar.
- El mismo código se revalidó con Actions `44998269115` para SHA documental `4f94633`: backend 61/61, responsive 1/1, E2E 17/17 y cleanup success.

## 2026-11-22 — Consulta de estado de Actions con comillas inválidas — CORREGIDO

- Una llamada de diagnóstico `gh run view` combinó una expresión jq con quoting incorrecto y Bash respondió `unexpected EOF while looking for matching \'`; el comando no inició ni modificó ningún proceso o dato.
- Corrección: consultar los campos JSON por separado con expresiones jq entre comillas válidas; la segunda consulta devolvió estado de los workflows correctamente.
- Prevención: simplificar los filtros jq en consultas al CLI y comprobar la cadena shell antes de incluir comillas anidadas.

## 2026-11-22 — Lectura frontend/Actions desde el checkout backend — CORREGIDO

- Al inspeccionar el registro se ejecutó `sed src/Components/RegisterForm.tsx` desde Back y se consultó `gh run view 44998727880` con el repositorio por defecto Back; el archivo relativo no existía y el CLI respondió HTTP 404 porque ese run pertenece a Front. Ninguno de los comandos modificó código ni datos.
- Corrección: consultar `src/...` desde `/home/leonardo/Front_gpsR` y ejecutar `gh` con `workdir` del repositorio que contiene el workflow. El run `44998727880` se confirmó en Front.
- Prevención: para consultas cruzadas, seleccionar expresamente el checkout destino antes de ejecutar rutas relativas o comandos `gh`.

## 2026-11-22 — Registro público y rol mostrado discrepaban — CORREGIDO EN CÓDIGO, CI PENDIENTE

- `/register` ofrecía alta “como Gerente” y el frontend solicitaba Admin, pero el backend forzaba User. El usuario quedaba autenticado sin acceso a la flota de la nueva empresa.
- Backend fija Admin como raíz del nuevo tenant, ignora roles solicitados por el request y limita datos al `owner_id` propio; Front ya no manda roleName y agrega E2E móvil de registro con validación de `/Auth/me` y permisos reales. Esos cambios aún requieren Actions integrado antes de contarlos como verificados.

## 2026-11-22 — Parche de ERROR_LOG Front con contexto de línea desactualizado — CORREGIDO

- Un parche intentó insertar una entrada usando una línea final que ya no coincidía con el archivo; `apply_patch` rechazó la operación sin modificar el documento.
- Corrección: volver a leer el final actual del archivo y aplicar la entrada al final real; el diff confirma que sólo se añadió documentación.
- Prevención: refrescar el contexto del archivo antes de aplicar parches sobre documentación que pudo cambiar durante la sesión.

## 2026-11-22 — Registro exitoso enviaba a login pese a crear sesión — CORREGIDO

- Al revisar el E2E del nuevo tenant, confirmé que `register()` guardaba tokens y autenticaba al usuario, pero `RegisterForm` llamaba después a `onSwitchToLogin()`. La navegación a `/login` contradecía el comportamiento de alta con sesión y la prueba esperaba `/dashboard`.
- Corrección: separar el callback de registro exitoso y dirigirlo a `/dashboard`; el enlace “¿Ya tienes cuenta?” sigue abriendo login.
- Prevención: leer el flujo UI completo desde submit hasta navegación antes de fijar la expectativa de un E2E.

## 2026-11-22 — CI no se podía ejecutar desde ramas de trabajo — CORREGIDO

- El workflow sólo tenía triggers de push/PR a `main`, lo que impedía validar la rama refactor sin merge o PR.
- Corrección: se habilitó `workflow_dispatch` para ejecutar manualmente la suite en el ref de trabajo; incluye el checkout del backend feature.
- Prevención: verificar los triggers disponibles antes de asumir que el push aislado inicia Actions.
- Evidencia integrada: Actions `44999716080` pasó en Front `e2cdcb1` con Backend `3620cc2`: xUnit 61/61, responsive 1/1, E2E 18/18 y cleanup success.

## 2026-11-22 — Actualización documental esperaba texto de handoff obsoleto — CORREGIDO

- Un parche agrupado esperaba una frase del handoff que no existía en Front; `apply_patch` rechazó todo el parche y no alteró documentos.
- Corrección: volver a leer los párrafos reales del registro de sesión y aplicar cambios con el texto actual.
- Prevención: no asumir que el handoff frontend y backend mantienen las mismas frases aunque documenten el mismo hallazgo.


## 2026-11-22 — Inventario de tests backend ejecutado desde Front — CORREGIDO

- Un `rg` combinado incluyó `BackEnd_Gps.Tests` con cwd en el repo Front; la búsqueda devolvió ruta inexistente y código 2. No tocó archivos ni datos.
- Corrección: consultar pruebas backend desde `/home/leonardo/Back_GPS`.
- Prevención: separar cada ruta relativa por repositorio al lanzar búsquedas paralelas.

## 2026-11-22 — Parche final combinado encontró contexto ya actualizado — CORREGIDO

- El parche para cerrar estados de onboarding mezcló un párrafo que ya contenía el resultado CI con otro hunk de handoff distinto; la verificación falló antes de completar el conjunto.
- Corrección: releer cada destino y actualizar títulos/estado con reemplazos acotados; `git diff --check` pasó.
- Prevención: revisar los fragmentos actuales inmediatamente antes de agrupar parches entre repositorios.

## 2026-11-22 — E2E de cancelación redeclaró `routeCard` — CORREGIDO

- El build detectó `TS2451` en `fleet-admin.spec.ts`: el flujo de edición ya declaraba `routeCard` y la nueva acción de cancelar volvió a usar el mismo identificador en el mismo bloque.
- Corrección: renombrar la referencia de la acción a `cancelRouteCard`.
- Prevención: al ampliar un test largo, revisar nombres locales existentes antes de introducir nuevas variables.

## 2026-11-22 — Parche de cancelación esperaba una frase de handoff desactualizada — CORREGIDO

- Un parche de documentación agrupado esperaba una frase de onboarding que ya había sido modificada; `apply_patch` rechazó el conjunto y no editó esos documentos.
- Corrección: inspeccionar el contenido actual y añadir las secciones por destino, usando una operación idempotente; `git diff --check` pendiente de repetición.
- Prevención: aplicar los cambios documentales en hunks pequeños cuando los historiales de ramas difieren.

## 2026-11-22 — Parámetro inválido al solicitar aclaración de negocio — CORREGIDO

- La herramienta de preguntas esperaba `title` y `options`, pero la primera llamada incluyó `question`; rechazó la solicitud antes de enviarla.
- Corrección: repetir usando `title` con el texto de la pregunta y opciones válidas.
- Prevención: validar la forma del esquema antes de llamar herramientas con campos similares.

## 2026-11-22 — Se dejaron líneas en blanco dobles al final al añadir documentación — CORREGIDO

- `git diff --check` detectó whitespace al final en PROJECT_STATUS, SESSION_HANDOFF, CHANGELOG y ERROR_LOG después de concatenar secciones.
- Corrección: normalizar EOF a una sola línea final; repetir diff-check.
- Prevención: revisar whitespace después de añadir documentación mediante scripts.


## 2026-11-22 — Cancelación de ruta desde UI verificada

- Actions `45000517571` pasó en Front `0f91d9a` con Backend `d346fa2`: Playwright 18/18, responsive 1/1, build/audit/lint y cleanup API/MySQL success. El E2E confirmó `PUT /Routes/{id}/status` 204 después de la confirmación UI, luego estado persistido cancelado e Historial.
# 2026-11-22 — Test Driver asumía lista vacía al filtrar una ruta ajena — CORREGIDO ANTES DE CI

- Hallazgo de revisión: el E2E estaba asertando que la lista Driver completa quedaba vacía al solicitar `vehicleId` de otro conductor.
- Causa: `GetAll` ignora ese filtro para Driver, pero conserva rutas propias completadas que siguen activas; una respuesta no vacía es válida.
- Solución: comprobar únicamente que la lista no contiene el ID de la ruta ajena, que es la garantía de autorización requerida.
- Prevención: las pruebas de aislamiento deben afirmar ausencia del recurso atacado y no imponer filtros/globales que el contrato no promete.
- Verificación: corrección estática antes de la ejecución Actions; lint/build/discovery se vuelven a ejecutar antes del dispatch actualizado.
# 2026-11-22 — Mostrar bajas de Drivers rompía con perfiles sin UserId — CORREGIDO

- Síntoma: Actions `45002306327`, `45002396041` y `45002610099` no encontraron el Driver recién dado de baja en UI; el listado completo no terminó de renderizar.
- Causa: el E2E de autorización creó un Driver válido sin usuario vinculado, y `TeamManagement` asumía que `driver.userId` siempre era string al mostrar el identificador. El contrato permite `UserId` nullable y la excepción interrumpía la lista al mostrar bajas.
- Solución: tipar `UserId` como nullable, presentar “Sin usuario vinculado” si falta, conservar username/ID abreviado cuando existe y ampliar el E2E para confirmar el render del Driver sin usuario.
- Prevención: cubrir entidades opcionalmente asociadas con sus estados nulos en las vistas que consumen listas completas.
- Verificación: fix y aserción agregados; lint/build/discovery pasan. Actions integrada `45002920723` pasó Playwright 18/18 con cleanup; el ajuste de tipos `cd7f171` se repite en Actions `45003051160`.

## 2026-11-22 — E2E inicial de edición de miembros — CORREGIDO Y VERIFICADO (18/18)

- Primera suite API/MySQL obtuvo 16/18. El flujo Driver encontró el mismo texto de nombre en Gestión de Choferes y tarjeta de usuario. Se agregaron selectores data-testid por ID; el texto de la sección de Drivers se acotó al primer resultado.
- El test de Historial recibió 503 pero no mostró el alert antes del siguiente fetch. La causa era resetear el flag al contestar; se conserva el 503 hasta que el test observa el alert y luego se permite reintentar.
- El spec de error pasa 2/2; la suite integrada final pasó 18/18 en Chrome/API/MySQL, runner código 0.
- La segunda suite dio 17/18: tras recargar, otro tramo del mismo E2E seguía buscando el username como encabezado, aunque el diseño muestra el nombre legal. Se reemplazó también ese selector por el testid del perfil.
- Prevención: usar IDs para selectores de tarjetas y no liberar mocks antes de observar el estado UI ejercitado.

## 2026-11-22 — Esquema de solicitud de aclaración — CORREGIDO

- La primera llamada a request_user_input_async incluyó question; esta interfaz sólo acepta title y options, así que rechazó la solicitud antes de mostrarla.
- Se reintentó con el esquema válido; la respuesta sobre el alcance del rol Admin sigue pendiente.
- Prevención: confirmar el esquema de herramienta activo antes de construir la pregunta.

## 2026-11-22 — Parche responsive insertado inicialmente en el test equivocado — CORREGIDO

- Al ampliar dashboard/Historial a 320 px, un parche basado sólo en un bloque común de medición de ancho se insertó primero en el test de login.
- Se detectó revisando el contexto y los nombres de test antes de ejecutar Playwright; el bloque se movió al test de navegación de dashboard/rutas. No se ejecutó ni integró el estado incorrecto.
- En la ampliación posterior de Mi Ruta, otro parche con contexto genérico de login cayó inicialmente en el test de registro; se detectó con `rg` antes de correr Playwright y se reubicó dentro del test Driver.
- Prevención: anclar parches al nombre del caso y al heading cercano, no a bloques genéricos repetidos.

## 2026-11-22 — E2E asumían sidebar fijo al pasar tablet a drawer — CORREGIDO EN TESTS

- Actions `45006747816` encontró tres E2E que navegaban al Mapa o a Rutas sin abrir el menú tras iniciar sesión/redimensionar a 768 px. El cambio de producto convirtió intencionalmente esa navegación en drawer.
- Se añadieron clics explícitos al botón `Abrir menú` en los recorridos de Equipo, tracking y creación de ruta en tablet.
- Prevención: al cambiar el breakpoint de navegación, buscar y validar cada recorrido de usuario que use el sidebar después de cambiar viewport o cargar sesión.

## 2026-11-22 — E2E del constructor esperaba controles del editor oculto — CORREGIDO EN TESTS

- Actions `45007503895` pasó 15/18 y detectó que la nueva UX cambia automáticamente al mapa al agregar/ubicar un punto; el test seguía esperando el botón `Seleccionando` dentro del panel editor oculto. La prueba móvil agotó también su tiempo al limpiar fixtures después del timeout principal.
- Se cambió la expectativa a `Ver paradas y detalles`, que confirma que el mapa quedó abierto. El helper ya valida el regreso al editor después de fijar un punto.
- En la ejecución posterior `45008055246` quedó un acceso adicional sin transición: el caso móvil agregaba una parada temporal y luego intentaba quitarla desde el editor, todavía oculto. El test ahora vuelve al editor antes de modificar esa fila.
- En el mismo run, tracking falló tras `page.reload()` a 768 px porque no se volvió a abrir el drawer; se agregó el clic explícito.
- Prevención: las pruebas deben observar el panel actualmente visible y cambios de navegación después de reload, no asumir que contenido oculto sigue accionable.


## 2026-11-22 — Eliminación de parada temporal en el panel oculto — CORREGIDO Y VERIFICADO

- Actions `45008055246` dejó 17/18 casos verdes: el test de creación móvil volvía a agregar una parada y trataba de eliminarla sin regresar desde el mapa al editor.
- Se agregó una transición explícita a “Ver paradas y detalles” antes de interactuar con la fila. Actions `45008495969` pasó los 18/18 E2E y la prueba responsive 1/1; también pasó audit, lint y build.
- Prevención: después de agregar o ubicar una parada, el test debe cambiar al panel que contiene el control antes de operar sobre esa parada.


## 2026-11-22 — Selector del E2E de chofer independiente — CORREGIDO ANTES DE CI

- Durante la revisión del test de creación de Driver sin cuenta, un locator quedó temporalmente con cierre de corchete incorrecto y nombre duplicado en el mismo scope. `git diff` lo detectó antes de ejecutar la suite; se corrigió el locator y se usó un nombre distinto para la tarjeta.
- Prevención: revisar compilación TypeScript y declarar locators con nombres únicos antes de disparar E2E integrado. El lint/build posteriores pasaron.

## 2026-11-22 — ESLint detectó variable mutable sin reasignación — CORREGIDO

- La prueba de alta UI Logistics declaró `vehicleId` con `let` aunque sólo se asignaba una vez; `npm run lint` falló por `prefer-const`.
- Se convirtió a `const`. La prueba se vuelve a validar con lint/build antes de publicar el siguiente SHA.

## 2026-11-22 — Consulta de Actions en repositorio equivocado — CORREGIDO

- Se consultó un ID de Actions frontend desde el repositorio backend y un ID backend desde el frontend; GitHub respondió 404. También se repitió una consulta Front desde Back durante dos runs concurrentes. Se volvieron a consultar los IDs desde sus repositorios de origen y se confirmaron sus estados.
- Prevención: usar el checkout/repositorio que originó cada run al llamar `gh run view`; consultar en paralelo desde cada checkout cuando se monitorean ambos workflows.

## 2026-11-22 — E2E de Logistics sin opciones y fallos de cleanup — CORREGIDO Y VERIFICADO

- Actions `45009790973` pasó 15/18. El nuevo recorrido de Logistics agotó 90 s durante la creación UI; al cambiar después la cuenta compartida de Logistics a Driver, el backend dejó el perfil Driver inactivo. El test Driver siguiente no pudo crear su ruta (HTTP 400), y el test de Equipo esperaba un Driver “Foreign Driver QA” creado/limpiado por otro caso y falló por dependencia de orden.
- Se añadió una sección Playwright “Logistics crea una ruta…” para identificar el último paso y el `finally` ahora restaura tanto el rol como el estado activo del Driver. El test de Equipo valida el propio Driver independiente que acaba de crear, sin depender de otro caso.
- Prevención: los E2E no deben depender de fixtures temporales de otro test; al restaurar un rol operativo también debe comprobarse el estado del perfil enlazado. La repetición integrada debe confirmar además el punto exacto del timeout y el cleanup.

- Diagnóstico adicional por traza local: el constructor llegaba a “Asigna los recursos”, pero el selector de vehículo permanecía sin opciones. Logistics tiene 403 en `/Vehicles` y `/Drivers`, mientras que el constructor dependía de esos endpoints y de `/Users/my-team`.
- Solución en curso: nuevo `GET /Routes/assignment-options`, protegido para Admin/Manager/Logistics y limitado por los filtros de tenant EF Core; devuelve sólo campos operativos activos y omite documento/teléfono. Front consume el contrato desde FleetContext y muestra error con reintento si no carga. El E2E comprueba acceso 200, ausencia de PII y creación/cancelación de ruta en UI.
- Prevención: si un rol puede ejecutar una operación pero no administrar el recurso relacionado, ofrecer un contrato de lectura mínimo con autorización y aislamiento explícitos; no ampliar permisos de los endpoints CRUD.
- Verificación local tras el cambio: Front lint/build y discovery 18 casos pasan; Backend Release build sin warnings y xUnit 64/64; sintaxis del smoke y diff-check pasan. Smoke MySQL/API y Actions integradas pendientes.
- Actions `45011806008` ejecutó la prueba de Logistics y 16/18 casos pasaron, pero los dos tests que simulan fallos de Equipo/Historial fallaron al abrir el drawer. Causa: sus mocks globales no incluían el endpoint nuevo y dejaban `/Routes/assignment-options` continuar a la API real; el cambio de sesión desmontaba el menú.
- Solución: ambos mocks devuelven `{vehicles: [], drivers: []}` para el endpoint. Prevención: al introducir una llamada API global nueva, actualizar también los harnesses de red que interceptan `**/*` para que las suites mockeadas no filtren tráfico real.
- Verificación local posterior: ambos casos de carga pasan 2/2, lint/build y diff-check correctos. Actions integrado después de este fix pendiente.
- El siguiente Actions `45012288100` ejecutó los 18 E2E y responsive (18/18), pero el runner falló al limpiar MySQL. El fixture de ruta Logistics usaba `E2E QA Logistics ruta …`; `cleanup-e2e.sql` limpia por el prefijo `E2E QA ruta …`, por lo que el nombre no coincidía.
- Solución: el fixture ahora se llama `E2E QA ruta Logistics …`, alineado con el prefijo de cleanup compartido. Prevención: todo recurso persistido por E2E debe respetar los prefijos del script de limpieza; comprobar cleanup aunque todas las aserciones de navegador pasen.
- Actions `45012698648` para Front `4117342` + Backend `6def8fa` pasó: audit/lint/build, responsive 1/1, Playwright API/MySQL 18/18, runner cleanup y containers success. El endpoint habilitó la creación Logistics y los tests aislados recuperaron el drawer; DB temporal limpia.
- Fallo de herramienta de aclaración: la primera llamada asíncrona envió el campo `question`, que el esquema no acepta; no se mostró al usuario. Se reintentó con `title/options` válidos y quedó pendiente política de promoción Admin. Prevención: seguir el esquema publicado exacto de la herramienta antes de formularla.

## 2026-11-22 — Inspección de frontend desde el repositorio backend — CORREGIDO

- Un comando de lectura ejecutado en `/home/leonardo/Back_GPS` buscó `src/Components/fleet/RoutesManagement.tsx`, que pertenece a `/home/leonardo/Front_gpsR`; `sed` devolvió error y no modificó archivos.
- Solución: repetir las lecturas de frontend desde el checkout Front. La inspección de compatibilidad de `UpdateRouteCommand` sí se realizó desde Back.
- Prevención: ejecutar cada path relativo desde su repositorio de origen y confirmar el directorio de trabajo antes de agrupar lecturas.

## 2026-11-22 — Frontend confundía Manager con Logistics — CORREGIDO Y VERIFICADO

- Actions Front `45013936721`: 17/18 E2E pasaron; el recorrido UI Manager confirmó acceso a Rutas pero no encontró Vehículos. El API/MySQL sí confirmó HTTP 200 y CRUD de vehículos para Manager.
- Causa: `roleMap` convertía ambos roles API (`Manager` y `Logistics`) a la misma UI `logistica`; sus permisos ocultaban Vehículos aunque el backend lo permite para Manager.
- Solución: modelar `manager` como rol UI propio, con vehículos/rutas y sin administración de usuarios; separar su etiqueta “Gestor de flota” de “Logística”; incluirlo en altas/cambios de rol y badges. Mantener backend como autoridad.
- Prevención: conservar cada rol de backend como identidad independiente cuando su matriz de permisos difiere; E2E por rol debe comparar navegación UI además de autorización HTTP.
- Actions `45014430986` confirmó la corrección: 18/18 E2E, responsive 1/1, audit/lint/build y cleanup API/MySQL exitosos con Backend `648b23f`.

## 2026-11-22 — Manager sin pantalla de Drivers y llamadas 403 a usuarios — CORRECCIÓN EN CURSO

- Auditoría independiente encontró que Manager tiene permisos backend para crear/editar/desactivar Drivers y asignar vehículos, pero los controles estaban dentro de Gestión de Equipo, restringida a Admin. Manager tampoco debe ver usuarios; `/Users/my-team` sólo admite Admin y el AuthContext lo solicitaba a Logistics/Manager.
- Solución en curso: permiso visual `canManageDrivers` separado, pantalla de Gestión de Conductores para Admin/Manager que opera conductores independientes de cuenta, Admin mantiene Gestión de Equipo; la carga automática de usuarios queda sólo para Admin. Logistics/Driver/User no ven la pantalla.
- E2E amplía Manager UI con crear/editar/asignar/desasignar/baja/reactivación de Driver y verificación de persistencia/ausencia de 403 de equipo; CI integrada pendiente.
- Prevención: no agrupar entidades con matrices de autorización distintas en una sola pantalla; evitar solicitar endpoints no autorizados desde el arranque.
- Error de edición del test: dos parches de contexto esperaban que la secuencia de status/baja fuese distinta de la que había en el spec; `apply_patch` los rechazó sin aplicar cambios. Se volvió a leer el bloque actual y se dividieron las ediciones con anclas exactas antes de lint/build.

## 2026-11-22 — Python heredoc con comillas multilinea inválidas — CORREGIDO

- Al intentar actualizar cuatro documentos, el script Python quedó con una cadena de handoff sin cerrar y terminó con `SyntaxError`; no se modificó ningún archivo ni se creó commit.
- Solución: escribir los fragmentos multilínea mediante heredoc `cat` y mantener cada bloque de documento en su propio comando.
- Prevención: validar scripts de actualización documental antes de staging y comprobar `git status` tras cualquier error.

## 2026-11-22 — Fecha real de creación de ruta — VALIDADO EN CI

- Actions `45020301540` para Front `cacb72e` pasó lint/build/audit, responsive **1/1**, E2E autenticado Chrome/API/MySQL **18/18** y cleanup.
- Backend Actions `45020146775` confirmó migración, persistencia `CreatedAtUtc`, edición inmutable y smoke MySQL. El fallo inicial por precisión `datetime(6)` se resolvió y quedó registrado en backend.

# 2026-11-22 — Selector de Gestión de Conductores ofrecía vehículos ocupados — CORREGIDO; E2E pendiente

- Auditoría encontró que la pantalla de Gestión de Conductores filtraba por estado `disponible`, pero no por asignación existente. El endpoint rechaza la operación con 409, así que la interfaz ofrecía recursos que no podía asignar.
- Solución: conservar la opción del vehículo actual, pero excluir cualquier vehículo vinculado a otro Driver. E2E Manager crea otro Driver y comprueba que la opción desaparezca mientras existe la relación y reaparezca después de desasignar.
- Aún pendiente: lint/build y E2E integrado tras editar.
- Prevención: opciones operativas deben reflejar estado y relaciones de asignación del backend; una validación server-side no compensa un selector que induce una operación fallida.

## 2026-11-22 — Gestión de Equipo ofrecía asignación inválida y edición sin validar — CORREGIDO LOCAL; ACTIONS PENDIENTE

- Auditoría independiente encontró que el selector Drivers de Equipo listaba vehículos no disponibles/ocupados y “Quitar” aparecía sin asignación. El formulario duplicado carecía de required/maxLength y enviaba espacios al API.
- Solución local: selector limita a vehículos disponibles sin otra asignación activa (más el vehículo propio), botón condicional y validación trimmeada/límites antes del PUT.
- E2E añade aserciones de selector/botón, intenta espacios y exige no emitir PUT, y comprueba 400 del API sin mutar el registro. Lint/build/discovery 18 y diff-check pasan; Actions API/MySQL pendiente.
- Prevención: toda pantalla duplicada debe reutilizar validación/elegibilidad y cubrir estado negativo además del flujo exitoso.

## 2026-11-22 — Actualización documental Front falló por contexto desfasado — CORREGIDO

- El primer `apply_patch` que intentó actualizar handoff/changelog no encontró la línea esperada sobre política Admin y rechazó el parche entero sin modificar archivos.
- Solución: releer el tail exacto y aplicar cambios en fragmentos pequeños con anclas vigentes; la contradicción antigua de perfil quedó marcada como resuelta.
- Prevención: usar la ubicación actual del texto, no asumir que una frase de handoff permanece idéntica.

## 2026-11-22 — Gestión de Conductores ocultaba fallos al cargar vehículos — CORREGIDO Y VALIDADO

- Si fallaba `GET /Vehicles`, Gestión de Conductores no mostraba error ni ofrecía reintento; el formulario podía parecer funcional con opciones de asignación incompletas.
- Solución: mostrar alerta accesible con explicación y botón Reintentar conectado a `retryFleetData`; se conservan los errores de API como error, no como lista vacía.
- E2E enfocado con 503 reales simulados en el harness: error visible para Drivers y Vehicles, no se muestra estado vacío durante fallo, reintento y recuperación. Resultado local: 1/1.
- `npm run lint`, `npm run build` y descubrimiento de Playwright terminaron correctamente; suite descubre 19 pruebas. Ejecutar Actions integrado después de publicar.
- Error de edición anterior: un parche del E2E de mapa no encontró sus anclas de marker y fue rechazado sin cambios. Solución: releer el spec y dividir el cambio en hunks pequeños. Prevención: comprobar el contexto real antes de parchear pruebas largas.

## 2026-11-22 — E2E de retry no comprobaba opciones recuperadas — CORREGIDO

- Revisión independiente detectó que la prueba comprobaba sólo la desaparición de la alerta y que hubiera otro GET; al devolver `[]` de conductores, no comprobaba si el vehículo volvió a mostrarse.
- Solución: el harness ahora responde con conductor y vehículo disponibles; E2E verifica el nombre/placa en el selector y que exactamente una nueva solicitud de Vehicle se completa. El botón informa “Reintentando…” y queda deshabilitado mientras espera.
- Primer intento tras hacer realista el fixture falló porque el test aún esperaba el estado vacío “No hay conductores activos”. Se actualizó la expectativa a la tarjeta del conductor fixture, luego el E2E enfocado pasó 1/1.
- Prevención: probar el resultado funcional del reintento, no sólo el cambio de estado de la alerta.

## 2026-11-22 — Props maxLength duplicadas en TeamManagement — CORREGIDO

- ESLint encontró `react/jsx-no-duplicate-props` en los formularios existentes de alta de Driver (nombres/apellidos), porque el parche genérico insertó `maxLength` encima del atributo que ya existía.
- Solución: retirar las props nuevas duplicadas y mantener una única longitud 100 por campo; límites 100/200/20 continúan en los formularios objetivo.
- Repetición local: `npm run lint`, `npm run build` y Playwright discovery **19** pasaron; no ejecutar comandos de Front con paths relativos de Back.

## 2026-11-22 — CI frontend aún referenciaba backend anterior — CONTROLADO

- Actions 45025319275 completó success antes de crear la migración EmailOutbox. Validó frontend 000d6cb con backend 8d3cb32, no el nuevo árbol local.
- Solución de control: documentar el SHA efectivo y no usar ese run como evidencia del outbox; ejecutar Actions integrada después de publicar backend.
- Prevención: comparar el SHA checkout del backend en el log de cada workflow antes de asociar el run con cambios posteriores.

## 2026-11-22 — Errores de entorno de la iteración outbox documentados en backend

- La compilación EF inicial falló por extensión DataProtection sin namespace; se agregó el using y la migración se generó.
- Un intento de lanzar smoke tomó el host global sin runtime; se relanzó con el SDK local y pasó.
- El guard del terminal rechazó una limpieza amplia antes de ejecutar comandos; se sustituyó por detener/eliminar únicamente el contenedor descartable con nombre exacto.
- La corrida previa sin requests concurrentes no se contó como prueba de serialización; el smoke con dos requests reales pasó.
- Detalle y prevención se mantienen en Back_GPS/docs/ERROR_LOG.md.

## 2026-11-22 — Filtros de rutas sin acción para restaurar resultados — CORREGIDO Y VALIDADO

- La prueba combinada confirmó que los criterios Estado+Vehículo+Conductor ocultaban la ruta no coincidente y conservaban la coincidente, pero esperaba el botón Limpiar filtros con resultados y agotó 90 s.
- Causa UX: el botón sólo se renderizaba en el estado de cero coincidencias; con una coincidencia no había control para quitar los criterios.
- Solución: el panel muestra Limpiar filtros siempre que algún filtro esté activo y limpia búsqueda/estado/vehículo/conductor en una sola acción. Se quitó el control duplicado del vacío.
- Repetición Chrome/API/MySQL descartable completa: 20/20; el test confirma una ruta visible, otra oculta y ambas visibles después de limpiar.

## 2026-11-22 — E2E intentaba borrar un Driver por un endpoint inexistente — CORREGIDO

- El segundo intento del test llegó a validar filtros y responsive, pero falló en cleanup con HTTP 405 porque DriversController no implementa DELETE.
- Solución: desactivar fixtures con PUT /Drivers/{id}/status y asignar prefijos E2EQA/E2E QA ruta que reconoce cleanup-e2e.sql; el cleanup global de la DB descartable elimina las filas.
- Repetición completa: 20/20, cleanup del runner ejecutado y contenedor MySQL eliminado.

## 2026-11-22 — Runner E2E se leyó desde el repositorio incorrecto — CORREGIDO

- La inspección inicial buscó scripts/run-e2e-local.sh bajo Front_gpsR y sed reportó archivo inexistente.
- Solución: leerlo desde Back_GPS/scripts/run-e2e-local.sh, su ubicación real; el runner se ejecutó contra API local y MySQL descartable.
# 2026-11-22 — Espacio final detectado por `git diff --check`

- Error: la actualización de evidencia de Actions agregó una línea vacía al final de `docs/TESTING.md`; `git diff --check` impidió el commit documental.
- Solución: quitar el espacio final y repetir diff-check antes de publicar.

## 2026-11-22 — Dashboard de Logistics no tenía E2E de error y recuperación de flota — CORREGIDO; CI PENDIENTE

- Brecha de cobertura: el dashboard ya usa `Routes/assignment-options` y marca la cifra con `—` cuando falla, pero sólo se había probado el caso exitoso.
- Solución de cobertura: nuevo Playwright provoca 503, verifica alerta, cifra no disponible y ausencia de estado vacío; luego reintenta con una respuesta que contiene un vehículo y exige que aparezca la cifra 1.
- El caso también comprueba que Logistics no solicite GET `/Vehicles` y que la página no desborde a 390×844.
- Ejecución local: caso enfocado **1/1**; lint, build, discovery **22** y `git diff --check` correctos. Actions integrada aún pendiente para el commit de esta prueba.
- Prevención: para cada recurso restringido, comprobar estados error/recuperación y la fuente autorizada de datos, además del resultado normal.

## 2026-11-22 — Dashboard Logistics: error/retry — Actions RESUELTO

- Actions `45036661541` pasó para Front `a75914f`: suite Playwright autenticada contra API/MySQL **22/22**, responsive browser **1/1**, audit, lint y build success; el workflow también limpió API/contenedor.
- El E2E nuevo de options 503 → alerta/`—` → retry con un vehículo forma parte de los 22 casos. No hubo fallos de test.

## 2026-11-22 — Búsqueda de pruebas backend desde la raíz incorrecta — CORREGIDO

- Un recuento secundario `rg` buscó la carpeta `BackEnd_Gps.Tests` mientras el directorio de trabajo era Front; devolvió error de ruta y no encontró tests.
- Solución: conservar la búsqueda de specs Front desde este repo y ejecutar recuentos backend en `/home/leonardo/Back_GPS`; nunca interpretar salida de raíz ajena como cobertura cero.

## 2026-11-22 — Revisión de cobertura Front lanzada desde raíz Backend — CORREGIDO

- Una búsqueda que combinaba los specs Front y tests backend se ejecutó desde `/home/leonardo/Back_GPS`; los paths `e2e` y `src` no existían en ese repo, por lo que `rg` devolvió esos errores aunque sí listó tests backend.
- Solución: separar búsquedas por repositorio y ejecutar specs Front bajo `/home/leonardo/Front_gpsR`.
- Prevención: no construir búsquedas de auditoría con raíces de ambos repositorios en una sola ejecución.

## 2026-11-22 — Gestión de Vehículos confundía 503 con flota vacía — CORREGIDO; ACTIONS PENDIENTE

- Hallazgo: si GET `/Vehicles` fallaba, el contexto conservaba la lista vacía y Gestión de Vehículos mostraba “No hay vehículos registrados”, aunque el dashboard ya sabía que la carga estaba fallida.
- Solución: la vista ahora lee el error del recurso, muestra una alerta que aclara que el estado de la flota no está disponible y habilita Reintentar con `retryFleetData`; no presenta el vacío mientras exista error.
- Nuevo E2E ejecuta 503 → alerta/no vacío → retry 200 con una unidad QA, confirma que aparece `QA-VEH-01` y comprueba overflow a 320 px.
- Verificación local: spec completo de errores/carga **5/5**, lint/build y Playwright discovery **23** pasan; Actions integrada pendiente.
- Prevención: cada pantalla consumidora debe reflejar el error de carga del recurso aunque el dashboard tenga una alerta global; no inferir vacío desde array inicial vacío.

## 2026-11-22 — Gestión de Vehículos error/reintento — Actions RESUELTO

- Actions `45038229853` pasó en Front `40bdcea`: lint/build/audit, responsive **1/1**, E2E autenticado Chrome/API/MySQL **23/23**, cleanup success.
- El caso de error de carga Vehicles a 320 px quedó validado junto con el resto de carga/retry. El run descargó Backend `4090176` (código de seguridad `94c3e90`).
- Backend commit posterior `b625c28` agregó sólo la prueba directa de key ring; su Actions `45038446662` pasó Release/xUnit **86/86**, HTTP/MySQL, concurrencia y cleanup. Nuevo Front run contra `b625c28` pendiente tras documentar la actualización.

## 2026-11-22 — Gestión de Vehículos + Backend de seguridad actualizado — Actions RESUELTO

- Revalidación cruzada Front Actions `45038687601` pasó con Front `f972e19` y Backend `b625c28`: Release/xUnit **86/86**, audit/lint/build, responsive **1/1**, Playwright autenticado API/MySQL **23/23** y cleanup.
- Incluye error/reintento de GET `/Vehicles` a 320 px y el backend con key ring cifrado, test-email restringido y rate limit atómico.

## 2026-11-22 — Gestión de Vehículos mostraba vacío durante la carga inicial — CORREGIDO; CI PENDIENTE

- Hallazgo: aunque la vista ya diferenciaba el 503 del estado vacío, la lista podía verse momentáneamente vacía antes de que terminara la petición inicial.
- Solución: `FleetContext` expone `vehiclesLoading`, y Gestión de Vehículos presenta un estado accesible de carga antes de error, vacío o resultados.
- El E2E retiene deliberadamente la respuesta inicial; comprueba que aparece “Cargando vehículos…” y no el estado vacío, luego libera un 503 y prueba error → reintento 200 → unidad visible a 320 px.
- Pruebas locales: el caso enfocado pasó 1/1; spec completo de errores/carga 5/5; `npm run lint`, `npm run build`, discovery Playwright 23 y `git diff --check` pasan. CI de este cambio aún pendiente.
- Prevención: probar carga pendiente, fallo y recuperación por separado; una lista inicial vacía no demuestra que la carga haya concluido.

## 2026-11-22 — Estado de carga inicial de Vehículos — Actions VALIDADO

- Actions `45039605708` validó Front `36f9bd8`: backend Release/xUnit y smokes, audit de dependencias, lint/build, responsive **1/1**, E2E autenticado Chrome/API/MySQL **23/23** y cleanup success.
- Incluye el nuevo E2E de carga pendiente → 503 → retry → datos visibles a 320 px.

## 2026-11-22 — Gestión de Rutas mostraba lista vacía durante carga — CORREGIDO; CI PENDIENTE

- Hallazgo: antes de que terminara GET `/Routes`, la pantalla podía enseñar “Aún no tienes rutas”. Un retraso o fallo de API se confundía con flota logística vacía.
- Solución: `FleetContext` expone `routesLoading`; la vista muestra “Cargando rutas…” y reserva el estado vacío para una respuesta exitosa sin rutas. El reintento también activa el estado de carga.
- Nuevo Playwright retiene el GET inicial, verifica carga y ausencia de vacío, libera 503, comprueba alerta, reintenta con 200 y ve `QA-ROUTE-01`; viewport 320 px sin overflow.
- Validación local: spec completo de carga/error **6/6**, test enfocado de rutas 1/1, lint/build, discovery **24** y diff-check pasan. Actions integrado pendiente.

## 2026-11-22 — FleetContext podía exponer respuestas de otra cuenta — CORREGIDO; CI PENDIENTE

- Auditoría independiente demostró una carrera entre el cambio de `user.id` y respuestas pendientes: una lista de vehículos/rutas/opciones de A podía sobrescribir el estado ya marcado como propiedad de B. `refreshDrivers` tenía secuencia local, pero reintentos viejos podían continuar después del cambio.
- Solución: `FleetContext` rota una sesión de solicitudes en `useLayoutEffect` al cambiar la identidad, aborta llamadas en curso y valida owner+versión al resolver. Todas las peticiones de flota pasan por `apiFetchForOwner`; reintentos dejan de continuar si cambia el owner y los estados de carga/error tampoco se actualizan desde una sesión obsoleta.
- E2E real en SPA: demora GET `/Vehicles` de A, cierra sesión, inicia B, carga `B-PRIVATE-01`, libera respuesta tardía `A-PRIVATE-01`; la unidad A no aparece. Caso enfocado **1/1** y spec load-errors **7/7**.
- La primera corrida de regresión falló porque `getByLabel("Contraseña")` seleccionaba también el botón “Mostrar contraseña”; selector cambiado a role textbox. ESLint detectó dos dependencias del hook; corregidas. Repetición enfocada pasó; lint/build/discovery **25**/diff-check pasan.
- Actions `45040955335` ya pasó para el código anterior de `98f7c67`: E2E **24/24**, responsive, lint/build/audit y Backend `a18a34f`. El fix de aislamiento de cuenta aún requiere una nueva Action integrada.
- Intento inicial de subagente adicional chocó con el límite de threads abiertos. Se cerró el agente backend ya completado y se lanzó la auditoría con éxito; sin cambio de código por ese error.


## 2026-11-22 — Falta de cobertura tablet en Mi Ruta — CORREGIDO Y VALIDADO

- Hallazgo de auditoría: Driver tenía E2E de GPS/parada/evidencia en móvil estrecho, pero no verificaba el viewport tablet de 768 px.
- Solución: el E2E ahora valida vista y acción iniciales, ausencia de overflow, límites y controles del diálogo de evidencia en 320/768 px, y estado final a 768 px.
- No se ejecutó localmente por ausencia de fixture/credenciales Driver QA; CI sí ejecuta el flujo con API/MySQL descartables. Actions `45043898907` pasó el commit `0dd5099`: E2E 26/26, responsive 1/1, build/audit y cleanup.
- Prevención: la matriz responsive debe cubrir cada rol operativo y las acciones principales, no sólo la navegación y las pantallas administrativas.


## 2026-11-22 — Auditoría no aislaba el filtro de estado y el mapa/lista Logistics — COBERTURA AMPLIADA

- El E2E previo filtraba dos rutas Pending por vehículo y Driver; el estado Pending estaba aplicado pero una regresión que ignorara estado podía pasar porque recursos distintos ya excluían la otra ruta.
- Solución: una ruta fixture se cancela; los selectores del segundo recurso con estado Pending deben devolver cero, y sólo `Cancelada` muestra esa ruta. Se prueban ambos anchos con filtros activos y overflow de documento/main.
- Logistics ya cubría selectores de asignación e historial a 320/768 px, pero mapa y lista no. Ampliado el E2E para medir mapa/editor a 320/768 y lista/main tras crear ruta. CI autenticada queda pendiente para el nuevo SHA.

## 2026-11-22 — Logout global difícil de encontrar y cobertura de revocación incompleta — CORREGIDO/AMPLIADA

- Auditoría frontend encontró que “Cerrar sesión en todos los dispositivos” sólo aparecía al expandir el formulario para cambiar contraseña. Se movió a una acción visible e independiente dentro de Seguridad, con estado deshabilitado durante el envío.
- La suite verificaba un 503 y preservación de la sesión local, pero no el éxito real entre dos sesiones ni la revocación de tokens al desactivar un miembro. Se añadieron E2E para ambas situaciones.
- La prueba de baja usa un segundo usuario QA activo creado por `run-e2e-local.sh`, ya que los usuarios invitación creados en UI no se pueden autenticar sin el correo real; el fixture se crea en MySQL descartable y el cleanup existente lo elimina por prefijo.
- Lint y Playwright discovery pasan localmente. E2E autenticado API/MySQL, build y Actions del nuevo SHA pendientes.
- Prevención: para revocaciones de sesión, cubrir éxito/error, tokens en otra sesión y cambios administrativos de estado; las pruebas deben autenticarse con fixtures activos de la base desechable.

## 2026-11-22 — “Mi Ruta” priorizaba mal y ocultaba errores — CORREGIDO; E2E INTEGRADO PENDIENTE

- Auditoría independiente encontró que dashboard y vista Driver usaban el primer estado Pending/InProgress, sin priorizar InProgress; además, la vista mostraba “No tienes rutas asignadas” durante carga/fallo, y el indicador siempre señalaba `puntos[0]` aunque se completara.
- Solución: ambas vistas prefieren InProgress; la carga inicial muestra estado `status`; fallo de GET `/Routes` muestra alerta con reintento y no afirma que la lista está vacía; “Siguiente punto” busca la primera parada operativa que no esté completada/omitida.
- Se añadieron E2E con API/MySQL real para Driver con ruta en curso + pendiente, error 503 y retry; el flujo Driver real ahora verifica el cambio del siguiente punto tras completar recogida/entrega. Lint/build local pasaron y Playwright descubre 30 tests; E2E de esos cambios aún pendiente.

## 2026-11-22 — E2E de logout/offboarding falló por asumir menú móvil en viewport escritorio — CORREGIDO

- Action `45048803279` pasó lint/build/responsive y 26/28 E2E; los dos nuevos tests se bloquearon esperando “Abrir menú” porque Playwright inicia con viewport desktop, donde la navegación lateral ya está visible. El código de logout y offboarding no llegó a ejecutarse en esos casos.
- Corrección: fijar explícitamente 390×844 px en ambos flujos antes de usar el menú tipo drawer. Prevenir: definir el viewport esperado antes de interactuar con navegación responsive. Repetir E2E integrado tras publicar el SHA actualizado.

## 2026-11-22 — Cobertura fotográfica y responsive ampliada — VALIDACIÓN INTEGRADA PENDIENTE

- Auditoría QA encontró que el E2E Driver sólo adjuntaba notas, no fotos; tampoco recorría el ciclo Driver completo a 320 px. Registro y cambio de contraseña tenían cobertura parcial de anchos.
- Se amplió Playwright para adjuntar PNG, verificar respuesta/persistencia y consultar la foto en Historial; mantener 320 px durante asignación, desasignación, edición y baja/reactivación del Driver; y validar registro/cambio de contraseña a 320/768 px.
- El primer parche no encontró el fragmento exacto del test y no modificó archivos; se releyó el bloque. Un parche contextual cambió accidentalmente el viewport inicial de login a 320 px; el diff lo detectó y se restauró a 390 px antes de validar.
- ESLint, build y discovery de 33 escenarios pasan; E2E autenticado de esta ampliación requiere Actions/API/MySQL descartables.
- Prevención: ante un parche fallido, releer el contexto inmediato; evitar reemplazos genéricos y revisar el diff completo antes de validar.

## 2026-11-22 — Escritura documental abortada antes de modificar archivos

- La primera preparación del apéndice falló por intentar usar btoa/TextEncoder, no disponibles en el runtime de orquestación; otra versión falló por un literal Markdown con backtick que rompió la sintaxis JavaScript.
- Ambas fallas ocurrieron antes de ejecutar comandos y no modificaron archivos. Se resolvió escribiendo los apéndices mediante heredoc con delimitadores entre comillas; diff-check confirma los cambios esperados.
- Prevención: usar APIs del runtime realmente disponibles y no delimitar literales JS con backticks cuando el texto Markdown contiene backticks.

## 2026-11-22 — E2E operativos competían por el mismo Driver y fallaban a 320 px — CORREGIDO; CI PENDIENTE

- Action `45060482928` terminó con 30/33 E2E. Dos escenarios creaban rutas activas para el mismo fixture Driver y el backend respondió 409 por conflicto horario; el timeout produjo además un error secundario de cleanup al cerrarse el contexto Playwright. El tercer fallo midió 413 px de ancho en el formulario de conductores con viewport 320 px.
- Solución: el runner crea un Driver operativo independiente para el flujo de Mi Ruta/foto; el E2E de aislamiento tenant crea su propio Driver sin asignación y lo desactiva al limpiar. Conductores añade `min-w-0` a la sección/contenedor/formulario para permitir el encogimiento en móvil.
- Se revisó el diff y `npx playwright test --list` descubre 33 escenarios. `npm run lint`, `npm run build` y `git diff --check` pasan localmente. La repetición API/MySQL integrada sigue pendiente.
- Prevención: no compartir recursos con exclusión de agenda entre E2E paralelos; medir el formulario completo y sus ancestros flex/grid al validar overflow responsive. Tratar errores de cleanup después de timeout como secundarios y arreglar primero la condición inicial que bloqueó el caso.

## 2026-11-22 — Segunda CI: evidencia seleccionaba “Nota” y el formulario móvil heredaba ancho del layout — CORREGIDO; CI PENDIENTE

- Action `45061522878` terminó 31/33. La traza mostró que el test subía desde “Nota” y buscaba el placeholder de fotografía; el diálogo conserva el tipo de evidencia de la apertura anterior, por lo que nunca aparecía ese campo. El timeout dejó una ruta Pending; el retry reutilizó el Driver aislado y recibió 409. El cleanup secundario también falló porque Playwright ya había cerrado el contexto al vencer los 30 s.
- Solución: el E2E elige explícitamente “Foto” antes de completar descripción/cargar PNG. Así el flujo avanza y el teardown normal elimina la ruta. El test mantiene una cuenta Driver independiente para evitar interferencia con otros escenarios.
- El segundo fallo estaba en “Gestión de Equipo”, dentro de su ciclo CRUD Driver: el `<main>` flex y los contenedores de Equipo/chofer no permitían encoger; el formulario medía 413 px en viewport 320 px. Se añadió `min-w-0` a los ancestros flex/grid y `w-full min-w-0` al formulario de edición.
- Repetir lint/build, discovery y Action integrada; todavía no declarar estos dos escenarios validados.
- Prevención: para diálogos reusados, seleccionar explícitamente cada modo antes de interactuar con campos específicos; un retry Playwright no garantiza estado de base limpio después de timeout si el test abandonó una mutación pendiente.

## 2026-11-22 — Action Front 45062280254 detectó desborde del Mapa y evidencias de parada ausentes en resumen — CORRECCIÓN LOCAL; CI PENDIENTE

- La tercera Action terminó 31/33. A 320 px, el contenido de `<main>` del mapa medía 363 px aunque el documento global no se desbordaba; el árbol flex del mapa/sidebar conservaba un ancho mínimo intrínseco. Se añadió `min-w-0` a los contenedores flex y panel lateral.
- La foto y descripción se persistieron en `points[].evidence` de la API real, pero Historial sólo consultaba `route.evidencias` de nivel ruta. El detalle del historial no encontraba la evidencia al usar el endpoint actual. Se normalizan y aplanan evidencias desde los puntos al cargar la lista; el E2E ahora comprueba también el diálogo Admin a 768 px.
- Las pruebas previas que ya pasan no sustituyen la Action nueva: repetir suite completa luego del commit.
- Prevención: medir el `scrollWidth` de cada vista y `<main>`, no sólo del documento; seguir el contrato DTO real para evidencias por parada en listas y detalles.

## 2026-11-22 — Contenido del mapa excedía `<main>` a 320 px — CORREGIDO; CI PENDIENTE

- En `45062280254`, el documento global cabía pero `<main>` reportó 363 px al abrir mapa y seleccionar tracking. El contenedor vertical y su panel flex conservaban ancho mínimo intrínseco.
- Fix: `min-w-0` en raíz, layout contenido, mapa y sidebar; Playwright revalida main/documento en 320 px.
- `npm run lint`, `npm run build`, discovery de 33 y diff-check pasan con el SHA local. Integración completa pendiente.

## 2026-11-22 — Action Front 45063487802 repitió overflow de mapa y corrigió aserción de evidencia — CORREGIDO Y VALIDADO

- La suite integrada volvió a medir `main.scrollWidth=363` a 320 px; `min-w-0` solo no limitó el área desplazable interna del mapa. Se añade ancho `w-full/max-w-full` y `overflow-hidden` al contenedor del mapa y a su layout.
- Historial ya normalizaba la respuesta real: la operación E2E agrega dos notas y una foto, por eso la tarjeta mostraba **3 evidencias**, no 1. Se corrige la expectativa manteniendo aserciones de foto/descrición en el detalle.
- Acción fallida: `45063487802`, **31/33**. La corrección pasó los 33 E2E autenticados en Action `45064475585`.

## 2026-11-22 — Panel empresarial mostraba funciones del sistema no disponibles — CORREGIDO; NUEVA CI PENDIENTE

- Reauditoría detectó que el panel visible para Admin presentaba cifras como si fueran globales, aunque la API está confinada a su empresa. El resumen también inventaba una versión, estado operativo y eventos de actividad; importación y reinicio sólo mostraban un toast y no ejecutaban operaciones.
- Se limitó el panel a administración empresarial, se quitaron versiones/logs y acciones no implementadas, y los totales ahora cuentan explícitamente roles y estados reales de ruta/vehículo. La exportación disponible conserva alcance de empresa.
- La política de asignar rol Admin a otro miembro continúa sin decisión; este cambio no modifica permisos ni endpoints.
- La misma auditoría encontró búsqueda ausente en Equipo/Conductores y faltaba ejercitar edición/cancelación de ruta en ambos anchos. Se añadieron búsquedas y pruebas Playwright nuevas; la suite autenticada integrada del nuevo SHA sigue pendiente.

## 2026-11-22 — Comandos de inspección/documentación con sintaxis o anclas incorrectas — SIN CAMBIOS DE PRODUCTO

- Una consulta shell terminó con `unexpected end of file` por un `&&` final; se repitió sin el operador sobrante.
- Dos parches documentales fueron rechazados porque las líneas ancla supuestas no coincidían con el contenido real. No cambiaron archivos; se leyó el contexto exacto y se aplicó el contenido usando las líneas existentes.
- Prevención: leer el bloque literal antes de formular un hunk y no cerrar una cadena de comandos con un operador de control sin comando siguiente.

## 2026-11-22 — Búsquedas hicieron ambiguos los locators del ciclo Driver — CORREGIDO; CI PENDIENTE

- Action `45067692881` pasó lint/build/audit/responsive y backend xUnit **107/107**, pero E2E terminó **34/35**. En el caso de alta Driver, `getByPlaceholder("Documento")` coincidía con el campo del formulario y con inputs de búsqueda del Equipo/Conductores; Playwright lanzó strict mode violation. El selector de Teléfono también dependía de placeholder.
- Solución: usar `getByRole("textbox", { name: "Documento" })` y el nombre accesible "Teléfono". Se mantiene el contenido de producto y los límites verificados.
- Prevención: si se agregan controles de búsqueda junto a formularios, los E2E deben apuntar a nombres accesibles/roles y comprobar unicidad semántica, no asumir unicidad de placeholder.
- La corrección integrada pasó Action `45068474426`: **36/36 E2E** y cleanup. Un commit siguiente eliminó dependencia del dato preexistente creando y desactivando un Driver temporal; Action `45069041959` pasó de nuevo **36/36** con cleanup.

## 2026-11-22 — Fixture E2E de búsqueda no admitía token nullable — CORREGIDO LOCAL

- Al quitar la dependencia de que existiera un Driver previo, el E2E empezó a crear un conductor descartable por API y a desactivarlo en `afterEach`. El primer build detectó que `page.evaluate` puede devolver `null`, incompatible con el tipo opcional `string | undefined` del token.
- Solución: normalizar `null` a `undefined` antes de almacenar el token. Lint pasa; build local repetido pendiente y Action autenticada cubre el ciclo real.
- Prevención: tipar los resultados de browser storage como nullable y normalizar explícitamente al cruzar el límite Playwright/UI.

## 2026-11-22 — Guía local Next.js consultada después del primer cambio — PROCESO CORREGIDO

- El `AGENTS.md` exige leer la guía instalada de Next antes de escribir código. En el primer lote de componentes se omitió ese paso.
- Antes de continuar se leyeron `01-app/03-api-reference/01-directives/use-client.md` y `01-app/01-getting-started/05-server-and-client-components.md`. Los componentes ya pertenecen a la frontera cliente y usan estado/eventos locales; no hay cambios de API Next requeridos. Build y lint pasan.
- Prevención: iniciar cada sesión de implementación leyendo la guía específica de la versión desde `node_modules/next/dist/docs/`, como exige AGENTS.
## 2026-11-22 — Reintento de carga empresa era sensible a carreras de contexto — CORREGIDO Y VALIDADO

- Las Actions `45072706025`, `45073324431`, `45074489447`, `45075092805`, `45075805793`, `45075980605` y `45076444690` registraron fallos distintos de selector/secuencia al simular 503 y recuperar Users/Routes/Vehicles. La causa común fue que tests globales o respuestas compartidas cambiaban con tabs, toasts y refresh automáticos.
- Se acotaron locators al panel correcto, se comprobó cada mensaje de error específico, se separaron interceptores 503 por recurso y se reordenó el retry según los efectos de navegación. La respuesta tardía de Users se ignora por secuencia. No se relajaron verificaciones de producto.
- Action `45076629351` en `2147be7`: 37/37 E2E, responsive 1/1, audit/lint/build y cleanup pasaron.
- Prevención: usar fallos por endpoint en mocks de estado compartido, locators acotados al panel y aserciones de recuperación sobre el error específico esperado.

## 2026-11-22 — CRUD de Gestión de Conductores no tenía E2E propio — PRUEBA AGREGADA

- Auditoría responsive observó que el test de la pantalla dedicada sólo creaba un Driver por API y probaba búsqueda, aunque la vista implementa alta, edición, asignación/desasignación y baja/reactivación. El CRUD en Gestión de Equipo no valida esta pantalla independiente.
- Se añadió un flujo Playwright con interacciones a 320 px, verificación a 768 px y lecturas autenticadas API para comprobar persistencia. Lint/build, discovery 38 y diff-check pasan; Action E2E y limpieza integrada todavía pendientes.
- Prevención: cubrir cada flujo de CRUD en la vista operativa donde se ofrece, no inferir su funcionamiento desde otra pantalla que comparte el backend.

## 2026-11-22 — Selector de vehículo del E2E conservó contexto anterior — CORREGIDO LOCALMENTE

- Action `45078351055` ejecutó 38 escenarios y falló sólo el nuevo CRUD de conductores al seleccionar el Vehicle. El trace confirmó que el vehículo QA se creó por API después del login, pero `FleetContext` no había recargado su lista; el `<select>` sólo contenía “Selecciona vehículo”. El resto del flujo (alta/edición) sí se ejecutó y el cleanup integrado corrió.
- El test ahora recarga la página después de provisionar el vehículo, antes de abrir Gestión de Conductores, para que el contexto consulte la flota persistida como ocurriría al entrar en una sesión actualizada. Repetir Action API/MySQL para verificar asignación, desasignación y cleanup.
- Prevención: cuando un E2E crea por API recursos que una vista ya cargada consume desde contexto global, refrescar esa fuente antes de probar los controles dependientes y confirmar opciones en el snapshot/trace.

## 2026-11-22 — Locator de la tarjeta Driver coincidía con opciones de flota — CORREGIDO LOCALMENTE

- Action `45079269083` ejecutó 37/38. El nuevo caso alcanzó la tarjeta, pero `filter({ hasText: documentNumber })` coincidía con varias tarjetas porque el vehículo y el documento compartían el mismo texto; todas las tarjetas activas contienen ese vehículo en su selector.
- Se separaron placa/documento con sufijos distintos y ahora el test consulta el ID creado desde `GET /Drivers`, usando `data-testid="managed-driver-{id}"`. No se relajó la aserción.
- Prevención: las tarjetas contienen texto auxiliar en selectores; para identificar recursos creados usar el ID persistido por API y mantener las claves de vehículo/documento distintas.
- La primera validación de build de esta corrección encontró una redeclaración TypeScript: el nombre `persistedDriver` ya identificaba la respuesta HTTP de verificación final. Se renombró la variable del lookup inicial a `createdDriver`; repetir lint/build y ejecutar Action.

## 2026-11-22 — Asignación de vehículo no quedó confirmada por API en E2E — INVESTIGACIÓN ABIERTA

- Action `45080069469` (SHA `4206b0d`) ejecutó **37/38**: al asignar un vehículo a un Driver recién creado, la UI mostró la placa pero `GET /Drivers/{id}` devolvió `vehicleId: null`. El locator ya apuntaba al ID real consultado desde API. Action `45080342001` (SHA `e18ea0f`) terminó success con **1 flaky**: el mismo caso falló igual en el intento inicial y pasó en retry; no se cuenta como pase estable.
- Trace confirma `PUT /Drivers/{id}/assign-vehicle` body correcto y HTTP 204; el estado mostrado en la tarjeta provino de la actualización optimista del contexto. La Action `45081264602` comprobó que también el GET directo al origen (sin rewrite Next) devolvía null, así que la rewrite queda descartada. Smoke backend separado sí valida asignación/lectura de Driver sin UserId; la hipótesis prioritaria es persistencia/aislamiento de la instancia integrada.
- Action `45081992619` consultó MySQL y confirmó `VehicleId=NULL` tras el PUT 204, por lo que la fila no tenía asignación al comprobarla. El retry vuelve a pasar. Para probar interferencia entre fixtures E2E concurrentes, CI se configura temporalmente con un worker; mantener asserts SQL/API.
- No se relajó la comprobación ni se declaró el CRUD validado. Si un worker elimina la falla, localizar el fixture concurrente; si persiste, revisar el estado transaccional/SQL del comando backend.
- Prevención: para acciones que responden 204, verificar siempre el recurso persistido; el estado optimista del frontend por sí solo no demuestra éxito durable.
# 2026-11-23 — Tipos al derivar la opción de cuenta raíz

- **Síntoma:** primer `next build` no completó TypeScript: el `.filter()` de roles se infería como `string[]`; además, al cambiar `mapApiUser(apiUser, accessToken?)`, pasar la función directamente a `.map()` hacía que TypeScript interpretara el índice como `accessToken`.
- **Causa:** filtro sin guard de tipo y callback de mapeo con parámetro opcional que colisiona con la firma `(value, index, array)`.
- **Solución:** usar guard explícito `role is UserRole` y una lambda `.map((apiUser) => mapApiUser(apiUser))` en el catálogo de usuarios.
- **Prevención:** tras ampliar la firma de callbacks de colecciones, reemplazar referencias directas a la función por lambdas cuando los argumentos opcionales puedan coincidir con `index`/`array` y mantener el tipo del catálogo explícito.
- **Verificación:** repetir `npm run lint`, `npm run build` y `npm run test:e2e -- --list`; documentar salida final al terminar.

# 2026-11-23 — La prueba inicial no cubría Admin delegado y asumía navegación móvil

- **Síntoma:** auditoría independiente detectó que la primera aserción sólo comprobaba que Admin raíz veía “Gerente”; no verificaba que Admin delegado careciera de esa opción para alta y promoción. El E2E delegado inicial expiró buscando “Abrir menú”.
- **Causa:** cobertura positiva incompleta y el caso delegado no fijaba un viewport móvil; en el viewport desktop la navegación aparece en la barra lateral y no usa hamburger.
- **Solución:** nuevo E2E delegado simula JWT con `owner_id` distinto al ID autenticado, API de equipo válida y verifica ausencia de “Gerente” tanto en alta como en la tarjeta existente. Navega directamente por “Gestión de Equipo”.
- **Prevención:** probar explícitamente ambos lados de reglas de permisos en la interfaz y usar la navegación correspondiente al viewport del escenario.
- **Verificación:** prueba enfocada posterior pasó 1/1 en 1.8 s. Repetir suite local y confirmar CI integrada para el SHA nuevo.

# 2026-11-23 — Admin raíz quedó clasificado como delegado en navegador E2E

- **Síntoma:** Action `45088879212` pasó lint/build/responsive browser, pero falló el E2E en 38/39: raíz autenticado abrió Gestión de Equipo y el selector no incluía “Gerente”. La traza preservada muestra login y `/Auth/me` 200.
- **Causa:** el frontend infería `isRootAccount` desde el JWT, pero `/Auth/me` no proporcionaba explícitamente esa clasificación; la inferencia no coincidió con el contexto autenticado real.
- **Solución:** backend añade `isRootAccount` a `/Auth/me` a partir de `OwnerUserId` (nulo o igual al ID); Front prioriza el dato del endpoint. Smoke backend comprueba root true/delegado false y E2E delegado cubre ausencia de opción.
- **Prevención:** atributos de identidad/autorización para UX deben exponerse como campos explícitos desde el contrato autenticado y probarse mediante sesión integrada, además de las pruebas simuladas.
- **Verificación:** CI del SHA con el contrato nuevo pendiente; la corrida fallida reportó 38 passed y 1 failed, cleanup correcto.

# 2026-11-23 — Locator E2E rechazaba la etiqueta descriptiva del rol Gerente — CORREGIDO LOCALMENTE

- **Síntoma:** Action `45090273209` terminó 39/40. El E2E esperaba un botón cuyo nombre accesible fuera exactamente “Gerente”.
- **Causa:** el botón agrega una descripción accesible y Playwright lo expone como “Gerente Administra equipos y rutas”; la opción estaba presente y visible. La traza contradice la hipótesis inicial de que `/Auth/me` siguiera clasificando la raíz como cuenta delegada.
- **Solución:** el locator ahora acepta el prefijo `Gerente` y el E2E comprueba antes que `/Auth/me` responda `isRootAccount: true` y rol `Admin`.
- **Prevención:** inspeccionar snapshot/trace y el nombre accesible real antes de atribuir un fallo de selector a lógica de autorización. No usar `exact: true` si el control expone descripción accesible.
- **Verificación:** lint y build pasan; Playwright descubre 40 pruebas y `team-management-load-errors.spec.ts` pasa 10/10. Suite integrada en Action pendiente para el nuevo SHA.

# 2026-11-23 — Revisión de ruta ocultaba paradas y búsqueda podía cambiar de destino — CORREGIDO LOCALMENTE

- **Síntomas:** el paso final resumía el recorrido con sólo el conteo, origen y destino; no mostraba el orden, nombres ni si cada parada era recogida, entrega o ambas. Una búsqueda Nominatim pendiente podía publicar resultados después de seleccionar otro punto, y el click usaría el nuevo destino.
- **Causas:** el resumen no representaba el arreglo de paradas y el fetch de búsqueda no estaba ligado a una identidad de destino ni cancelado en cambios de selección.
- **Solución:** la revisión lista origen, paradas en orden y destino con operación por parada y coordenadas; cada búsqueda captura el destino, usa AbortController/secuencia y descarta resultados tras cambiar de objetivo. El E2E tablet cubre resultado real simulado, vacío, fallo, respuesta tardía y primer POST 503 con retry/persistencia posterior.
- **Prevención:** revisión final debe exponer la secuencia logística completa antes de confirmar; las búsquedas asincrónicas deben cancelarse o invalidarse al cambiar su entidad destino; cubrir estados de error y reintento además del éxito.
- **Verificación:** lint/build y discovery previos a la última ampliación pasaron; discovery continúa en 40 pruebas. Ejecutar lint/build, validar el E2E autenticado nuevo en CI API/MySQL y corregir cualquier fallo antes de cerrar.

# 2026-11-23 — Búsqueda de dirección podía cruzar destinos — CORREGIDO Y VALIDADO

- **Síntoma:** el resumen final no mostraba el orden ni el tipo de cada parada; una respuesta Nominatim tardía podía aparecer tras cambiar el punto seleccionado.
- **Solución:** resumen ordenado con origen, operaciones y destino; cancelación/invalidez por destino y secuencia.
- **Verificación:** Action `45092540906`, 40/40 E2E, responsive 1/1, lint/build/audit y cleanup. El E2E cubre respuesta, vacío, error, carrera y retry HTTP 503 con persistencia.
- **Prevención:** incluir estado, orden y operación en confirmación de logística; invalidar solicitudes asíncronas cuando cambia el objeto al que pertenecen.

# 2026-11-23 — Historial ocultaba operaciones y permitía respuestas de polling fuera de orden — CORREGIDO LOCALMENTE

- **Síntomas:** detalle decía “Puntos de Entrega” y no mostraba tipo/estado; primera carga podía combinar spinner con mensaje vacío; respuestas superpuestas de polling/focus podían sobrescribir datos nuevos con antiguos.
- **Solución:** incluir etiquetas y estado de cada parada operativa; renderizar loading/error/empty/list como estados excluyentes; ignorar nuevas consultas mientras hay una activa. Se tiparon `operation/status` camelCase/PascalCase en los puntos.
- **Verificación:** lint/build y E2E Historial 2/2; la suite integrada nueva queda pendiente.
- **Errores de implementación y prueba:** primer build falló porque `includes` se llamaba sobre una unión `string | number`; se separó valor numérico/textual. Primera prueba de carga dejó pasar la respuesta 503 antes de renderizar Historial porque sólo detuvo una solicitud global de rutas; ahora espera el heading del panel y mantiene detenidas todas las respuestas de rutas durante la aserción. Prueba de foco asumía una sola solicitud dashboard y hamburger desktop; usa baseline real de solicitudes y viewport móvil. Repetición 2/2.
- **Prevención:** reducir tipo explícitamente antes de operaciones string; sincronizar E2E con el panel visible y modelar todas las consultas de la ruta interceptada; no fijar conteos globales si Dashboard y Historial comparten endpoint.

# 2026-11-23 — Exploración con paths equivocados — CORREGIDO

- `rg app` falló porque el App Router real está en `src/app`; `rg e2e` se lanzó desde Backend, donde no existe esa carpeta; `/home/leonardo/Back_gps` usó casing incorrecto; se intentaron `BackEnd_Gps/Api` y `BackEnd_Gps/Application` aunque las carpetas reales son `fletflow/Api` y `fletflow/Aplication`.
- Se corrigió cada consulta ubicando primero repo/estructura real con `rg --files`/`find`; no se modificaron datos o código por esos errores.
- Prevención: confirmar cwd y `rg --files` antes de buscar rutas inferidas; el backend preserva la carpeta `Aplication` con esa grafía.

# 2026-11-23 — Action del Historial cerró sesión en E2E por endpoint de dashboard sin simular — CORREGIDO LOCALMENTE

- **Síntoma:** Front Action `45094647703` terminó 40/41; test “Historial evita consultas duplicadas…” agotó 30 s en click de “Abrir menú”, que se desmontaba del DOM. Trace snapshot mostraba pantalla de Login.
- **Causa:** el fixture mockeaba `/Auth/me` y `/Routes`, pero omitía `/Routes/assignment-options`. Dashboard llamó el API real con el token sintético de Playwright; recibió 401, refresh también 401 y AuthContext cerró la sesión durante el click.
- **Solución:** interceptar assignment-options y responder lista vacía para vehículos y conductores.
- **Verificación:** los dos E2E de Historial pasan localmente 2/2; nueva Action integrada pendiente.
- **Prevención:** en pruebas de pantalla con respuestas auth simuladas, interceptar todas las solicitudes que dispara el Dashboard además del recurso propio del componente; revisar trace/red antes de culpar un locator.

# 2026-11-23 — Resumen auxiliar falló por sintaxis en comando Node — CORREGIDO

- **Síntoma:** un comando `node -e` para extraer un resumen de estado terminó con error de sintaxis antes de leer los resultados.
- **Causa:** comillas anidadas en el código inline chocaron con el quoting del shell.
- **Solución/previsión:** para procesar JSON de CI, usar un script temporal o un heredoc con delimitadores claros; validar primero el comando con una entrada pequeña. No afecta archivos del repositorio ni resultados de pruebas.

# 2026-11-23 — E2E de confirmación no accedía al botón en viewport bajo — CORREGIDO

- **Síntoma:** primer intento del caso de Gestión de Equipo excedió el timeout al buscar el botón del equipo con viewport móvil.
- **Causa:** la navegación colapsada dejaba el botón fuera de pantalla; no era un fallo del diálogo.
- **Solución:** entrar a Gestión de Equipo en viewport de escritorio y reducir el viewport ya con el diálogo abierto; el test revisa ancho/alto y uso de botones a 320×360.
- **Verificación:** E2E enfocado pasó 1/1; lint y build pasan.
- **Prevención:** separar prueba de navegación móvil de prueba de accesibilidad vertical; abrir el componente antes de cambiar viewport cuando se mide el diálogo.

# 2026-11-23 — Action Front 45099148002 detectó cinco fallos E2E — CORREGIDOS LOCALMENTE

- **Conductor ocupado:** el test no encontraba el fixture porque `RoutesManagement` ocultaba los conductores no disponibles en vez de mostrarlos deshabilitados. Se corrigió mostrando todas las opciones y deshabilitando el estado ocupado; el test ahora intercepta la ruta real `/api/backend/Routes/assignment-options` y usa el valor de opción estable.
- **Traslado:** E2E intentaba pulsar “Ver mapa” después de “Ubicar”; ese botón ya abrió el mapa y cambió a “Ver paradas y detalles”. Se quitó el click duplicado y se verifica el estado visible correcto.
- **Tres pruebas preexistentes de rol/estado:** el nuevo diálogo de confirmación detuvo solicitudes que los tests esperaban inmediatamente. Se añadieron confirmaciones explícitas para cambio a Manager/Logistics/Driver y desactivación de cuenta.
- **Verificación de corrección local:** lint/build pasan; test de confirmaciones 1/1; discovery 43; diff-check pasa. La repetición integrada API/MySQL de los cinco casos está pendiente.
- **Prevención:** al agregar confirmaciones, buscar todos los consumidores E2E de mutaciones asociadas; mostrar recursos no disponibles con estado claro si la decisión UX es explicar por qué no se pueden seleccionar; comprobar el texto/estado del control tras cada transición móvil.

- **Reintento Action 45100344654:** 42/43 pasaron; el test del ciclo Driver tenía además otra desactivación (de un User regular creado por el propio E2E) sin confirmar el diálogo. Se añadieron las confirmaciones para ambas acciones. El cleanup SQL también devolvió error al fallar el test; el runner oculta stderr de MySQL, así que la nueva Action debe comprobar limpieza; si se repite, instrumentar el runner para mostrar el error MySQL sin exponer credenciales.


- **Tercer intento Action 45101175529:** persistió el mismo test (42/43); avanzó tras desactivar al usuario asociado al Driver y se detuvo en la desactivación del User regular. Se agregó la segunda confirmación explícita. El cleanup SQL vuelve a emitir error sólo porque el test falla antes del cleanup de pantalla; revisar si se repite con los 43 tests verdes.
- **Consulta auxiliar con ruta incorrecta:** se buscó `scripts/` desde el repo Front, donde ese directorio no existe; la búsqueda equivalente se hizo en `/home/leonardo/Back_GPS`. Sin cambio de código. Prevención: localizar el repo dueño del script antes de `rg`.

- **Cuarto intento Action 45101809749:** el mismo escenario ya pasó ambas bajas; quedó sólo la reactivación del User regular, también pendiente de confirmar. Añadido `Sí, activar cuenta`. El patrón muestra que todos los cambios de estado de cuenta (activar y desactivar) deben confirmar antes de esperar la mutación; el test cubre ambos. Cleanup falló tras la interrupción prematura.


# 2026-11-23 — Action 45102498423 pasó Playwright pero falló cleanup MySQL

- **Resultado:** responsive 1/1 y **43/43 E2E** en API/MySQL efímeros. El job acabó con error en cleanup tras los tests verdes.
- **Causa:** el runner backend silenciaba stderr de mysql, así que no se sabía por qué falló el SQL de limpieza.
- **Solución:** Backend `2ff5560` captura la salida temporal y la imprime sólo si el cleanup falla; luego elimina el archivo. Repetir Action para obtener diagnóstico/confirmar limpieza.
- **Prevención:** el éxito de pruebas no se considera total si la limpieza de datos QA devuelve error; exigir ambos resultados.


# 2026-11-23 — Action 45103134467: FK 1451 en limpieza posterior a 43/43 E2E

- **Síntoma:** Playwright pasó 43/43; cleanup SQL no pudo borrar un Driver QA.
- **Causa:** quedó una ruta asociada al Driver con nombre fuera de `E2E QA ruta %`; FK `Routes.DriverId` usa RESTRICT.
- **Solución:** Backend commit `7ea14a6` elimina posiciones/rutas vinculadas a Drivers QA (`DocumentNumber LIKE 'E2EQA%'`) antes de borrar Drivers.
- **Prevención:** limpiar por la relación foránea real además del patrón del nombre de fixture. Validar con la siguiente Action, sólo en DB descartable.


# 2026-11-23 — Cleanup QA por FK Driver resuelto y verificado

- El SQL ampliado en Backend `7ea14a6` elimina RoutePositions/Routes ligadas a Drivers E2E antes de eliminar Drivers.
- Front Action `45103761122` cerró en success: responsive **1/1**, Playwright **43/43**, cleanup MySQL completado; no hubo error 1451.
- Backend Action `45103732510` pasó build/tests y smoke HTTP/MySQL tenant/concurrencia.
- Causa, corrección y prevención quedan registradas en este historial; no ejecutar cleanup en la DB local persistente.
