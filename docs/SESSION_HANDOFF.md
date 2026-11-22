# Session handoff

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

1. Completar E2E visual CRUD y negativas de permisos restantes; smoke HTTP autenticado ya se ejecutó con fixture efímero, pero requiere credenciales QA persistentes para automatizarlo en CI.
2. Revisar vistas responsive restantes; constructor tablet y operación Driver móvil ya se verificaron en sesiones previas.
3. Configurar SMTP vigente; para cualquier ambiente remoto verificar y rotar credenciales por separado.
4. Automatizar E2E HTTP/MySQL en CI y mover fotos a object storage antes de escalar.

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
