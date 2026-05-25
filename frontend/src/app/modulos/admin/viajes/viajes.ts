import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Viaje, Vehiculo } from '../../../services/api.service';
import { IconComponent } from '../../../components/icon.component';

@Component({
  selector: 'app-viajes',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './viajes.html',
  styleUrl: './viajes.css'
})
export class ViajesComponent implements OnInit {
  mapPin = 'map-pin'; plus = 'plus';

  private apiService = inject(ApiService);
  viajes: Viaje[] = []; vehiculos: Vehiculo[] = [];
  cargando = false; error: string | null = null;
  modalAbierto = false; editando = false;

  form: any = {
    id_vehiculo: '', origen_nombre: '', origen_lat: 0, origen_lng: 0,
    destino_nombre: '', destino_lat: 0, destino_lng: 0,
    km_inicio: 0, km_fin: 0
  };
  filtrarVehiculo: string = 'Todos';

  ngOnInit() { this.cargarDatos(); }

  cargarDatos() {
    this.cargando = true; this.error = null;
    this.apiService.getViajes().subscribe({
      next: (r) => { this.viajes = r.data || []; this.cargando = false; },
      error: (e) => { this.error = 'Error: ' + e.message; this.cargando = false; }
    });
    this.apiService.getVehiculos().subscribe({
      next: (r) => this.vehiculos = r.data || []
    });
  }

  get filtrados(): Viaje[] {
    return this.filtrarVehiculo === 'Todos'
      ? this.viajes
      : this.viajes.filter(v => v.id_vehiculo === this.filtrarVehiculo);
  }

  onVehiculoChange() {
    const v = this.vehiculos.find(x => x.id_vehiculo === this.form.id_vehiculo);
    if (v) {
      this.form.km_inicio = v.kilometraje_actual;
    }
  }

  get kmRecorridosCalculado(): number {
    return this.form.km_fin - this.form.km_inicio;
  }

  abrirNuevo() {
    this.editando = false;
    this.form = {
      id_vehiculo: '', origen_nombre: '', origen_lat: 0, origen_lng: 0,
      destino_nombre: '', destino_lat: 0, destino_lng: 0,
      km_inicio: 0, km_fin: 0
    };
    this.modalAbierto = true;
  }

  cerrarModal() { this.modalAbierto = false; }

  guardar() {
    if (!this.form.id_vehiculo || !this.form.origen_nombre || !this.form.destino_nombre) {
      alert('Completa los campos obligatorios'); return;
    }

    if (this.form.km_fin > 0) {
      this.cargando = true;
      this.apiService.finalizarViaje({
        id_vehiculo: this.form.id_vehiculo,
        km_fin: this.form.km_fin
      }).subscribe({
        next: () => { this.cargarDatos(); this.cerrarModal(); },
        error: (e) => { alert('Error: ' + e.message); this.cargando = false; }
      });
    } else {
      this.cargando = true;
      this.apiService.iniciarViaje({
        id_vehiculo: this.form.id_vehiculo,
        origen_nombre: this.form.origen_nombre,
        origen_lat: this.form.origen_lat || 0,
        origen_lng: this.form.origen_lng || 0,
        destino_nombre: this.form.destino_nombre,
        destino_lat: this.form.destino_lat || 0,
        destino_lng: this.form.destino_lng || 0,
        km_inicio: this.form.km_inicio
      }).subscribe({
        next: () => { this.cargarDatos(); this.cerrarModal(); },
        error: (e) => { alert('Error: ' + e.message); this.cargando = false; }
      });
    }
  }
}
