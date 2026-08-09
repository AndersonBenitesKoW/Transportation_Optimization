import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { registrarError } from './http-error.util';

/** Acceso HTTP al asistente conversacional del backend. */
@Injectable({ providedIn: 'root' })
export class ChatApi {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  enviarMensajeChat(mensaje: string, rol: string, referencia: string): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/api/chat`, { mensaje, rol, referencia })
      .pipe(registrarError('ChatApi.enviarMensajeChat'));
  }
}
