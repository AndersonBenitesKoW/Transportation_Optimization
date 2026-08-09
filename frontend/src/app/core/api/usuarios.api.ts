import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse, Usuario } from '../../shared/models';
import { registrarError } from './http-error.util';

/** Acceso HTTP al dominio Usuarios (gestion, registro y login). */
@Injectable({ providedIn: 'root' })
export class UsuariosApi {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/usuarios`;

  getUsuarios(): Observable<ApiResponse<Usuario[]>> {
    return this.http
      .get<ApiResponse<Usuario[]>>(this.baseUrl)
      .pipe(registrarError('UsuariosApi.getUsuarios'));
  }

  updateUsuario(id: string, data: Partial<Usuario>): Observable<ApiResponse<any>> {
    return this.http
      .put<ApiResponse<any>>(`${this.baseUrl}/${id}`, data)
      .pipe(registrarError('UsuariosApi.updateUsuario'));
  }

  deleteUsuario(id: string): Observable<ApiResponse<any>> {
    return this.http
      .delete<ApiResponse<any>>(`${this.baseUrl}/${id}`)
      .pipe(registrarError('UsuariosApi.deleteUsuario'));
  }

  register(data: {
    nombre: string;
    email: string;
    password: string;
    telefono: string;
    rol: string;
  }): Observable<ApiResponse<any>> {
    return this.http
      .post<ApiResponse<any>>(`${this.baseUrl}/register`, data)
      .pipe(registrarError('UsuariosApi.register'));
  }

  login(data: { email: string; password: string }): Observable<ApiResponse<any>> {
    return this.http
      .post<ApiResponse<any>>(`${this.baseUrl}/login`, data)
      .pipe(registrarError('UsuariosApi.login'));
  }
}
