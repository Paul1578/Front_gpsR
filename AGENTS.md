# FletFlow Frontend

## Propósito

Frontend web de una plataforma SaaS para gestionar flotas, rutas y operaciones de recogida/entrega.

## Repositorios relacionados

- Frontend: `/home/leonardo/Front_gpsR`
- Backend: `/home/leonardo/Back_GPS`

## Reglas de negocio

- Una ruta puede contener múltiples paradas.
- Una parada puede ser recogida, entrega o ambas.
- El backend es la fuente de verdad; no usar mocks para representar operaciones reales.
- Mostrar estados de carga, error, vacío y sincronización.
- Las autorizaciones del frontend son solo UX; el backend debe hacer cumplir permisos y aislamiento.

## Trabajo

- Trabajar siempre en una rama distinta de `main`.
- Leer `docs/SESSION_HANDOFF.md` y `docs/PROJECT_STATUS.md` antes de continuar una sesión.
- Ejecutar lint/build y registrar resultados en la documentación.
- No esconder errores de API detrás de estados vacíos.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
