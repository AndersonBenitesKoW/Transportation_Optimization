import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Interfaces
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

export interface Componente {
  kilometraje_reparacion: number;
  tiempo_vida: number;
  km_en_ultima_reparacion?: number;
  km_desde_reparacion?: number;
  ultima_reparacion?: string;
  proxima_reparacion?: string;
}

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

export interface Usuario {
  id?: string;
  nombre: string;
  email: string;
  password?: string;
  telefono?: string;
  rol: string;
  id_conductor?: string;
  ref?: string;
}

export interface Conductor {
  id?: string;
  id_conductor: string;
  nombre: string;
  licencia: string;
  telefono: string;
  email: string;
  experiencia_anios: number;
  calificacion: number;
  estado?: string;
  fecha_contratacion?: string;
}

export interface ApiResponse<T> {
  status: string;
  data?: T;
  mensaje?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // ============================================================================
  // VEHÍCULOS
  // ============================================================================
  
  getVehiculos(): Observable<ApiResponse<Vehiculo[]>> {
    return this.http.get<ApiResponse<Vehiculo[]>>(`${this.apiUrl}/api/vehiculos`);
  }

  getVehiculo(id: string): Observable<ApiResponse<Vehiculo>> {
    return this.http.get<ApiResponse<Vehiculo>>(`${this.apiUrl}/api/vehiculos/${id}`);
  }

  createVehiculo(vehiculo: Vehiculo): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/api/vehiculos`, vehiculo);
  }

  updateVehiculo(id: string, vehiculo: Partial<Vehiculo>): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/api/vehiculos/${id}`, vehiculo);
  }

  deleteVehiculo(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/api/vehiculos/${id}`);
  }

  getComponentes(id: string): Observable<ApiResponse<Record<string, Componente>>> {
    return this.http.get<ApiResponse<Record<string, Componente>>>(`${this.apiUrl}/api/vehiculos/${id}/componentes`);
  }

  updateComponentes(id: string, data: Record<string, Componente>): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/api/vehiculos/${id}/componentes`, data);
  }

  deleteComponente(idVehiculo: string, nombreComponente: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/api/vehiculos/${idVehiculo}/componentes/${nombreComponente}`);
  }

  // ============================================================================
  // CONDUCTORES
  // ============================================================================
  
  getConductores(): Observable<ApiResponse<Conductor[]>> {
    return this.http.get<ApiResponse<Conductor[]>>(`${this.apiUrl}/api/conductores`);
  }

  getConductor(id: string): Observable<ApiResponse<Conductor>> {
    return this.http.get<ApiResponse<Conductor>>(`${this.apiUrl}/api/conductores/${id}`);
  }

  createConductor(conductor: Conductor): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/api/conductores`, conductor);
  }

  updateConductor(id: string, conductor: Partial<Conductor>): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/api/conductores/${id}`, conductor);
  }

  deleteConductor(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/api/conductores/${id}`);
  }

  // ============================================================================
  // FLOTA (TELEMETRÍA)
  // ============================================================================
  
  getFlota(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/api/flota`);
  }

  // ============================================================================
  // INCIDENTES
  // ============================================================================
  
  getIncidentes(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/api/incidentes`);
  }

  // ============================================================================
  // CHATBOT
  // ============================================================================
  
  enviarMensajeChat(mensaje: string, rol: string, referencia: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/chat`, {
      mensaje,
      rol,
      referencia
    });
  }

  // ============================================================================
  // PREDICCIONES (SEMANA 2)
  // ============================================================================
  
  getPredicciones(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/api/predicciones`);
  }

  getPrediccionesVehiculo(id: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/api/predicciones/${id}`);
  }

  // ============================================================================
  // ALERTAS (SEMANA 2)
  // ============================================================================
  
  getAlertas(estado?: string): Observable<ApiResponse<any[]>> {
    const url = estado 
      ? `${this.apiUrl}/api/alertas?estado=${estado}`
      : `${this.apiUrl}/api/alertas`;
    return this.http.get<ApiResponse<any[]>>(url);
  }

  resolverAlerta(id: string, notas?: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/api/alertas/${id}`, {
      estado: 'Resuelta',
      notas
    });
  }

  // ============================================================================
  // KPIS (SEMANA 2)
  // ============================================================================
  
  getKPIs(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/api/kpis`);
  }

  // ============================================================================
  // VIAJES
  // ============================================================================

  getViajes(idVehiculo?: string): Observable<ApiResponse<Viaje[]>> {
    const url = idVehiculo
      ? `${this.apiUrl}/api/viajes?id_vehiculo=${idVehiculo}`
      : `${this.apiUrl}/api/viajes`;
    return this.http.get<ApiResponse<Viaje[]>>(url);
  }

  iniciarViaje(data: { id_vehiculo: string; origen_nombre: string; origen_lat: number; origen_lng: number; destino_nombre: string; destino_lat: number; destino_lng: number; km_inicio: number; reposicion_origen_nombre?: string; reposicion_origen_lat?: number; reposicion_origen_lng?: number; reposicion_distancia_km?: number; ubicacion_inicial_lat?: number; ubicacion_inicial_lng?: number; ubicacion_inicial_nombre?: string }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/api/viajes/iniciar`, data);
  }

  finalizarViaje(data: { id_vehiculo: string; km_fin: number }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/api/viajes/finalizar`, data);
  }

  registrarEmergencia(data: { id_vehiculo: string; email_conductor: string; motivo?: string }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/api/alertas/emergencia`, data);
  }

  // ============================================================================
  // DESPLAZAMIENTOS (REPOSICION)
  // ============================================================================

  getDesplazamientos(idVehiculo?: string): Observable<ApiResponse<Desplazamiento[]>> {
    const url = idVehiculo
      ? `${this.apiUrl}/api/desplazamientos?id_vehiculo=${idVehiculo}`
      : `${this.apiUrl}/api/desplazamientos`;
    return this.http.get<ApiResponse<Desplazamiento[]>>(url);
  }

  // ============================================================================
  // RENDIMIENTO COMBUSTIBLE
  // ============================================================================

  getRendimientoCombustible(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/api/rendimiento-combustible`);
  }

  // ============================================================================
  // MANTENIMIENTO PREVENTIVO (ALERTAS)
  // ============================================================================

  getMantenimientoAlertas(idVehiculo?: string): Observable<ApiResponse<any[]>> {
    const url = idVehiculo
      ? `${this.apiUrl}/api/mantenimiento-alertas?id_vehiculo=${idVehiculo}`
      : `${this.apiUrl}/api/mantenimiento-alertas`;
    return this.http.get<ApiResponse<any[]>>(url);
  }

  // ============================================================================
  // USUARIOS
  // ============================================================================

  getUsuarios(): Observable<ApiResponse<Usuario[]>> {
    return this.http.get<ApiResponse<Usuario[]>>(`${this.apiUrl}/api/usuarios`);
  }

  updateUsuario(id: string, data: Partial<Usuario>): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/api/usuarios/${id}`, data);
  }

  deleteUsuario(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/api/usuarios/${id}`);
  }

  register(data: { nombre: string; email: string; password: string; telefono: string; rol: string }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/api/usuarios/register`, data);
  }

  login(data: { email: string; password: string }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/api/usuarios/login`, data);
  }
}
