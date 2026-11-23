# FletFlow — Frontend web

Aplicación web Next.js para gestionar vehículos, conductores, rutas, recogidas, entregas y seguimiento de flota.

## Requisitos

- Node.js compatible con Next.js 16.
- Backend FletFlow y MySQL configurados. El backend local carga sus variables desde `Back_GPS/.env`.

## Desarrollo local

```bash
npm ci
npm run dev
```

Abre `http://localhost:3000/dashboard`. El proxy `/api/backend/*` reenvía al backend. Puedes cambiar el destino con `FLETFLOW_API_URL`; el valor por defecto es `http://localhost:5046`. No pongas secretos en esta variable.

El backend ASP.NET usa `http://localhost:5046` en su perfil de desarrollo. Si necesitas otro origen, copia `.env.example` a `.env.local` y cambia `FLETFLOW_API_URL` (debe ser sólo el origen, sin `/api`).

## Verificación

```bash
npm run lint
npm run build
npm audit
```

## Reglas de producto

- Una ruta admite varias paradas; cada parada puede ser recogida, entrega o ambas.
- La API es la fuente de verdad para operaciones y permisos. No usar datos ficticios como si fueran persistidos.
- Antes de trabajar, consulta `AGENTS.md`, `docs/PROJECT_STATUS.md` y `docs/SESSION_HANDOFF.md`.

La cobertura de evidencia, aislamiento multiempresa, roles y responsive está registrada en `docs/PROJECT_STATUS.md` y `docs/TESTING.md`. Revisa esos documentos para conocer los límites actuales de SMTP y la preparación de producción.
