/** Modelos del dominio Viajes y desplazamientos de reposicion. */
export interface Viaje {
  id?: string;
  id_vehiculo: string;
  id_conductor?: string;
  conductor?: string;
  origen_viaje?: { nombre: string; lat: number; lng: number };
  destino_viaje?: { nombre: string; lat: number; lng: number };
  destino_nombre?: string;
  km_inicio: number;
  km_fin: number;
  km_recorridos: number;
  km_osrm: number;
  desviacion_km: number;
  distancia_recorrida_km?: number;
  combustible_total_consumido_L?: number;
  fecha_inicio_viaje?: string;
  fecha_fin_viaje?: string;
  fecha_viaje?: string;
  tipo_viaje: 'manual' | 'simulador';
}

export interface Desplazamiento {
  id?: string;
  id_vehiculo: string;
  tipo: string;
  origen_nombre: string;
  origen_lat: number;
  origen_lng: number;
  destino_nombre: string;
  destino_lat: number;
  destino_lng: number;
  distancia_km: number;
  combustible_estimado_L?: number;
  fecha?: string;
  id_viaje_principal?: string;
}

/** Payload para iniciar un viaje. */
export interface IniciarViajePayload {
  id_vehiculo: string;
  origen_nombre: string;
  origen_lat: number;
  origen_lng: number;
  destino_nombre: string;
  destino_lat: number;
  destino_lng: number;
  km_inicio: number;
  reposicion_origen_nombre?: string;
  reposicion_origen_lat?: number;
  reposicion_origen_lng?: number;
  reposicion_distancia_km?: number;
  ubicacion_inicial_lat?: number;
  ubicacion_inicial_lng?: number;
  ubicacion_inicial_nombre?: string;
}

/** Payload para finalizar un viaje. */
export interface FinalizarViajePayload {
  id_vehiculo: string;
  km_fin: number;
}
