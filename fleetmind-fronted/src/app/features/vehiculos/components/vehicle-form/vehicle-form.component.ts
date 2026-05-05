import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehicleForm } from '../../models/vehicle.interface';
import { ButtonComponent } from '../../../shared/components/button.component';

@Component({
  selector: 'app-vehicle-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  template: `
    <form (ngSubmit)="onSubmit.emit(formData)" #form="ngForm">
      <div class="form-group">
        <label>Matrícula:</label>
        <input type="text" [(ngModel)]="formData.licensePlate" name="licensePlate" required />
      </div>
      <div class="form-group">
        <label>Marca:</label>
        <input type="text" [(ngModel)]="formData.make" name="make" required />
      </div>
      <div class="form-group">
        <label>Modelo:</label>
        <input type="text" [(ngModel)]="formData.model" name="model" required />
      </div>
      <div class="form-group">
        <label>Año:</label>
        <input type="number" [(ngModel)]="formData.year" name="year" required />
      </div>
      <div class="form-group">
        <label>Tipo de combustible:</label>
        <select [(ngModel)]="formData.fuelType" name="fuelType" required>
          <option value="gasolina">Gasolina</option>
          <option value="diesel">Diésel</option>
          <option value="eléctrico">Eléctrico</option>
        </select>
      </div>
      <div class="actions">
        <app-button variant="primary" [disabled]="!form.valid">Guardar</app-button>
        <app-button variant="secondary" (onClick)="onCancel.emit()">Cancelar</app-button>
      </div>
    </form>
  `,
  styles: [`
    .form-group { margin-bottom: 16px; }
    label { display: block; margin-bottom: 4px; }
    input, select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
    .actions { display: flex; gap: 8px; margin-top: 16px; }
  `]
})
export class VehicleFormComponent {
  formData = input<VehicleForm>({ licensePlate: '', make: '', model: '', year: 2024, fuelType: '' });
  onSubmit = output<VehicleForm>();
  onCancel = output<void>();
}