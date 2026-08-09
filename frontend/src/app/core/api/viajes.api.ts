import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  Desplazamiento,
  FinalizarViajePayload,
  IniciarViajePayload,
  Viaje
} from '../../shared/models';
import { registrarError } from './http-error.util';

/** Acceso HTTP al ciclo de vida de los viajes y sus desplazamientos. */
@Injectable({ providedIn: 'root' })
export class ViajesApi {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getViajes(idVehiculo?: string): Observable<ApiResponse<Viaje[]>> {
    const url = idVehiculo
      ? `${this.apiUrl}/api/viajes?id_vehiculo=${idVehiculo}`
      : `${this.apiUrl}/api/viajes`;
    return this.http.get<ApiResponse<Viaje[]>>(url).pipe(registrarError('ViajesApi.getViajes'));
  }

  iniciarViaje(data: IniciarViajePayload): Observable<ApiResponse<any>> {
    return this.http
      .post<ApiResponse<any>>(`${this.apiUrl}/api/viajes/iniciar`, data)
      .pipe(registrarError('ViajesApi.iniciarViaje'));
  }

  finalizarViaje(data: FinalizarViajePayload): Observable<ApiResponse<any>> {
    return this.http
      .post<ApiResponse<any>>(`${this.apiUrl}/api/viajes/finalizar`, data)
      .pipe(registrarError('ViajesApi.finalizarViaje'));
  }

  getDesplazamientos(idVehiculo?: string): Observable<ApiResponse<Desplazamiento[]>> {
    const url = idVehiculo
      ? `${this.apiUrl}/api/desplazamientos?id_vehiculo=${idVehiculo}`
      : `${this.apiUrl}/api/desplazamientos`;
    return this.http
      .get<ApiResponse<Desplazamiento[]>>(url)
      .pipe(registrarError('ViajesApi.getDesplazamientos'));
  }
}
