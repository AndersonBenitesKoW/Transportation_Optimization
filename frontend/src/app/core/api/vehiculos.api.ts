import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse, Componente, Vehiculo } from '../../shared/models';
import { registrarError } from './http-error.util';

/**
 * Acceso HTTP al dominio Vehiculos y a su subcoleccion de componentes.
 */
@Injectable({ providedIn: 'root' })
export class VehiculosApi {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/vehiculos`;

  getVehiculos(): Observable<ApiResponse<Vehiculo[]>> {
    return this.http
      .get<ApiResponse<Vehiculo[]>>(this.baseUrl)
      .pipe(registrarError('VehiculosApi.getVehiculos'));
  }

  getVehiculo(id: string): Observable<ApiResponse<Vehiculo>> {
    return this.http
      .get<ApiResponse<Vehiculo>>(`${this.baseUrl}/${id}`)
      .pipe(registrarError('VehiculosApi.getVehiculo'));
  }

  createVehiculo(vehiculo: Vehiculo): Observable<ApiResponse<any>> {
    return this.http
      .post<ApiResponse<any>>(this.baseUrl, vehiculo)
      .pipe(registrarError('VehiculosApi.createVehiculo'));
  }

  updateVehiculo(id: string, vehiculo: Partial<Vehiculo>): Observable<ApiResponse<any>> {
    return this.http
      .put<ApiResponse<any>>(`${this.baseUrl}/${id}`, vehiculo)
      .pipe(registrarError('VehiculosApi.updateVehiculo'));
  }

  deleteVehiculo(id: string): Observable<ApiResponse<any>> {
    return this.http
      .delete<ApiResponse<any>>(`${this.baseUrl}/${id}`)
      .pipe(registrarError('VehiculosApi.deleteVehiculo'));
  }

  getComponentes(id: string): Observable<ApiResponse<Record<string, Componente>>> {
    return this.http
      .get<ApiResponse<Record<string, Componente>>>(`${this.baseUrl}/${id}/componentes`)
      .pipe(registrarError('VehiculosApi.getComponentes'));
  }

  updateComponentes(id: string, data: Record<string, Componente>): Observable<ApiResponse<any>> {
    return this.http
      .put<ApiResponse<any>>(`${this.baseUrl}/${id}/componentes`, data)
      .pipe(registrarError('VehiculosApi.updateComponentes'));
  }

  deleteComponente(idVehiculo: string, nombreComponente: string): Observable<ApiResponse<any>> {
    return this.http
      .delete<ApiResponse<any>>(`${this.baseUrl}/${idVehiculo}/componentes/${nombreComponente}`)
      .pipe(registrarError('VehiculosApi.deleteComponente'));
  }
}
