# Reglas de negocio

## Rutas y paradas

- Una ruta tiene origen, destino y cero o más paradas intermedias.
- Una ruta puede cubrir múltiples operaciones.
- Cada parada puede ser `recogida`, `entrega` o `recogida_y_entrega`.
- El orden de las paradas es operativo y debe persistirse.
- Cada parada debe poder tener estado, observación, evidencia e incidencia.

## Recursos

- Un vehículo en mantenimiento no puede asignarse a una ruta nueva.
- Un vehículo o conductor no debe estar en dos rutas activas incompatibles.
- Los cambios de estado de ruta deben mantener consistencia con el estado del vehículo.
