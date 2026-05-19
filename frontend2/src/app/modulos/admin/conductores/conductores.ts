import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Conductor } from '../../../services/api.service';

@Component({
  selector: 'app-conductores',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conductores.html',
  styleUrl: './conductores.css'
})
export class ConductoresComponent implements OnInit {
  private apiService = inject(ApiService);
  
  conductores: Conductor[] = [];
  cargando = false;
  error: string | null = null;

  modalAbierto = false;
  modalEliminar = false;
  editando = false;
  eliminarId: string | null = null;

  form: Partial<Conductor> = {
    id_conductor: '',
    nombre: '',
    licencia: '',
    telefono: '',
    email: '',
    experiencia_anios: 0,
    calificacion: 5.0,
    estado: 'Activo'
  };

  filtrarEstado: string = 'Todos';

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.cargando = true;
    this.error = null;

    this.apiService.getConductores().subscribe({
      next: (response) => {
        this.conductores = response.data || [];
        this.cargando = false;
      },
      error: (err) => {
        this.error = 'Error al cargar conductores: ' + err.message;
        this.cargando = false;
        console.error('Error:', err);
      }
    });
  }

  get filtrados(): Conductor[] {
    if (this.filtrarEstado === 'Todos') return this.conductores;
    return this.conductores.filter(c => c.estado === this.filtrarEstado);
  }

  abrirNuevo() {
    this.editando = false;
    this.form = {
      id_conductor: '',
      nombre: '',
      licencia: 'A3B',
      telefono: '',
      email: '',
      experiencia_anios: 0,
      calificacion: 5.0,
      estado: 'Activo'
    };
    this.modalAbierto = true;
  }

  abrirEditar(conductor: Conductor) {
    this.editando = true;
    this.form = { ...conductor };
    this.modalAbierto = true;
  }

  cerrarModal() {
    this.modalAbierto = false;
  }

  guardar() {
    if (!this.form.id_conductor?.trim() || !this.form.nombre?.trim() || !this.form.email?.trim()) {
      alert('Por favor completa los campos obligatorios');
      return;
    }

    // Validar email
    const emailRegex = /^[\w.-]+@[\w.-]+\.\w{2,}$/;
    if (!emailRegex.test(this.form.email)) {
      alert('Por favor ingresa un email válido');
      return;
    }

    // Validar teléfono
    if (this.form.telefono && !/^\d{9,}$/.test(this.form.telefono)) {
      alert('El teléfono debe tener al menos 9 dígitos');
      return;
    }

    this.cargando = true;

    if (this.editando) {
      // Actualizar conductor existente
      const id = this.form.id_conductor!;
      const { id_conductor, ...updateData } = this.form;
      
      this.apiService.updateConductor(id, updateData).subscribe({
        next: (response) => {
          console.log('Conductor actualizado:', response);
          this.cargarDatos();
          this.cerrarModal();
        },
        error: (err) => {
          alert('Error al actualizar conductor: ' + err.message);
          this.cargando = false;
        }
      });
    } else {
      // Crear nuevo conductor
      this.apiService.createConductor(this.form as Conductor).subscribe({
        next: (response) => {
          console.log('Conductor creado:', response);
          this.cargarDatos();
          this.cerrarModal();
        },
        error: (err) => {
          alert('Error al crear conductor: ' + err.message);
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
      
      this.apiService.deleteConductor(this.eliminarId).subscribe({
        next: (response) => {
          console.log('Conductor eliminado:', response);
          this.cargarDatos();
          this.modalEliminar = false;
          this.eliminarId = null;
        },
        error: (err) => {
          alert('Error al eliminar conductor: ' + err.message);
          this.cargando = false;
        }
      });
    }
  }

  cancelarEliminar() {
    this.modalEliminar = false;
    this.eliminarId = null;
  }

  getEstrellas(calificacion: number): string {
    const estrellas = Math.round(calificacion);
    return '⭐'.repeat(estrellas);
  }
}
