import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-fuel-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fuel-page">
      <h2>Gestión de Combustible</h2>
      <p>Funcionalidad de OCR para captura de imágenes de combustible próximamente.</p>
    </div>
  `
})
export class FuelPageComponent {}