/**
 * Punto unico de importacion de los clientes HTTP por dominio.
 *
 * Sustituye al antiguo `ApiService`, que concentraba los 30+ endpoints del
 * sistema en una sola clase.
 */
export * from './alertas.api';
export * from './chat.api';
export * from './conductores.api';
export * from './flota.api';
export * from './http-error.util';
export * from './kpis.api';
export * from './mantenimiento.api';
export * from './usuarios.api';
export * from './vehiculos.api';
export * from './viajes.api';
