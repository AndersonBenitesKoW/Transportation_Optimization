import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FlotaService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api/flota';
  private incidentesUrl = 'http://127.0.0.1:8000/api/incidentes'; // <-- Nueva URL

  getFlota(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  getIncidentes(): Observable<any> {
    return this.http.get(this.incidentesUrl);
  }
}