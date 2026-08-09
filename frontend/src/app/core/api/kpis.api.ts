import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models';
import { registrarError } from './http-error.util';

/** Acceso HTTP a indicadores agregados y predicciones de los modelos ML. */
@Injectable({ providedIn: 'root' })
export class KpisApi {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getKPIs(): Observable<ApiResponse<any>> {
    return this.http
      .get<ApiResponse<any>>(`${this.apiUrl}/api/kpis`)
      .pipe(registrarError('KpisApi.getKPIs'));
  }

  getRendimientoCombustible(): Observable<ApiResponse<any>> {
    return this.http
      .get<ApiResponse<any>>(`${this.apiUrl}/api/rendimiento-combustible`)
      .pipe(registrarError('KpisApi.getRendimientoCombustible'));
  }

  getPredicciones(): Observable<ApiResponse<any[]>> {
    return this.http
      .get<ApiResponse<any[]>>(`${this.apiUrl}/api/predicciones`)
      .pipe(registrarError('KpisApi.getPredicciones'));
  }

  getPrediccionesVehiculo(id: string): Observable<ApiResponse<any[]>> {
    return this.http
      .get<ApiResponse<any[]>>(`${this.apiUrl}/api/predicciones/${id}`)
      .pipe(registrarError('KpisApi.getPrediccionesVehiculo'));
  }
}
