import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FlotaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/flota`;
  private incidentesUrl = `${environment.apiUrl}/api/incidentes`;

  getFlota(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  getIncidentes(): Observable<any> {
    return this.http.get(this.incidentesUrl);
  }
}
