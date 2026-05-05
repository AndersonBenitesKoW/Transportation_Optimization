import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VehicleContainerComponent } from '../components/vehicle-container/vehicle-container.component';

@Component({
  selector: 'app-vehicle-page',
  standalone: true,
  imports: [CommonModule, VehicleContainerComponent],
  template: `
    <app-vehicle-container />
  `
})
export class VehiclePageComponent {}