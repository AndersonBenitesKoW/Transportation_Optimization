import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KPI } from '../../models/kpi.interface';

@Component({
  selector: 'app-kpi-cards',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="kpi-grid">
      <div class="kpi-card" *ngFor="let kpi of kpis()">
        <h3>{{ kpi.title }}</h3>
        <div class="value">{{ kpi.value }} {{ kpi.unit }}</div>
        <div class="trend" [class]="kpi.trend">
          {{ kpi.changePercent }}%
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .kpi-card { padding: 16px; border: 1px solid #ddd; border-radius: 8px; background: white; }
    .value { font-size: 24px; font-weight: bold; }
    .trend.up { color: green; }
    .trend.down { color: red; }
    .trend.stable { color: gray; }
  `]
})
export class KpiCardsComponent {
  kpis = input<KPI[]>([]);
}