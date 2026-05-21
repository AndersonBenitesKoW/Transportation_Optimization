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
}
