# Registro de errores y decisiones

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
