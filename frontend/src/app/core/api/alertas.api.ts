import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models';
import { registrarError } from './http-error.util';

/** Acceso HTTP a alertas operativas, emergencias y alertas de mantenimiento. */
@Injectable({ providedIn: 'root' })
export class AlertasApi {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getAlertas(estado?: string): Observable<ApiResponse<any[]>> {
    const url = estado
      ? `${this.apiUrl}/api/alertas?estado=${estado}`
      : `${this.apiUrl}/api/alertas`;
    return this.http.get<ApiResponse<any[]>>(url).pipe(registrarError('AlertasApi.getAlertas'));
  }

  resolverAlerta(id: string, notas?: string): Observable<ApiResponse<any>> {
    return this.http
      .put<ApiResponse<any>>(`${this.apiUrl}/api/alertas/${id}`, { estado: 'Resuelta', notas })
      .pipe(registrarError('AlertasApi.resolverAlerta'));
  }

  registrarEmergencia(data: {
    id_vehiculo: string;
    email_conductor: string;
    motivo?: string;
  }): Observable<ApiResponse<any>> {
    return this.http
      .post<ApiResponse<any>>(`${this.apiUrl}/api/alertas/emergencia`, data)
      .pipe(registrarError('AlertasApi.registrarEmergencia'));
  }

  getMantenimientoAlertas(idVehiculo?: string): Observable<ApiResponse<any[]>> {
    const url = idVehiculo
      ? `${this.apiUrl}/api/mantenimiento-alertas?id_vehiculo=${idVehiculo}`
      : `${this.apiUrl}/api/mantenimiento-alertas`;
    return this.http
      .get<ApiResponse<any[]>>(url)
      .pipe(registrarError('AlertasApi.getMantenimientoAlertas'));
  }
}
