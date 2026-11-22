# Dirección del producto

FleetFlow existe para ayudar a una empresa a gestionar envíos y controlar su flota.

## Núcleo del producto

1. Planificar envíos y construir rutas.
2. Asignar cada ruta a un conductor y un vehículo.
3. Ejecutar y monitorear rutas en tiempo real.
4. Registrar entregas, evidencias e incidencias.
5. Consultar rendimiento e historial operativo.

## Principios de diseño

- El usuario piensa en envíos y entregas, no en coordenadas.
- Cada acción crítica debe tener confirmación visible.
- Los conflictos de disponibilidad deben detectarse antes de guardar.
- El estado de una ruta debe ser comprensible y auditable.
- La operación debe funcionar bien en escritorio y móvil.
- El backend es la fuente de verdad; el estado local solo sirve para mejorar la interacción.

## Flujo principal esperado

Información del envío → recorrido con múltiples entregas/paradas → asignación de recursos → revisión → ejecución → seguimiento → cierre con evidencia.

## Regla de dominio confirmada

Una ruta puede cubrir múltiples operaciones. Cada parada representa una `recogida`, una `entrega` o ambas dentro de la ruta, con orden, dirección, estado y evidencia persistida. Las paradas no se convierten automáticamente en rutas independientes.

La experiencia debe distinguir visualmente los tipos de operación:

- Recogida: retirar mercancía de un punto.
- Entrega: dejar mercancía en un punto.
- Recogida y entrega: realizar ambas operaciones en la misma parada.
