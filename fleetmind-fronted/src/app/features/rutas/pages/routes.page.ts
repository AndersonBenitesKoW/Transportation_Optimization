import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-routes-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="routes-page">
      <h2>Optimización de Rutas</h2>
      <p>Visualización y optimización de rutas próximamente.</p>
    </div>
  `
})
export class RoutesPageComponent {}