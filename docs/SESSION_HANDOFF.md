## Trabajo actual — edición de perfil de equipo — 2026-11-22

- Gestión de Equipo edita nombres, apellidos y username con PUT /Users/{id}/profile; email queda inmutable. AuthContext.updateUserProfile separa guardado y refresco para no afirmar que falló un guardado exitoso.
- E2E edita miembro regular y valida GET /Users/my-team; edita Driver y comprueba sincronización en ambos sentidos. Tarjetas usan team-user-<id>.
- Lint/build y discovery Playwright (18 casos) pasan. Dos corridas iniciales dieron 16/18 y 17/18; se corrigieron texto duplicado y selector username obsoleto por testid, además del mock que liberaba 503 antes del alert. La suite autenticada final pasó 18/18 en Chrome/API/MySQL; runner código 0 y DB efímera eliminada.
- Revisión independiente: selector incorrecto, invalidación de tokenVersion sin revocar refresh (se retiró la invalidación innecesaria para editar datos de presentación), backfill omitido y sincronización de Driver sin filtro propietario; los cuatro quedaron resueltos.
- Misión no completa: seguir cubriendo CRUD/roles/responsive y no declarar cerrado el criterio de roles hasta resolver política de Admin delegado.

## Brecha de edición y datos personales de usuarios — pendiente

- Revisión de `TeamManagement` confirma CRUD UI incompleto para miembros: permite alta, estado y rol, pero no edición de cuenta. El formulario captura nombres/apellidos, sin embargo backend `User`/`UserDto` sólo persisten y exponen `Username`/`Email`; el mapper Front espera `firstName/lastName` opcionales y muestra valores vacíos cuando no llegan.
- Próximo lote alcanzable: revisar necesidad de campos y unicidad en backend, extender contrato con nombre/apellido, implementar actualización segura de username/datos mostrados y E2E de persistencia. Email no debe cambiarse sin definir verificación de propiedad.

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
