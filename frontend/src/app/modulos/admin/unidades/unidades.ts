import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Unidad {
  id: number;
  id_camion: string;
  conductor: string;
  placa: string;
  capacidad_tanque: number;
  edad_motor_meses: number;
  estado: string;
}

@Component({
  selector: 'app-unidades',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './unidades.html',
  styleUrl: './unidades.css'
})
export class UnidadesComponent {
  unidades: Unidad[] = [
    { id: 1, id_camion: 'CAMION-001', conductor: 'Juan Pérez', placa: 'ABC-123', capacidad_tanque: 800, edad_motor_meses: 24, estado: 'En ruta' },
    { id: 2, id_camion: 'CAMION-002', conductor: 'Carlos Mendoza', placa: 'DEF-456', capacidad_tanque: 600, edad_motor_meses: 72, estado: 'En ruta' },
    { id: 3, id_camion: 'CAMION-003', conductor: 'Luis Ramírez', placa: 'GHI-789', capacidad_tanque: 500, edad_motor_meses: 12, estado: 'Disponible' },
    { id: 4, id_camion: 'CAMION-004', conductor: 'Miguel Torres', placa: 'JKL-012', capacidad_tanque: 800, edad_motor_meses: 36, estado: 'En ruta' },
    { id: 5, id_camion: 'CAMION-005', conductor: 'Jorge Vargas', placa: 'MNO-345', capacidad_tanque: 400, edad_motor_meses: 6, estado: 'Taller' },
    { id: 6, id_camion: 'CAMION-006', conductor: 'Pedro Sánchez', placa: 'PQR-678', capacidad_tanque: 700, edad_motor_meses: 48, estado: 'Disponible' },
    { id: 7, id_camion: 'CAMION-007', conductor: 'Ana Castillo', placa: 'STU-901', capacidad_tanque: 600, edad_motor_meses: 18, estado: 'Inactivo' }
  ];

  nextId = 8;

  modalAbierto = false;
  modalEliminar = false;
  editando = false;
  eliminarId: number | null = null;

  form: Unidad = {
    id: 0,
    id_camion: '',
    conductor: '',
    placa: '',
    capacidad_tanque: 400,
    edad_motor_meses: 0,
    estado: 'Disponible'
  };

  filtrarEstado: string = 'Todas';

  get filtradas(): Unidad[] {
    if (this.filtrarEstado === 'Todas') return this.unidades;
    return this.unidades.filter(u => u.estado === this.filtrarEstado);
  }

  abrirNuevo() {
    this.editando = false;
    this.form = { id: 0, id_camion: '', conductor: '', placa: '', capacidad_tanque: 400, edad_motor_meses: 0, estado: 'Disponible' };
    this.modalAbierto = true;
  }

  abrirEditar(unidad: Unidad) {
    this.editando = true;
    this.form = { ...unidad };
    this.modalAbierto = true;
  }

  cerrarModal() {
    this.modalAbierto = false;
  }

  guardar() {
    if (!this.form.id_camion.trim() || !this.form.conductor.trim()) return;

    if (this.editando) {
      const idx = this.unidades.findIndex(u => u.id === this.form.id);
      if (idx !== -1) this.unidades[idx] = { ...this.form };
    } else {
      this.form.id = this.nextId++;
      this.unidades.push({ ...this.form });
    }

    this.cerrarModal();
  }

  confirmarEliminar(id: number) {
    this.eliminarId = id;
    this.modalEliminar = true;
  }

  ejecutarEliminar() {
    if (this.eliminarId !== null) {
      this.unidades = this.unidades.filter(u => u.id !== this.eliminarId);
    }
    this.modalEliminar = false;
    this.eliminarId = null;
  }

  cancelarEliminar() {
    this.modalEliminar = false;
    this.eliminarId = null;
  }
}
