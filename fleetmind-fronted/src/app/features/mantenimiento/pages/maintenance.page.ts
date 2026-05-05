import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-maintenance-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="maintenance-page">
      <h2>Mantenimiento Preventivo</h2>
      <p>Alertas y gestión de mantenimiento próximamente.</p>
    </div>
  `
})
export class MaintenancePageComponent {}