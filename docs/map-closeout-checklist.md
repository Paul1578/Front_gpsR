# Mapa Web - Checklist de Cierre

## 1) Gate de calidad mínimo

Ejecutar en local antes de merge:

```bash
npm run qa:smoke
```

Incluye:

- `npm run lint`
- `npm run build`

## 2) Validación funcional obligatoria

### Controles

- `Recentrar ruta` encuadra geometría seleccionada.
- `Centrar camión` hace focus en el último punto.
- `Seguir camión` mantiene cámara sobre el tracking.
- `Mi ubicación` pide permiso y enfoca al usuario.
- `Pantalla completa` entra/sale sin romper layout.

### Capas y visualización

- Toggle `Ruta planificada` aplica al instante.
- Toggle `Tracking real` aplica al instante.
- Toggle `Paradas` aplica al instante.
- Toggle `Origen/Destino` aplica al instante.
- Cambio de mapa base (`OSM claro/oscuro/alto contraste`) aplica al instante.

### Persistencia

- Recargar página mantiene:
  - toggles de opciones del mapa
  - filtro de estado
  - modo de densidad de lista
  - mapa base
- Cambiar ruta y volver respeta viewport previo por ruta.

### Responsive

- Desktop: panel de rutas colapsable sin romper mapa.
- Mobile/tablet: panel de rutas visible debajo del mapa.
- No hay superposición ilegible entre tarjeta de ruta y controles.
- En `Gestión de Rutas` al abrir `Crear Ruta/Editar Ruta`, el modal no queda cortado por sidebar fija (desktop/tablet).

## 3) Umbrales operativos vigentes

- Polling visible: `20s`
- Polling oculto: `90s`
- Stale tracking: `2min`
- Off-route: `120m`

## 4) Observabilidad técnica

- Bloque debug visible solo con `NEXT_PUBLIC_DEBUG_MAP=true` y en `NODE_ENV !== production`.
- Métricas esperadas:
  - estado red
  - polling estimado
  - requests/success/error
  - último status HTTP
  - latencia última/promedio
