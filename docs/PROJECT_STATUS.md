## Auditoría adicional de usuarios, Admin raíz y baja de rutas — CI aprobado — 2026-11-23

- E2E de dos tenants ahora intenta cambiar estado, perfil y rol de un usuario ajeno. Se esperan tres 404, ausencia en `/Users/my-team` del atacante e invariancia de perfil/rol/estado para el propietario.
- Administración raíz promueve temporalmente un Driver a Admin por la UI, verifica `PUT` y persistencia en equipo, y restaura su rol. La fila tiene un `data-testid` asociado al ID.
- El selector de rol de Administración ahora pide confirmación explícita; el E2E prueba cancelación sin mutación, confirmación, restauración y responsive a 320/768 px.
- Tras eliminar ruta desde el mapa, el E2E consulta el recurso y verifica `isActive=false` persistido.
- Primer lote `bd38edd`: Action [`45151010627`](https://github.com/Paul1578/Front_gpsR/actions/runs/45151010627) pasó **51/51 E2E**, responsive **1/1**, audit/lint/build, Backend Release/xUnit y cleanup API/MySQL.
- Código final `d358166`: Action [`45151685501`](https://github.com/Paul1578/Front_gpsR/actions/runs/45151685501) pasó **51/51 E2E**, responsive **1/1**, Backend Release/xUnit, audit/lint/build y cleanup. Incluye cancelar promoción sin PUT, promoción Admin raíz persistida, restauración a Driver, 320/768 px y los tres ataques cross-tenant a Users.

## Correo duplicado en Gestión de Equipo — validado por Action — 2026-11-23

- El E2E crea Manager/Logistics por UI y vuelve a enviar desde el formulario el mismo correo con username distinto, sin interceptar la API. Comprueba HTTP 409, mensaje, modal abierto y una sola cuenta persistida en `/Users/my-team`.
- `npm run lint`, `npm run build`, discovery Playwright (**51 tests**) y `git diff --check` pasaron localmente. Action [`45142003636`](https://github.com/Paul1578/Front_gpsR/actions/runs/45142003636) en `e37cfeb` pasó **51/51 E2E**, responsive **1/1**, audit, lint/build, Release/xUnit y cleanup de API/MySQL descartables.

## Estado actual — 2026-11-23 (edición Logistics validada)

- Añadida cobertura E2E autenticada para editar desde el constructor una ruta de Logistics, validar `PUT /Routes/{id}` y consultar el GET persistido; luego el flujo verifica cancelación e historial.
- Validación local: `npm run lint`, `npm run build`, `npx playwright test --list` (**51 tests**) y `git diff --check` pasan.
- Validado por Actions [`45132992521`](https://github.com/Paul1578/Front_gpsR/actions/runs/45132992521) y [`45132956752`](https://github.com/Paul1578/Front_gpsR/actions/runs/45132956752): **51/51 E2E** en cada corrida, backend Release/xUnit, audit/lint/build, responsive y limpieza de API/MySQL efímeros.
- El E2E Driver existente además cubre dos paradas operativas en orden, evidencia nota/foto, rechazo sin evidencia, cierre y lectura desde Historial; Action [`45131410815`](https://github.com/Paul1578/Front_gpsR/actions/runs/45131410815) pasó **51/51** contra API/MySQL descartables.

## Manager edita rutas desde UI — validado por Actions — 2026-11-23

- La auditoría detectó que el E2E Manager cancelaba la edición tras abrir el editor. Ahora modifica nombre/descripción, guarda y comprueba por GET persistencia de ruta, asignación y parada.
- Lint/build, discovery **51 tests** y diff-check pasan localmente. Actions [`45133416432`](https://github.com/Paul1578/Front_gpsR/actions/runs/45133416432) y [`45133412567`](https://github.com/Paul1578/Front_gpsR/actions/runs/45133412567) pasaron **51/51 E2E** cada una con API/MySQL descartables, Release/xUnit, audit/lint/build, responsive y cleanup. El fixture conserva restauración del rol y limpieza en `finally`.

## Cambio de rol desde Equipo — validado por Actions — 2026-11-23

- Se extiende el E2E real de creación de miembros: cancelación de Manager→Logistics sin mutación, confirmación del PUT, lectura `/Users/my-team` y persistencia visual tras recargar.
- El modal se mide en 320 px y la lista tras recarga a 768 px. Se corrigieron TS7006, copy sin tilde, aserciones de opciones visibles, mock/locator obsoleto. UI usa `roleLabels` compartido.
- Actions [`45138088658`](https://github.com/Paul1578/Front_gpsR/actions/runs/45138088658) y [`45138084594`](https://github.com/Paul1578/Front_gpsR/actions/runs/45138084594) pasaron **51/51 E2E** cada una, incluyendo cancelación sin PUT, cambio Manager→Logistics por UI, lectura API y persistencia tras recarga. Release/xUnit 136/136, audit/lint/build, responsive y cleanup también pasaron.
- Validación local adicional: lint/build, discovery 51, diff-check y test enfocado **1/1**.

## Usuario largo en Gestión de Equipo — responsive límite — validado por Actions — 2026-11-23

- QA identificó que `@usuario` admite 100 caracteres y no tenía regla para partir una cadena continua. El riesgo aún no se había reproducido en navegador.
- Se añade `break-words` a la línea de usuario y el E2E real crea/edita nombres de 93/95 caracteres; verifica overflow y visibilidad a 320/768 px más persistencia API.
- Lint/build, discovery **51 tests** y diff-check pasan localmente. Action [`45139564823`](https://github.com/Paul1578/Front_gpsR/actions/runs/45139564823) pasó **51/51 E2E**, responsive, Release/xUnit, audit/lint/build y cleanup con API/MySQL descartables. El riesgo no se reprodujo como overflow tras corregirlo.

## Estado actual — 2026-11-23

- HEAD documental vigente antes de esta actualización: Front `refactor/route-builder` `fa3e349`; Action [`45148633887`](https://github.com/Paul1578/Front_gpsR/actions/runs/45148633887) pasó **51/51 E2E**, responsive **1/1**, audit/lint/build, Backend Release/xUnit **139/139** y cleanup API/MySQL. Código funcional verificado: `53b7674`.
- Revalidación del HEAD documental `2b3b523`: Action [`45143586336`](https://github.com/Paul1578/Front_gpsR/actions/runs/45143586336) pasó **51/51 E2E**, responsive **1/1**, auditoría, lint/build, Backend Release/xUnit y cleanup. La ruta de correo duplicado con HTTP 409 se ejecutó sin mocks.
- Se amplió el caso de tenant cruzado para cubrir estado/reactivación de vehículo y asignar/desasignar Driver mediante IDs de otra empresa; cada respuesta fue 404 y las lecturas del propietario confirmaron que no hubo mutación. Action [`45146071543`](https://github.com/Paul1578/Front_gpsR/actions/runs/45146071543) pasó **51/51 E2E**, responsive **1/1**, audit/lint/build, Backend Release/xUnit 139/139 y cleanup API/MySQL.
- Backend `chore/stabilize-fleet-platform` código `ca1a278`, docs `c84e9dc`; Action [`45147903362`](https://github.com/Paul1578/Back_GPS/actions/runs/45147903362) pasó Release, xUnit **139/139**, smokes tenant HTTP/MySQL, concurrencia, login rate limit/proxy y cleanup.
- Verificaciones de dependencia recientes: `npm audit` reportó **0 vulnerabilidades** y NuGet no encontró paquetes vulnerables en Backend ni tests. Las revisiones estáticas de seguridad no reportaron bypass tenant/rol/JWT ni vector XSS explotable en el alcance inspeccionado.
- Decisiones confirmadas: se permiten traslados; las paradas pueden ser recogida, entrega o ambas; sólo raíz otorga Admin; la app nativa queda pospuesta.
- Pendientes externos: credenciales SMTP vigentes, rate limiter distribuido, IPs reales de ingress, key ring Data Protection persistente/cifrado y validación de despliegue productivo. La misión permanece abierta para seguir cerrando cobertura técnica alcanzable.

## Historial de estado (las notas siguientes pueden estar superadas)

- Front `a510021` agrega el E2E real de Admin delegado contra API/MySQL descartables, asistido por fixture de Backend `c32febe`: bloquea opciones Admin, recibe 403 en creación/promoción y comprueba la persistencia sin cambios. Lint/build y discovery **51** pasan; Action integrada pendiente.
- Front `refactor/route-builder` HEAD `d0a9342` pasó Action [`45115772569`](https://github.com/Paul1578/Front_gpsR/actions/runs/45115772569): backend Release/xUnit, audit, lint, build, responsive **1/1**, API/MySQL E2E **50/50**, cleanup y teardown. Incluye reset/activación, tema persistente y preservación del horario de ruta.
- La tanda corrige Admin delegado en la vista heredada, tracking GPS vacío, errores de asignación y estados iniciales de Dashboard. La Action ejecutó los 50 E2E en 3.4 minutos sin fallos; lint/build locales correctos.
- `playwright.config.ts` deriva el puerto del `PLAYWRIGHT_BASE_URL`; el E2E integrado corrió con API/MySQL descartables. El test de trazas se omitió correctamente porque los 50 escenarios pasaron.
- El primer intento reutilizó un proceso Next anterior en `:3000`; al usar `:3010`, el webServer seguía arrancando fijo en `:3000`. Configuración corregida y E2E repetido con servidor de producción limpio.
- Backend activo `chore/stabilize-fleet-platform` HEAD `ec15ea6` pasó Action [`45115773126`](https://github.com/Paul1578/Back_GPS/actions/runs/45115773126); el código en `6f48f06` pasó [`45113924558`](https://github.com/Paul1578/Back_GPS/actions/runs/45113924558). Main intacta. Decisiones confirmadas: rutas de traslado permitidas; paradas pickup/delivery/both; sólo raíz otorga Admin; móvil nativo pospuesto.
- Decisiones confirmadas por el usuario: rutas pueden ser traslados sin operaciones; paradas admiten recogida, entrega o ambas; sólo la cuenta raíz puede otorgar/promover Admin; móvil nativo queda para una fase posterior.
- Front Action [`45104448741`](https://github.com/Paul1578/Front_gpsR/actions/runs/45104448741) pasó: audit/lint/build, responsive **1/1**, E2E API/MySQL **43/43** y cleanup. Incluye traslado, mapa, disponibilidad de conductores y confirmaciones de cambios de equipo.
- Backend Action [`45104450114`](https://github.com/Paul1578/Back_GPS/actions/runs/45104450114) pasó; Backend `45103732510` también pasó la corrección de cleanup. Release xUnit **133/133**; smoke tenant HTTP/MySQL y concurrencia.
- Backend limita recuperación a 5 solicitudes/10 min/IP; tokens 256 bits, TTL 60 min por defecto (1–1440), URLs Production HTTPS. Login: 10 solicitudes/min/IP. Sin bloqueo por cuenta.
- Pendientes externos/de producción: SMTP con credenciales vigentes; límites distribuidos e IP confiable detrás de proxy; persistencia del key ring Data Protection.
- Misión global sigue abierta para completar y reevaluar cobertura funcional/roles/responsive más allá de la matriz E2E existente; no presentar esta fase como cierre de toda la plataforma.
- Auditoría independiente: exportación, ciclo reset/activación y persistencia del tema pasan API/MySQL E2E. Root-only está cubierto por smoke HTTP/MySQL backend; el test Front de opciones Admin delegado es simulado.
- El switch de modo oscuro tiene nombre accesible. E2E verifica oscuro/claro en `localStorage` y después de recargar. Action `45113527889` pasó **50/50**; discovery local 50, lint/build correctos.
- Auditoría encontró y corrigió la pérdida de fechas planificadas al editar. E2E lee la ruta después de cada edición y confirma inicio/fin sin cambios en tablet/móvil; Action `45114492930` pasó 50/50.

## Historial de estado — 2026-11-22

- Front `d652652` pasó Action `45085920993`: audit/lint/build, responsive browser **1/1** y **39/39 E2E** sin skips. Backend `1ce4d45` pasó Action `45085910280` con Release/xUnit, aislamiento tenant HTTP/MySQL y concurrencia. La corrección posterior para que el sufijo sobreviva reinicios de worker está en local y requiere repetir Action.
- Front `104723a` pasó Action `45086519736`: **39/39 E2E** incluyendo Manager mapa con `FLETFLOW_E2E_MAP_FIXTURE_SUFFIX` estable, responsive browser **1/1**, audit/lint/build y cleanup.
- Front `8a90494` pasó Action `45086827516`: **39/39 E2E**, responsive **1/1**, audit/lint/build y cleanup; incluye tarjeta Vehicle por ID, label accesible y cancelar confirmación.
- Backend runner `1ce4d45` pasó Action `45085910280`: Release build/xUnit, aislamiento tenant HTTP/MySQL y concurrencia. Front Action `45085920993` pasó audit/lint/build y chequeo responsive; suite E2E autenticada en curso.
- El fix Backend `f8edbcd` pasó xUnit **113/113** y Action `45084368819`; frontend `45084368342` y `45084699175` pasaron **38/39 E2E**: CRUD Driver/asignación, alta de administración de empresa y búsqueda responsive pasaron. El único fallo fue Manager mapa: navegación móvil usada en desktop y fixture Driver compartido; se corrigió localmente con fixtures dedicados/idempotencia.
- `45083215716` confirmó además dos errores de aserción E2E: documento ausente del DTO User y locator que eligió un nodo responsive oculto. UI omite ID vacío, el test usa username y tarjetas Driver por ID. Nueva validación integrada pendiente.
- E2E nuevo Manager mapa (`manager-map.spec.ts`) cubre ruta/vehículo reales y viewports desktop/tablet/móvil web; localmente el test omitió por falta de API/credenciales. El run integrado debe confirmar ejecución real.
- Al revisar el runner se detectó y corrigió que faltaba exportar `FLETFLOW_E2E_DRIVER_USER_ID`; verifica que el Action no marque Manager mapa skipped.
- Estado de ramas: Front `refactor/route-builder` (`baa0288` remoto + fix Manager local); Backend `chore/stabilize-fleet-platform` (`44d224a` remoto + fixtures Manager locales); `main` intacta. Front lint/build/discovery **39** pasan. Falta publicar el aislamiento Manager y ejecutar una Action Front con `manager-map` verde.
- Auditoría Front detectó que reiniciar el worker regeneraría el UUID y escaparía al cleanup. El runner exporta ahora `FLETFLOW_E2E_MAP_FIXTURE_SUFFIX`, consumido por el spec; validación integrada sigue en curso.
- Se estabilizaron selectores del CRUD de vehículos con VehicleId/nombre accesible y se añadió comprobación de cancelar baja; local lint/build/discovery 39 pasan, CI posterior pendiente.

- Auditoría detectó que `SuperAdminView` sólo probaba el formulario de alta sin enviarlo. Commit `f07d37d` añade E2E de creación Driver, lecturas persistidas User/Driver y UI/SMTP; lint/build/discovery 38 pasan, Action `45083215716` pendiente.

- Front `e18ea0f` publicado: Action `45080342001` terminó success con 37 passed y 1 flaky (asignación Driver/Vehicle falló en intento inicial, pasó en retry). El E2E local ahora compara GET directo al backend y vía rewrite `/api/backend` para diagnosticar. Persistencia estable abierta; ver `ERROR_LOG.md`.
- El diagnóstico directo vs. rewrite pasa localmente lint/build y discovery **38 tests**; el cambio quedó pendiente de commit/Action.
- Action `45081264602` confirmó que GET directo también da null. `b5b9f21` consulta SQL `Drivers.VehicleId` directamente; validación local de lint/build/discovery **38 tests** y diff-check pasó. Action `45081992619` confirmó NULL en SQL después de la respuesta 204.
- Action `45081992619` confirmó en SQL que `VehicleId` queda NULL tras 204 (retry pasa). Se limita CI a un worker como prueba de aislamiento para detectar interferencia entre fixtures E2E; se mantienen asserts SQL/API. Validación local y nueva Action pendientes.
- Backend `fa16d05` publicado en `chore/stabilize-fleet-platform`; smoke local amplía 403 de Manager/Logistics con snapshots MySQL intactos. Action `45080063668` en curso.
- E2E de búsqueda de Equipo ampliado: miembros interactivos a 320 px, conductores a 768 px y comprobación de overflow; lint/build, discovery **38 tests** y diff-check pasan local. Cambios pendientes de commit/Action. La Action previa `45080069469` está ejecutando los 38 E2E con backend `fa16d05`.
- Misión abierta: quedan más criterios de CRUD/roles/responsive. Admin delegado y desvinculación User↔Driver siguen a la espera de decisión; app nativa aplazada y SMTP/infraestructura productiva externos.

- Front `refactor/route-builder`: `2147be7` pasó Action `45076629351` y documentación HEAD `8887649` pasó `45077576665`: ambas con **37/37 E2E**, responsive **1/1**, build/lint/audit y cleanup API/MySQL exitosos.
- El formulario Driver del panel se comprobó a 320/768 px; el guardado parcial de Vehicle actualiza la UI cuando persiste detalle pero falla el cambio de estado. E2E integrado queda cubierto por Actions recientes.
- Auditoría responsive encontró que Gestión de Conductores sólo tenía búsqueda E2E. El nuevo test de CRUD dedicado (38 tests) recarga FleetContext antes de asignar. Action `45078351055` fue 37/38 por opciones de Vehicle no refrescadas; `45079269083` llegó a 37/38 y reveló locator ambiguo por placa/documento iguales. Ahora usa sufijos distintos e ID leído por API; lint/build/discovery local pasan. Nueva Action pendiente.
- Front `5d4e290` también pasó Action `45071113746`: 36/36 E2E, responsive 1/1, backend xUnit 110/110 y cleanup.
- Backend `87b208e` pasó Action `45071475764`: build, xUnit **111/111**, smoke HTTP/MySQL tenant, concurrencia y cleanup; adicionalmente smoke local efímero completo.
- Misión abierta. No hay definición de producto sobre Admin delegado ni desvinculación de User/Driver; móvil nativo aplazado y SMTP/infraestructura de producción son externos.

## Registro público duplicado desde UI — validado en Action

- Se amplió el test para repetir un email existente desde el formulario, validar response neutral idéntica, toast de éxito neutral y redirección a Login; después autentica la cuenta original.
- Action `45071113746` ejecutó el nuevo test en el commit `5d4e290`; 36/36 E2E, backend 110/110, responsive 1/1 y cleanup success.

## Evidencia obligatoria por parada — validado local; CI pendiente

- Se corrigió API que permitía Completed/Skipped sin evidencia y dejaba la operación atascada. El dominio exige evidencia; DriverView deshabilita Omitir sin evidencia.
- Backend xUnit **110/110**, smoke HTTP/MySQL descartable y cleanup cero. Smoke confirma 400 sin cambios al omitir/completar parada y cerrar ruta, luego el ciclo válido funciona.
- Front lint/build/audit 0/discovery 36 pasan; Action E2E para el fix pendiente.

# Estado actual — 2026-11-22 (QA administración)

- Action `45072706025` (SHA `7f4841c`) terminó 35/37. Errores: Exportar buscado en tab equivocado; Gestión de Equipo no reflejaba error de Driver compartido tras carrera con solicitudes duplicadas. Documentados y corregidos localmente.
- Action `45073324431` en `147ba89` terminó 36/37; sólo falló un conteo global de `—` que incluía métricas ajenas. Locator restringido a “Resumen de Datos”; requiere Action nueva.
- Action `45074489447` en `00f3b7c` terminó 36/37; único fallo era el toast de bienvenida atrapado por un conteo global ARIA. Aserciones ahora usan los mensajes de error específicos. Repetir Action para validar también persistencia parcial de vehículo.
- Action `45075092805` en `ae34fa9` terminó 36/37; al navegar a Usuarios, rutas/vehículos se recuperaban automáticamente antes del retry. Secuencia reordenada; nueva Action debe validar además el test de persistencia parcial del vehículo.
- Action `45075805793` para `067793e` también terminó 36/37; el retry de flota disparó el refresco de miembros y quitó su botón. Secuencia reordenada a retry User antes de recuperación automática de flota.
- El E2E ahora mantiene 503 independientes para endpoint de usuarios y endpoints de rutas/vehículos hasta ejecutar sus respectivos reintentos. Action de validación nueva pendiente.
- Action `45075980605` en `4eec893` terminó 36/37; responsive 320/768 pasó, retry de flota fue único fallo. La prueba ahora usa banderas independientes por grupo.
- Se amplió test del formulario empresa con interacción Driver sin overflow a 320/768 px; validación integrada pendiente.
- Front local corrige actualización parcial del vehículo al fallar su segunda solicitud de cambio de estado; E2E fuerza 409 y verifica UI+GET. Falta validación local y Action del commit actual.
- E2E actualizado: tab correcto, un retry conjunto, retry independiente de usuarios, conteos `—`. Gestión de Equipo ya presenta error compartido FleetContext. Solicitudes `/Users/my-team` obsoletas no pisan resultados nuevos.
- `npm run lint`, `npm run build` y discovery Playwright (37) pasan localmente. Falta commit/push y nueva Action con API/MySQL efímeros.
- Política de asignación del rol backend Admin y desvinculación User↔Driver están en consulta al usuario. No cerrar esos criterios sin decisión.

# Estado actual — 2026-11-22

- Front `refactor/route-builder`, Backend `chore/stabilize-fleet-platform`; ramas `main` intactas.
- Front local añade búsqueda insensible a tildes/case en Gestión de Conductores y E2E responsive 320/768; locator ambiguo del Action `45067692881` corregido usando roles/nombres accesibles. Nueva Action pendiente; lint/build/audit y discovery 36 pasan local.
- Action `45067692881` tuvo backend **107/107**, audit/lint/build y responsive **1/1** verdes, pero E2E **34/35** por ese locator. No se cuenta ese lote como integrado hasta que el rerun pase.
- La corrección sí pasó Action `45068474426`: **36/36 E2E**, responsive 1/1, backend, audit/lint/build y cleanup. `58e2b4c` agrega fixture Driver propio al E2E de búsqueda, sin depender de filas existentes; Action `45069041959` también pasó **36/36**, backend 107/107, responsive y cleanup.
- Front `57e44c6` pasó Action [`45066249833`](https://github.com/Paul1578/Front_gpsR/actions/runs/45066249833): Backend Release/xUnit **107/107**, audit, lint/build, responsive **1/1**, E2E integrado Chrome/API/MySQL **33/33** y cleanup.
- Backend `52d7e46` pasó Action [`45066082294`](https://github.com/Paul1578/Back_GPS/actions/runs/45066082294): Release build, xUnit **107/107**, registro neutral/tiempo y smoke HTTP/MySQL. Documentación backend `029011e` pasó Action [`45066471076`](https://github.com/Paul1578/Back_GPS/actions/runs/45066471076), incluidos aislamiento tenant y concurrencia.
- En trabajo local Front se amplía edición/cancelación de rutas a 320/768 px, se convierte el panel “Super Admin” en administración de la empresa con datos reales y se agregan búsquedas de miembros/conductores; requiere nueva integración.
- Reauditoría detectó que el panel no tenía API global: importación, reinicio y actividad eran placeholders. También faltaban búsquedas y pruebas completas de CRUD Driver, vínculo User↔Driver por HTTP y ciclos positivos de vehículo en smoke.
- Pendiente: validar e integrar el lote local, continuar CRUD/roles/responsive y cerrar la política de Admin delegado. SMTP, certificado/key ring de producción e infraestructura son externos; app nativa aplazada por el usuario.

# Estado actual — 2026-11-22

- Front rama `refactor/route-builder`, Backend `chore/stabilize-fleet-platform`; no se trabaja en `main`.
- Front integrado `38c58d6` pasó Action `45047502825` (26 E2E, responsive, backend build/tests, audit/lint/build y cleanup), contra backend previo.
- Cambios Front locales: logout-all visible sin abrir el formulario de contraseña; E2E de dos sesiones y de baja de miembro con revocación access/refresh; el runner crea un fixture User adicional activo. Lint pasa y Playwright descubre **28 pruebas**; build y E2E integrado nuevos pendientes.
- Criterios globales siguen abiertos: más cobertura de CRUD/roles/responsive. SMTP/PFX e infraestructura productiva externos; app nativa aplazada.

## Estado actual de estabilización — 2026-11-22

- Ramas: Front `refactor/route-builder`; backend `chore/stabilize-fleet-platform`; `main` intacta.
- Actions Front `45046312974` pasó `d05dcf8`: Release backend, audit/lint/build, responsive **1/1**, E2E API/MySQL **26/26** y cleanup. Incluyó filtros reales Pending/Cancelled y Logistics mapa/lista a 320/768 px.
- Backend `a207c08` pasó Actions `45047226328`: xUnit **91/91**, smoke HTTP/MySQL y concurrencia, cleanup completo. Esta corrida también valida fixture de mantenimiento aislado. El nuevo Worker de email aún no está integrado.
- Local Front lint/build/discovery **26** pasan; Front `d05dcf8` pasó Actions `45046312974` con E2E **26/26**. Backend local Release xUnit **92/92**, build 0 warnings/0 errors, `bash -n` y diff-check. La nueva supresión de reset emails obsoletos ya pasa test enfocado; necesita Action nueva.
- Misión abierta: siguen pendientes criterios alcanzables de CRUD/roles y seguridad adicional. Política Admin delegado requiere respuesta de producto; SMTP/PFX productivos e infraestructura dependen de configuración externa. App nativa está aplazada.

## Estado actual de estabilización — 2026-11-22

- Ramas: Front `refactor/route-builder`; backend `chore/stabilize-fleet-platform`; `main` intacta.
- Actions Front `45045460102` pasó `a761674`: Release backend, audit/lint/build, responsive, E2E API/MySQL **26/26** y cleanup. E2E ampliados después de esa SHA requieren corrida nueva.
- Backend `190f284` pasó `45045070288`: build/test Release, xUnit **88/88**, smoke HTTP/MySQL tenant/flota, concurrencia y cleanup. Docs `e24e371` pasó `45045329470`.
- Validación local del lote actual: Front lint/build/discovery **26**; Backend Release/xUnit **89/89**, test enfocado 1/1, `bash -n` y diff-check. E2E autenticado y smoke MySQL de los cambios sin commit quedan para CI.
- Permanecen brechas alcanzables de CRUD/roles/responsive y seguridad de concurrencia bajo revisión. Política para Admin delegado requiere decisión de producto; SMTP/PFX productivos externos; app nativa aplazada por el usuario.

## Iteración en curso — Historial de Logística y cambio de contraseña — 2026-11-22

- E2E de cambio de contraseña añadió persistencia, revocación de refresh/clave anterior y nuevo login. Actions `45033318956` falló 20/21 por un locator Playwright ambiguo (no llegó a ejecutar el endpoint); causa/corrección documentadas en `ERROR_LOG.md`, selector corregido.
- Auditoría identificó que Historial de Logística recibía 403 de `/Vehicles` y ocultaba rutas que sí podía leer. Front usa ahora los campos de vehículo ya incluidos en `RouteDto`; el test verifica API, placa/detalle y responsive 320/768 px.
- Lint, build, discovery actual **26 tests** y `git diff --check` pasan localmente. Actions `45034387245` pasó backend Release/xUnit, auditoría, lint, build, responsive **1/1**, E2E autenticados **21/21** y cleanup de aquel commit.
- Actions `45033927966` llegó a validar ruta/placa Logistics pero falló 20/21 porque una aserción contaba cualquier `role=alert`; se limitó al mensaje del Historial y la repetición integrada pasó.
- El E2E de Logistics ahora también mide el diálogo de detalle contra el viewport a 320/768 px. Lint/build/discovery 21 y diff-check pasan localmente; la verificación integrada de este assert queda pendiente.
- Auditoría detectó y corrigió otro caso: Logistics ya no muestra cero como disponibilidad por depender de `/Vehicles`; usa las opciones permitidas y cuenta vehículos únicos en rutas en progreso. Actions `45035807218` pasó la suite E2E **21/21**, responsive **1/1**, build/lint/audit, backend tests y cleanup; valida el conteo real y que el navegador no llame `/Vehicles`.
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

## Actualización 2026-11-22 — error/reintento del dashboard Logistics

- Dashboard Logística: caso E2E local cubre caída 503 de assignment-options, cifra `—`, alerta, botón Reintentar y recuperación con conteo real del fixture de prueba. Comprueba que no se consulte el endpoint administrativo `/Vehicles` y que no haya overflow a 390 px.
- Lint/build/discovery 22 y caso enfocado 1/1 pasan localmente; Actions integrado pendiente.
- En Backend, CRUD de Driver para Manager y pruebas de aislamiento multiempresa quedaron validadas por Actions `45036129217` sobre SHA `54c1bba`; xUnit y smokes HTTP/MySQL/concurrencia pasaron.
- Pendiente global: continuar con acciones CRUD/responsive no cubiertas; decisión de producto para Admin delegado; credenciales SMTP vigentes. Móvil nativo sigue aplazado por el usuario.

- Cierre integrado Front `a75914f`: Actions `45036661541` success; Playwright Chrome/API/MySQL **22/22**, responsive browser 1/1, audit/lint/build y cleanup correctos. Incluye la regresión de error/reintento del dashboard Logistics.
- Revalidación cruzada del código de seguridad: Front Actions `45037486681` pasó 22/22 y usó Backend `0b1c1d1` (código `94c3e90`); responsive, audit/lint/build y cleanup correctos.

## Actualización Front 2026-11-22 — estado de carga de Vehículos

- Gestión de Vehículos ya no presenta “No hay vehículos registrados” si la petición inicial falla; muestra error/reintento y renderiza la flota después de recuperar.
- E2E local del archivo de estados de carga **5/5**, lint/build y discovery 23 pasan; Actions integrado pendiente para el nuevo caso.
- Actions `45038229853` confirmó Front `40bdcea`: 23/23 E2E API/MySQL y responsive/lint/build/audit correctos; incluido error/reintento de Vehículos en 320 px. Backend `b625c28` validó 86/86 xUnit y smokes/cleanup en `45038446662`.
- Revalidación cruzada actual: `45038687601` pasó Front `f972e19` + Backend `b625c28`; 86/86 xUnit, 23/23 E2E, responsive 1/1, audit/lint/build y cleanup. Incluye el nuevo estado de error/reintento en Gestión de Vehículos.

## Actualización 2026-11-22 — Gestión de Vehículos

- Añadido estado de carga explícito para que una petición pendiente no se muestre como flota vacía. E2E cubre carga pendiente → error 503 → reintento correcto a 320 px.
- Verificación local: Playwright de errores/carga **5/5**, lint/build y discovery **23** correctos. Actions del cambio pendiente.
- Continúa abierta la auditoría integral: CRUD y matriz de roles/responsive por cerrar, política de promoción Admin delegada sin decisión de producto; SMTP real externo y móvil nativo aplazado por el usuario.

- Actions `45039605708` pasó para Front `36f9bd8`: responsive 1/1, E2E Chrome/API/MySQL 23/23, backend checks, audit, lint, build y cleanup. La carga pendiente/error/reintento de Vehículos quedó validada integrada.

## Estado de carga en Gestión de Rutas — 2026-11-22

- Añadido estado accesible para la petición inicial y los reintentos; no se muestra lista vacía hasta una respuesta exitosa del backend.
- Playwright local 6/6 del spec de carga/error, test enfocado 1/1, lint/build y discovery 24 pasan. Actions integrado pendiente.

## Seguridad de sesión del estado frontend — 2026-11-22

- Cerrada carrera de solicitudes entre cuentas: al cambiar owner, FleetContext aborta la sesión anterior y rechaza cualquier respuesta tardía por identidad/versión, incluyendo reintentos y datos de asignación.
- E2E A→logout→B con GET de A retrasado confirma que `A-PRIVATE-01` no aparece en la flota de B; Playwright load-errors 7/7, lint/build y discovery 25 pasan. Actions exacto de este fix pendiente.

## Aislamiento de la sesión de autenticación — 2026-11-22

- Fix local en `AuthContext`: respuestas tardías de login/restauración/refresh/API no pueden sobrescribir ni cerrar una sesión posterior. Logout limpia estado local inmediatamente y envía el refresh token capturado de esa sesión.
- E2E de carrera de refresh: **1/1**; spec de cargas/errores: **8/8**. `npm run lint`, `npm run build`, discovery Playwright (**26**) y `git diff --check` pasan.
- Front `c6441b6` pasó Actions `45042907944`: backend Release, audit/lint/build, responsive **1/1**, E2E API/MySQL **26/26**, cleanup success. El run usó el backend de la rama `chore/stabilize-fleet-platform`.
- El commit previo Front `5bc0bff` también pasó Actions `45041860522` con 24/24 E2E.
- Misión integral abierta. Faltan ciclos CRUD/responsive que se cubrirán progresivamente, decisión de política para Admin delegado, SMTP actualizado/infraestructura de certificado. Móvil nativo está aplazado por decisión del usuario.

## Mi Ruta de Driver — cobertura tablet validada por Actions

- El E2E autenticado existente probaba navegación, GPS, inicio/fin de parada y evidencia sólo a 320×844. Ahora comprueba vista inicial y acción en 768×1024, límites/controles del diálogo de evidencia a 320 y 768 px, vuelta a 320 y estado final a 768 px; mide overflow de documento y `<main>`.
- `npm run lint`, `npm run build`, discovery Playwright **26** y diff-check pasan localmente. La prueba de API/MySQL se omitió en local porque no hay fixture QA; Actions `45043898907` la ejecutó con datos descartables y cleanup correcto.
- Actions `45043898907` pasó para Front `0dd5099`: E2E **26/26**, responsive 1/1, backend Release, audit/lint/build y cleanup. Validó el recorrido ampliado de Driver a 320/768 px. Backend usado: `a18a34f`. El fix backend `190f284` pasó por separado en `45045070288` (xUnit **88/88**, smoke tenant/flota, concurrencia de rutas y cleanup). La siguiente validación debe cruzar ambos commits.

## Estado actual — cobertura CRUD/foto responsive — 2026-11-22

- E2E ampliado: evidencia fotográfica persistida y mostrada en Historial, ciclo Driver a 320 px, y formularios de registro/cambio de contraseña a 320/768 px.
- Front lint/build y discovery 33 correctos. Falta E2E autenticado contra API/MySQL desechables y CI del nuevo commit.
- Política de Admin delegado sin respuesta de producto. SMTP/despliegue productivo requieren credenciales e infraestructura externas; móvil nativo aplazado.
- Misión integral abierta.

## E2E de flota, ciclo Driver y responsive — 2026-11-22

- La primera corrida integrada de 33 E2E (`45060482928`) terminó 30/33: dos conflictos 409 por compartir Driver entre operaciones concurrentes y un ancho de formulario de 413 px en viewport 320 px.
- Se aislaron los fixtures Driver de rutas y tenant; se corrigió el ancho mínimo del contenedor/formulario responsive. Lint, build, discovery (33) y diff-check pasan localmente. Requiere nueva Action antes de validar.

## Repetición E2E: causas diagnosticadas y correcciones — CI PENDIENTE

- Action `45061522878` ejecutó 31/33. La foto falló porque el diálogo aún estaba en modo Nota; el timeout dejó una ruta y el retry chocó con ella (409), no era una colisión entre los dos drivers que se atribuyó inicialmente. El ciclo Driver en Equipo detectó 413 px a 320 px.
- Se corrigió selección del modo Foto y el layout flex/grid de Dashboard/Equipo/Conductores. Falta nueva Action completa para verificar ambas correcciones.

## Mapa estrecho y resumen de evidencias en Historial — CI PENDIENTE

- Front Action `45062280254` llegó a **31/33**. Detectó 363 px de contenido en `<main>` del mapa a 320 px y que el resumen del Historial omitía evidencia guardada dentro de `points[].evidence`.
- Fix en rama: `min-w-0` en ancestros del Mapa y normalización de evidencia por parada en Historial; E2E extiende el detalle Admin a 768 px. Lint/build/discovery (33) pasan localmente; Action integrada del nuevo SHA pendiente.

- Front Action `45063487802` repitió overflow del `<main>` a 363 px; el wrapper aún debía recortar el ancho interno del mapa. La evidencia apareció y fueron 3 eventos (dos notas + foto), por lo que se corrigió la expectativa de tarjeta de 1 a 3. Action quedó 31/33; nuevo SHA pendiente.
- Action Front `45064475585` pasó **33/33 E2E autenticados**, además de lint/build/audit/responsive; verificó mapa 320 px, evidencia real e Historial Admin a 768 px. Móvil nativo sigue aplazado por decisión de producto.

## Registro de cuenta y anti-enumeración — CI integrado pendiente

- Front presenta respuesta neutral al registro y redirige a login. E2E compara alta/email duplicado con status y payload iguales y valida login posterior. Lint/build/discovery 33 pasan localmente; la Action nueva integrará la última rama backend.
- Action `45065745273` pasó **33/33 E2E** con backend `825bbed`, incluida respuesta neutra del registro, comparación email nuevo/duplicado y login posterior. El piso temporal backend llegó después en `52d7e46`; integración de ese último SHA pendiente.
# Actualización 2026-11-23 — UX de permisos para rol Admin

- La vista de Gestión de Equipo muestra “Gerente” (rol backend Admin) sólo cuando `/Auth/me` indica `isRootAccount=true`, calculado por backend desde la propiedad; no sustituye la autorización de la API.
- Se agregó una aserción E2E en el flujo autenticado de Admin raíz para confirmar que puede seleccionar el rol.
- Nuevo E2E aislado cubre Admin delegado: “Gerente” está ausente en alta y en el selector de cambio del miembro existente; prueba enfocada pasó 1/1.
- Backend ya aplica la regla y quedó validada por Action `45088129188`: 113/113 xUnit y smoke HTTP/MySQL de permisos/persistencia.
- Validación local del cambio completo: `npm run lint`, `npm run build`, discovery de 40 E2E y spec `team-management-load-errors.spec.ts` 10/10 pasan. La Action `45088879212` corresponde al commit previo `5784b36` (sin el nuevo E2E negativo) y sigue corriendo; el SHA actual necesita Action propia.
- Action `45088879212` terminó **38/39**: Admin raíz autenticado no vio “Gerente”. `/Auth/me` ahora expone `isRootAccount` backend-derived y AuthContext lo prioriza; validar integración en la Action del SHA posterior.
- Backend local tras agregar el campo: xUnit Release 113/113, build 0 warnings/0 errors, `bash -n` y diff-check pasan. Front local lint/build/discovery 40 y `team-management-load-errors` 10/10 pasan. CI integrada nueva pendiente.

## Validación del constructor de rutas — 2026-11-23

- Front `992053d` pasó Action `45092540906`: lint/build/audit, responsive 1/1, backend Release/xUnit y E2E API/MySQL 40/40 con cleanup.
- La revisión muestra origen, paradas en orden y destino con operación y coordenadas. La búsqueda descarta resultados obsoletos al cambiar el objetivo. E2E cubre Nominatim vacío/error/tardío y retry tras HTTP 503.
- Backend amplía el smoke para recoger, entregar y completar una parada combinada, cada una con evidencia y persistencia. Smoke local API + MySQL efímero pasó y limpió fixtures; publicar el cambio y confirmar Action.
- Política de ruta sin operaciones sigue consultada al usuario. Misión integral abierta.

## Historial operativo y consistencia de refresco — corrección local 2026-11-23

- Historial detalla cada parada operativa con su nombre, operación (recogida/entrega/ambas) y estado; oculta la lista vacía durante la primera carga.
- El polling y el refresco al volver al foco comparten una sola solicitud en vuelo; una respuesta lenta ya no puede reemplazar una más nueva.
- E2E enfocado pasa 2/2: carga demorada sin falso estado vacío, error/reintento, estados/operaciones multi-parada y guard de solicitudes concurrentes. Lint/build pasan. CI integrada nueva pendiente.
- Auditoría de seguridad identificó contraseñas nuevas con mínimo de seis caracteres y rate limit de login general por IP (60/min). Requiere decisión/plan de endurecimiento; aún no se cambió el contrato de contraseña ni el límite.

- Se implementa mínimo de 12 caracteres en claves nuevas de registro, cambio, activación y recuperación; los formularios indican la política. Las claves existentes no se invalidan.
- La nueva Action `45094647703` falló sólo en el E2E nuevo de foco: el fixture no simulaba `/Routes/assignment-options`, se llamó al API real con token ficticio y AuthContext volvió al Login. Añadí el mock; targeted Historial pasa 2/2 local. Ver ERROR_LOG; nueva Action pendiente.

## Constructor de rutas y confirmaciones — validación local pendiente de CI

- El selector de asignación ahora identifica y deshabilita conductores ocupados por rutas en curso; el conductor ya seleccionado se conserva al editar. La API backend entrega `isAvailable` derivado de rutas `InProgress`.
- El flujo permite traslados sin paradas operativas. E2E nuevo recorre origen/destino en tablet, confirma que los dos puntos usan operación `None` y consulta la ruta persistida por API.
- Cambios de rol y activación/desactivación de cuentas requieren confirmación con impacto explicado. ConfirmDialog limita su altura y permite scroll en pantallas de 320×360.
- Verificación local integrada: lint y build Next 16.4.6 pasan; Playwright descubre 43 E2E; test enfocado de Equipo 1/1 pasó (incluye persistencia interceptada, no backend real); `git diff --check` pasa. Suites API/MySQL reales pendientes de Actions tras publicar.
- Primer intento del E2E de confirmación expiró porque el menú móvil ocultó Equipo; se ajustó para abrir el flujo en escritorio y probar diálogo en viewport bajo. Ver `ERROR_LOG.md`.

## Correcciones por Action Front 45099148002

- La Action pasó backend build, lint, frontend build y responsive, pero Playwright reportó 5 fallos: 2 casos nuevos de rutas (conductor ocupado y apertura del mapa), y 3 tests antiguos sin interacción con el nuevo diálogo de confirmación.
- Corregidos localmente: ahora se ven deshabilitados los conductores ocupados; traslado sigue la transición real de Ubicar→mapa; los tests confirman cambios de rol/estado. Validación local lint/build, confirmaciones 1/1 y discovery 43 pasan. Nueva Action integrada pendiente.

- Action de repetición `45100344654`: **42/43 E2E**; el único fallo fue otra desactivación de cuenta sin confirmar dentro del test de ciclo Driver. Corregido localmente. Cleanup SQL informó error después del test fallido; resultado de limpieza tras la nueva Action pendiente.

- Action `45101175529`: nuevamente **42/43**; el test de ciclo Driver ya pasó la confirmación de desactivar el usuario vinculado y reveló una segunda omisión al desactivar el User regular del mismo escenario. Ambas interacciones ahora tienen confirmación explícita; repetir la Action.

- Action `45101809749`: detectó que también faltaba confirmar la reactivación del User regular (42/43); corregido con `Sí, activar cuenta`. Se comprobará el test completo y cleanup en el siguiente run.

## Action integrada actualizada — cleanup requiere repetición

- Front `45102498423`: **43/43 E2E** y responsive 1/1; se creó ruta de traslado y se verificaron opciones de conductor y confirmaciones. El job falló sólo porque el cleanup MySQL no pudo completar.
- Backend runner `2ff5560` revela ahora el error de mysql cuando falle; pendiente siguiente Front Action para verificar causa y cleanup correcto.


- El error MySQL 1451 de cleanup está corregido en Backend `7ea14a6`: se limpian rutas y posiciones asociadas al Driver QA antes de borrarlo. Front debe repetir 43/43 y cleanup con este backend.


## Resultado verificado — 2026-11-23

- Front `85da39c` Action [`45103761122`](https://github.com/Paul1578/Front_gpsR/actions/runs/45103761122) pasó: backend Release/tests, audit, lint/build, responsive browser **1/1**, E2E API/MySQL **43/43** y cleanup exitoso. Verifica el constructor, disponibilidad, traslados sin paradas y confirmaciones de equipo.
- Backend `7ea14a6` Action [`45103732510`](https://github.com/Paul1578/Back_GPS/actions/runs/45103732510) pasó Release/xUnit y smoke HTTP/MySQL tenant/concurrencia; cleanup de Front corregido por FK Driver y verificado por la Action Front.
- Ramas limpias y separadas: Front `refactor/route-builder`, Backend `chore/stabilize-fleet-platform`; `main` no se modificó. Misión integral permanece abierta por pendientes productivos y SMTP.

## Geometría OSRM del mapa — ejecución integrada pendiente

- El E2E Manager mapa ahora intercepta OSRM con una geometría determinista de tres coordenadas y comprueba que el SVG dibuja el punto intermedio recibido; deja de forzar el error 503 en ese flujo. La fixture externa no depende de Internet.
- Validación local posterior al cambio: lint y build Next 16.4.6 pasan, `git diff --check` pasa y Playwright descubre 51 tests. La Action del SHA actualizado sigue pendiente.
- También está pendiente la Action que integra el fixture HTTP/MySQL real de Admin delegado; no afirmar cierre hasta verificar ejecución y limpieza.

## Corrección del E2E Admin delegado — nueva Action pendiente

- Action Front `45119404897`: backend, audit, lint/build y responsive pasaron; Playwright **50/51**. El único fallo fue el locator `Abrir menú` en viewport desktop, después de que la API real ya confirmara 403 a creación/promoción Admin.
- Corregido el test para usar explícitamente 390×844, donde se muestra ese botón. Esperar Action del nuevo SHA para confirmar Admin delegado y limpieza.

## E2E del mapa: ajustes tras Action 45119664116

- Action `45119664116`: **49/51**. El test delegado aún usaba menú móvil en desktop (fix publicado después); el mapa inspeccionaba la primera ruta del overlay y su retry reutilizaba placa única tras baja lógica.
- Corregido localmente con selector de ruta seleccionada, comprobación de geometría OSRM sobre esa entidad y fixture único por intento. Nuevo SHA `3c7d738` está en Action; cambios adicionales de selector/retry requieren su propia Action.

- Corrección documental/proceso: el cambio anterior había aplicado móvil al E2E simulado equivocado; ahora se fija desktop en el simulado y móvil en el autenticado. Ver `ERROR_LOG.md`; pendiente validar nueva Action.

## Confirmación OSRM visible y prueba estabilizada

- El selector por SVG no fue estable: Leaflet simplifica la línea y el DOM entregaba un único segmento incluso con la geometría OSRM mock de tres puntos. Se retiró esa aserción de implementación y se agregó una etiqueta clara de éxito “Trayecto por carretera calculado”; el E2E la comprueba tras seleccionar la ruta real.
- El fallback sigue mostrando “Trayecto estimado entre puntos”. Validación local y Action integrada del nuevo SHA pendientes.

## Correcciones tras Action 45121718866

- **48/51 E2E**. El mapa recibió mock OSRM pero el locator buscaba el estado dentro del elemento Leaflet; se movió al nivel de página. Admin delegado conserva visible su opción de rol propio, deshabilitada; E2E ahora valida `disabled`. El CRUD Driver espera HTTP 201 antes de leer persistencia y corrige una carrera observada en retry.
- Fixes en branch; lint/build y siguiente Action API/MySQL pendientes.

## Resultado Front Action 45122569784

- **50/51 E2E**, incluyendo API/MySQL real y limpieza; lint/build, responsive y backend Release/xUnit pasaron. Admin delegado y ciclo Driver ya pasaron tras las correcciones anteriores.
- Único fallo: selector genérico `role=status` ambiguo por estado OSRM y banner de tracking simultáneos. Reemplazado por copy exacto del estado OSRM; repetir Action completa.

## E2E integral de flota y mapa — VALIDADO EN CI

- Front branch `refactor/route-builder`, código probado `f0acce7` (HEAD de código antes del commit documental): Action [`45123444413`](https://github.com/Paul1578/Front_gpsR/actions/runs/45123444413) **success**.
- Evidencia: backend Release/xUnit, auditoría de dependencias, lint, build Next.js, responsive browser **1/1**, Playwright autenticado contra API y MySQL descartables **51/51**, cierre de API/containers correcto. Sin traces de fallo; el step de guardar traces quedó skip por éxito.
- Incluye fixture real de Admin delegado con 403 y rol protegido, Driver CRUD con lectura posterior al POST, ruta OSRM con respuesta determinista y comprobación del estado “Trayecto por carretera calculado”, responsive desktop/tablet/móvil web, y cleanup de datos temporales.
- Backend branch `chore/stabilize-fleet-platform` continúa en `341161d`; Action Backend `45119396803` success. La misión integral sigue abierta por criterios restantes documentados en este archivo y por la limitación SMTP.

- Confirmación del SHA final documental `1d7b922`: Action [`45124271067`](https://github.com/Paul1578/Front_gpsR/actions/runs/45124271067) también success; ejecutó 51/51 E2E, responsive 1/1, backend Release/xUnit y cleanup.

## Verificación de Admin root, tenant y baja de ruta — CI 2026-11-23

- Front SHA documental `d002a93`, Action [45153408262](https://github.com/Paul1578/Front_gpsR/actions/runs/45153408262): success; backend Release/xUnit **139/139**, audit, lint/build, responsive browser **1/1**, E2E API/MySQL **51/51** y teardown.
- Se confirmaron denegaciones cross-tenant de perfil/estado/rol sin mutación, promoción de rol desde cuenta raíz con confirmación UI/persistencia, restauración del fixture y baja lógica persistida de ruta.
- Backend SHA documental `fa4a3a3`, Actions [45154037990](https://github.com/Paul1578/Back_GPS/actions/runs/45154037990) y [45154028662](https://github.com/Paul1578/Back_GPS/actions/runs/45154028662): push y PR success.
- Misión integral abierta: continuar los criterios CRUD, permisos, responsive y pruebas aún marcados pendientes; SMTP y configuración productiva externa siguen delimitados.

## Edición de paradas en ruta existente — VALIDADO EN CI

- Auditoría independiente detectó que el constructor permitía reordenar y cambiar operaciones al editar, pero E2E sólo probaba crear varias paradas y preservar una existente.
- El E2E integrado ahora abre una ruta con recogida+entrega, cambia la operación de una parada, reordena ambas y compara la secuencia completa por GET después de guardar en tablet y móvil.
- Lint, build, discovery de **51 tests** y `git diff --check` pasan localmente. El test necesita API/MySQL y credenciales QA; la Action del commit nuevo debe validar escritura real y cleanup.

## Edición de paradas existente — VALIDADA EN CI — 2026-11-23

- El E2E del commit `ee49ce8` cambia pickup a delivery, reordena las dos paradas y exige el arreglo origen/entrega/recogida/destino por GET tras guardar en tablet y móvil.
- Action [45155814687](https://github.com/Paul1578/Front_gpsR/actions/runs/45155814687): success; **51/51 E2E**, responsive **1/1**, backend Release/xUnit, audit, lint/build y teardown. La escritura usó API real y MySQL descartable; cleanup correcto.
- La Action anterior [45154834106](https://github.com/Paul1578/Front_gpsR/actions/runs/45154834106) también pasó **51/51**, responsive y cleanup sobre docs `d03f3eb`.

## Promoción root-only en Gestión de Equipo — VALIDADO EN CI

- Auditoría Front identificó que la promoción root-only desde la UI estaba cubierta en Administración heredada, mientras Gestión de Equipo sólo probaba Manager→Logistics.
- El E2E principal ahora promueve por confirmación un Manager→Admin desde la tarjeta de Equipo, consulta `GET /Users/my-team`, verifica `roles=[Admin]`, restaura Logistics y confirma la restauración. El fixture se ejecuta con sesión raíz.
- Lint/build/discovery 51 y diff-check pasan local; falta ejecutar API/MySQL E2E y cleanup en CI.

## Validación documental Front `3a131a8` — 2026-11-23

- Action [45157412228](https://github.com/Paul1578/Front_gpsR/actions/runs/45157412228) success: backend Release/xUnit **139/139**, audit/lint/build, responsive **1/1**, E2E **51/51** y cleanup.
- También queda confirmada la edición de paradas publicada en `ee49ce8`, Action [45155814687](https://github.com/Paul1578/Front_gpsR/actions/runs/45155814687): **51/51**, responsive y cleanup.
- La promoción desde Gestión de Equipo raíz está añadida localmente; esperar la nueva Action después del push.

## Promoción root-only desde Gestión de Equipo — VALIDADA EN CI — 2026-11-23

- Front `29e320b`, Action [45158497214](https://github.com/Paul1578/Front_gpsR/actions/runs/45158497214) success: **51/51 E2E**, responsive 1/1, Backend Release/xUnit, audit/lint/build y cleanup.
- El flujo crea Manager, lo cambia a Logistics, lo promueve a Admin desde la pantalla principal con la sesión raíz, valida request y `GET /Users/my-team`, y restaura Logistics. El fixture temporal se limpia.

## HEAD documental con promoción de Equipo validado — 2026-11-23

- Front `357ffdc`, Action [45159425207](https://github.com/Paul1578/Front_gpsR/actions/runs/45159425207) pasó: **51/51 E2E**, responsive 1/1, Backend Release/xUnit, audit/lint/build y cleanup.
- La repetición ejecutó la promoción root-only desde Gestión de Equipo y la restauración de rol en API/MySQL descartables.

## HEAD Front actual validado — 2026-11-23

- `refactor/route-builder` HEAD documental `8f2e68a`, Action [45160390591](https://github.com/Paul1578/Front_gpsR/actions/runs/45160390591): success; 51/51 E2E, responsive 1/1, Backend Release/xUnit, audit/lint/build y cleanup.
- Incluye la cobertura de edición de orden/operaciones de paradas y promoción root-only desde Gestión de Equipo, ambas verificadas contra API/MySQL real.
