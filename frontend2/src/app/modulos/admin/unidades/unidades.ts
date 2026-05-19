import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Vehiculo, Conductor } from '../../../services/api.service';

@Component({
  selector: 'app-unidades',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './unidades.html',
  styleUrl: './unidades.css'
})
export class UnidadesComponent implements OnInit {
  private apiService = inject(ApiService);
  
  unidades: Vehiculo[] = [];
  conductores: Conductor[] = [];
  cargando = false;
  error: string | null = null;

  modalAbierto = false;
  modalEliminar = false;
  editando = false;
  eliminarId: string | null = null;

  form: Partial<Vehiculo> = {
    id_vehiculo: '',
    placa: '',
    marca: '',
    modelo: '',
    anio: 2024,
    capacidad_tanque_L: 400,
    capacidad_carga_ton: 20,
    kilometraje_actual: 0,
    edad_motor_meses: 0,
    estado: 'Disponible',
    conductor_asignado: ''
  };

  filtrarEstado: string = 'Todas';

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.cargando = true;
    this.error = null;

    // Cargar vehículos
    this.apiService.getVehiculos().subscribe({
      next: (response) => {
        this.unidades = response.data || [];
        this.cargando = false;
      },
      error: (err) => {
        this.error = 'Error al cargar vehículos: ' + err.message;
        this.cargando = false;
        console.error('Error:', err);
      }
    });

    // Cargar conductores
    this.apiService.getConductores().subscribe({
      next: (response) => {
        this.conductores = response.data || [];
      },
      error: (err) => {
        console.error('Error al cargar conductores:', err);
      }
    });
  }

  get filtradas(): Vehiculo[] {
    if (this.filtrarEstado === 'Todas') return this.unidades;
    return this.unidades.filter(u => u.estado === this.filtrarEstado);
  }

  abrirNuevo() {
    this.editando = false;
    this.form = {
      id_vehiculo: '',
      placa: '',
      marca: '',
      modelo: '',
      anio: 2024,
      capacidad_tanque_L: 400,
      capacidad_carga_ton: 20,
      kilometraje_actual: 0,
      edad_motor_meses: 0,
      estado: 'Disponible',
      conductor_asignado: ''
    };
    this.modalAbierto = true;
  }

  abrirEditar(unidad: Vehiculo) {
    this.editando = true;
    this.form = { ...unidad };
    this.modalAbierto = true;
  }

  cerrarModal() {
    this.modalAbierto = false;
  }

  guardar() {
    if (!this.form.id_vehiculo?.trim() || !this.form.placa?.trim()) {
      alert('Por favor completa los campos obligatorios');
      return;
    }

    this.cargando = true;

    if (this.editando) {
      // Actualizar vehículo existente
      const id = this.form.id_vehiculo!;
      const { id_vehiculo, ...updateData } = this.form;
      
      this.apiService.updateVehiculo(id, updateData).subscribe({
        next: (response) => {
          console.log('Vehículo actualizado:', response);
          this.cargarDatos();
          this.cerrarModal();
        },
        error: (err) => {
          alert('Error al actualizar vehículo: ' + err.message);
          this.cargando = false;
        }
      });
    } else {
      // Crear nuevo vehículo
      this.apiService.createVehiculo(this.form as Vehiculo).subscribe({
        next: (response) => {
          console.log('Vehículo creado:', response);
          this.cargarDatos();
          this.cerrarModal();
        },
        error: (err) => {
          alert('Error al crear vehículo: ' + err.message);
          this.cargando = false;
        }
      });
    }
  }

  confirmarEliminar(id: string) {
    this.eliminarId = id;
    this.modalEliminar = true;
  }

  ejecutarEliminar() {
    if (this.eliminarId !== null) {
      this.cargando = true;
      
      this.apiService.deleteVehiculo(this.eliminarId).subscribe({
        next: (response) => {
          console.log('Vehículo eliminado:', response);
          this.cargarDatos();
          this.modalEliminar = false;
          this.eliminarId = null;
        },
        error: (err) => {
          alert('Error al eliminar vehículo: ' + err.message);
          this.cargando = false;
        }
      });
    }
  }

  cancelarEliminar() {
    this.modalEliminar = false;
    this.eliminarId = null;
  }

  getNombreConductor(id_conductor: string): string {
    const conductor = this.conductores.find(c => c.id_conductor === id_conductor);
    return conductor ? conductor.nombre : id_conductor;
  }
}
