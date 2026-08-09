import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models';
import { registrarError } from './http-error.util';

/** Acceso HTTP a la telemetria de flota y al historial de incidentes. */
@Injectable({ providedIn: 'root' })
export class FlotaApi {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getFlota(): Observable<ApiResponse<any[]>> {
    return this.http
      .get<ApiResponse<any[]>>(`${this.apiUrl}/api/flota`)
      .pipe(registrarError('FlotaApi.getFlota'));
  }

  getIncidentes(): Observable<ApiResponse<any[]>> {
    return this.http
      .get<ApiResponse<any[]>>(`${this.apiUrl}/api/incidentes`)
      .pipe(registrarError('FlotaApi.getIncidentes'));
  }
}
