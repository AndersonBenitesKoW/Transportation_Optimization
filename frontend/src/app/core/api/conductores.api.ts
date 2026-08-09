import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse, Conductor } from '../../shared/models';
import { registrarError } from './http-error.util';

/** Acceso HTTP al dominio Conductores. */
@Injectable({ providedIn: 'root' })
export class ConductoresApi {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/conductores`;

  getConductores(): Observable<ApiResponse<Conductor[]>> {
    return this.http
      .get<ApiResponse<Conductor[]>>(this.baseUrl)
      .pipe(registrarError('ConductoresApi.getConductores'));
  }

  getConductor(id: string): Observable<ApiResponse<Conductor>> {
    return this.http
      .get<ApiResponse<Conductor>>(`${this.baseUrl}/${id}`)
      .pipe(registrarError('ConductoresApi.getConductor'));
  }

  createConductor(conductor: Conductor): Observable<ApiResponse<any>> {
    return this.http
      .post<ApiResponse<any>>(this.baseUrl, conductor)
      .pipe(registrarError('ConductoresApi.createConductor'));
  }

  updateConductor(id: string, conductor: Partial<Conductor>): Observable<ApiResponse<any>> {
    return this.http
      .put<ApiResponse<any>>(`${this.baseUrl}/${id}`, conductor)
      .pipe(registrarError('ConductoresApi.updateConductor'));
  }

  deleteConductor(id: string): Observable<ApiResponse<any>> {
    return this.http
      .delete<ApiResponse<any>>(`${this.baseUrl}/${id}`)
      .pipe(registrarError('ConductoresApi.deleteConductor'));
  }
}
