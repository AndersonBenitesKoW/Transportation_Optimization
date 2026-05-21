import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Vehiculo, Conductor } from '../../../services/api.service';
import { IconComponent } from '../../../components/icon.component';

@Component({
  selector: 'app-unidades',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './unidades.html',
  styleUrl: './unidades.css'
})
export class UnidadesComponent implements OnInit {
  plus = 'plus'; pencil = 'pencil'; trash2 = 'trash-2'; truck = 'truck';

  private apiService = inject(ApiService);
  unidades: Vehiculo[] = []; conductores: Conductor[] = [];
  cargando = false; error: string | null = null;
  modalAbierto = false; modalEliminar = false; editando = false;
  eliminarId: string | null = null;

  form: Partial<Vehiculo> = { id_vehiculo: '', placa: '', marca: '', modelo: '', anio: 2024, capacidad_tanque_L: 400, capacidad_carga_ton: 20, kilometraje_actual: 0, edad_motor_meses: 0, estado: 'Disponible', conductor_asignado: '' };
  filtrarEstado: string = 'Todas';

  ngOnInit() { this.cargarDatos(); }

  cargarDatos() {
    this.cargando = true; this.error = null;
    this.apiService.getVehiculos().subscribe({ next: (r) => { this.unidades = r.data || []; this.cargando = false; }, error: (e) => { this.error = 'Error: ' + e.message; this.cargando = false; } });
    this.apiService.getConductores().subscribe({ next: (r) => this.conductores = r.data || [] });
  }

  get filtradas(): Vehiculo[] { return this.filtrarEstado === 'Todas' ? this.unidades : this.unidades.filter(u => u.estado === this.filtrarEstado); }

  abrirNuevo() { this.editando = false; this.form = { id_vehiculo: '', placa: '', marca: '', modelo: '', anio: 2024, capacidad_tanque_L: 400, capacidad_carga_ton: 20, kilometraje_actual: 0, edad_motor_meses: 0, estado: 'Disponible', conductor_asignado: '' }; this.modalAbierto = true; }
  abrirEditar(u: Vehiculo) { this.editando = true; this.form = { ...u }; this.modalAbierto = true; }
  cerrarModal() { this.modalAbierto = false; }

  guardar() {
    if (!this.form.id_vehiculo?.trim() || !this.form.placa?.trim()) { alert('Completa los campos obligatorios'); return; }
    this.cargando = true;
    if (this.editando) {
      const id = this.form.id_vehiculo!; const { id_vehiculo, ...data } = this.form;
      this.apiService.updateVehiculo(id, data).subscribe({ next: () => { this.cargarDatos(); this.cerrarModal(); }, error: (e) => { alert('Error: ' + e.message); this.cargando = false; } });
    } else {
      this.apiService.createVehiculo(this.form as Vehiculo).subscribe({ next: () => { this.cargarDatos(); this.cerrarModal(); }, error: (e) => { alert('Error: ' + e.message); this.cargando = false; } });
    }
  }

  confirmarEliminar(id: string) { this.eliminarId = id; this.modalEliminar = true; }
  cancelarEliminar() { this.modalEliminar = false; this.eliminarId = null; }
  ejecutarEliminar() { if (!this.eliminarId) return; this.cargando = true; this.apiService.deleteVehiculo(this.eliminarId).subscribe({ next: () => { this.cargarDatos(); this.modalEliminar = false; this.eliminarId = null; }, error: (e) => { alert('Error: ' + e.message); this.cargando = false; } }); }

  getNombreConductor(id: string): string { const c = this.conductores.find(x => x.id_conductor === id); return c ? c.nombre : id; }
}
