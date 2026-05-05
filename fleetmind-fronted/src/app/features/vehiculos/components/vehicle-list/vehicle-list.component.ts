import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Vehicle } from '../../models/vehicle.interface';
import { ButtonComponent } from '../../../shared/components/button.component';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';

@Component({
  selector: 'app-vehicle-list',
  standalone: true,
  imports: [CommonModule, ButtonComponent, DateFormatPipe],
  template: `
    <div class="vehicle-list">
      <div class="vehicle-item" *ngFor="let vehicle of vehicles()">
        <div class="vehicle-info">
          <h4>{{ vehicle.licensePlate }}</h4>
          <p>{{ vehicle.make }} {{ vehicle.model }} ({{ vehicle.year }})</p>
          <p>Estado: {{ vehicle.status }} | Kilometraje: {{ vehicle.mileage }} km</p>
          <p>Último mantenimiento: {{ vehicle.lastMaintenance | dateFormat }}</p>
        </div>
        <div class="actions">
          <app-button variant="secondary" (onClick)="onEdit.emit(vehicle)">Editar</app-button>
          <app-button variant="danger" (onClick)="onDelete.emit(vehicle.id)">Eliminar</app-button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .vehicle-list { display: flex; flex-direction: column; gap: 16px; }
    .vehicle-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; border: 1px solid #ddd; border-radius: 8px; }
    .actions { display: flex; gap: 8px; }
  `]
})
export class VehicleListComponent {
  vehicles = input<Vehicle[]>([]);
  onEdit = output<Vehicle>();
  onDelete = output<string>();
}