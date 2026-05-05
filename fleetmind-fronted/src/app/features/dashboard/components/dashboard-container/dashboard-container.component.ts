import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KpiCardsComponent } from '../components/kpi-cards/kpi-cards.component';
import { MetricsChartComponent } from '../components/metrics-chart/metrics-chart.component';
import { DashboardService } from '../services/dashboard.service';
import { KPI, Metric } from '../models/kpi.interface';

@Component({
  selector: 'app-dashboard-container',
  standalone: true,
  imports: [CommonModule, KpiCardsComponent, MetricsChartComponent],
  template: `
    <div class="dashboard">
      <h2>Dashboard</h2>
      <app-kpi-cards [kpis]="kpis()" />
      <app-metrics-chart *ngFor="let metric of metrics()" [metric]="metric" />
    </div>
  `,
  styles: [`
    .dashboard { padding: 20px; }
  `]
})
export class DashboardContainerComponent implements OnInit {
  kpis = signal<KPI[]>([]);
  metrics = signal<Metric[]>([]);

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.loadData();
  }

  private loadData() {
    this.dashboardService.getKPIs().subscribe(kpis => this.kpis.set(kpis));
    this.dashboardService.getMetrics().subscribe(metrics => this.metrics.set(metrics));
  }
}