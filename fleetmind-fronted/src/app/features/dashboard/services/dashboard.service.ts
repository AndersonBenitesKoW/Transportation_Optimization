import { Injectable } from '@angular/core';
import { HttpService } from '../../core/services/http.service';
import { Observable } from 'rxjs';
import { KPI, Metric } from '../models/kpi.interface';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  constructor(private httpService: HttpService) {}

  getKPIs(): Observable<KPI[]> {
    return this.httpService.get<KPI[]>('/dashboard/kpis');
  }

  getMetrics(): Observable<Metric[]> {
    return this.httpService.get<Metric[]>('/dashboard/metrics');
  }
}