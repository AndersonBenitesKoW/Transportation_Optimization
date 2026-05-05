import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VehicleListComponent } from '../components/vehicle-list/vehicle-list.component';
import { VehicleFormComponent } from '../components/vehicle-form/vehicle-form.component';
import { ModalComponent } from '../../../shared/components/modal.component';
import { VehicleService } from '../services/vehicle.service';
import { Vehicle, VehicleForm } from '../models/vehicle.interface';
import { ButtonComponent } from '../../../shared/components/button.component';

@Component({
  selector: 'app-vehicle-container',
  standalone: true,
  imports: [CommonModule, VehicleListComponent, VehicleFormComponent, ModalComponent, ButtonComponent],
  template: `
    <div class="vehicle-container">
      <div class="header">
        <h2>Vehículos</h2>
        <app-button variant="primary" (onClick)="showCreateModal()">Nuevo Vehículo</app-button>
      </div>
      <app-vehicle-list
        [vehicles]="vehicles()"
        (onEdit)="editVehicle($event)"
        (onDelete)="deleteVehicle($event)"
      />
      <app-modal [isOpen]="showModal()" title="Vehículo" (onClose)="closeModal()">
        <app-vehicle-form
          [formData]="selectedVehicle()"
          (onSubmit)="saveVehicle($event)"
          (onCancel)="closeModal()"
        />
      </app-modal>
    </div>
  `,
  styles: [`
    .vehicle-container { padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  `]
})
export class VehicleContainerComponent implements OnInit {
  vehicles = signal<Vehicle[]>([]);
  showModal = signal(false);
  selectedVehicle = signal<VehicleForm>({ licensePlate: '', make: '', model: '', year: 2024, fuelType: '' });
  editingId = signal<string | null>(null);

  constructor(private vehicleService: VehicleService) {}

  ngOnInit() {
    this.loadVehicles();
  }

  showCreateModal() {
    this.selectedVehicle.set({ licensePlate: '', make: '', model: '', year: 2024, fuelType: '' });
    this.editingId.set(null);
    this.showModal.set(true);
  }

  editVehicle(vehicle: Vehicle) {
    this.selectedVehicle.set({
      licensePlate: vehicle.licensePlate,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      fuelType: vehicle.fuelType
    });
    this.editingId.set(vehicle.id);
    this.showModal.set(true);
  }

  saveVehicle(formData: VehicleForm) {
    if (this.editingId()) {
      this.vehicleService.updateVehicle(this.editingId()!, formData).subscribe(() => {
        this.loadVehicles();
        this.closeModal();
      });
    } else {
      this.vehicleService.createVehicle(formData).subscribe(() => {
        this.loadVehicles();
        this.closeModal();
      });
    }
  }

  deleteVehicle(id: string) {
    this.vehicleService.deleteVehicle(id).subscribe(() => {
      this.loadVehicles();
    });
  }

  closeModal() {
    this.showModal.set(false);
  }

  private loadVehicles() {
    this.vehicleService.getVehicles().subscribe(vehicles => this.vehicles.set(vehicles));
  }
}