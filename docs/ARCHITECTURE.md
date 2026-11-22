# Arquitectura frontend

- Next.js/React con componentes de dominio en `src/Components/fleet`.
- Contextos para autenticación, tema y estado de flota.
- Servicios HTTP en `src/services`.
- Mapas con Leaflet y React-Leaflet.

El frontend consume la API ASP.NET Core del repositorio hermano. Los tipos de transporte deben estar separados de los modelos de UI y mapearse en un único lugar.

El flujo de ruta debe representar `origin`, `stops[]` y `destination` sin duplicar origen/destino dentro de las paradas de UI.
