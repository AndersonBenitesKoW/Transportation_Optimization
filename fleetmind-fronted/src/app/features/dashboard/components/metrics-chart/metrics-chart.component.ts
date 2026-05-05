import { Component, input, ElementRef, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Metric } from '../../models/kpi.interface';

@Component({
  selector: 'app-metrics-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-container">
      <h4>{{ metric()?.name }}</h4>
      <canvas #chartCanvas></canvas>
    </div>
  `,
  styles: [`
    .chart-container { padding: 16px; border: 1px solid #ddd; border-radius: 8px; margin: 16px 0; }
  `]
})
export class MetricsChartComponent {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  metric = input<Metric>();

  constructor() {
    effect(() => {
      if (this.metric()) {
        this.renderChart();
      }
    });
  }

  private renderChart() {
    // Simplified chart rendering (would use Chart.js in real implementation)
    const canvas = this.chartCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw simple bar chart
      const data = this.metric()!.data;
      const barWidth = canvas.width / data.length;
      data.forEach((point, index) => {
        const height = (point.value / Math.max(...data.map(d => d.value))) * canvas.height;
        ctx.fillStyle = '#007bff';
        ctx.fillRect(index * barWidth, canvas.height - height, barWidth - 2, height);
      });
    }
  }
}