/**
 * Modelos del dominio Vehiculos.
 *
 * Fuente de verdad unica: antes estas interfaces estaban duplicadas y
 * divergentes entre api.service.ts y mantenimiento.service.ts.
 */
export interface Vehiculo {
  id?: string;
  id_vehiculo: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  capacidad_tanque_L: number;
  capacidad_carga_ton: number;
  kilometraje_actual: number;
  edad_motor_meses: number;
  estado: string;
  conductor_asignado: string;
  fecha_adquisicion?: string;
  ultimo_mantenimiento?: string;
  proximo_mantenimiento_km?: number;
}

/**
 * Componente mecanico de un vehiculo (motor, aceite, neumaticos, ...).
 * Union de los campos que manejaban las dos definiciones previas.
 */
export interface Componente {
  kilometraje_reparacion: number;
  tiempo_vida: number;
  km_en_ultima_reparacion?: number;
  km_desde_reparacion?: number;
  ultima_reparacion?: string;
  proxima_reparacion?: string;
}
