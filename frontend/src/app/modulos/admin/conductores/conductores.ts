import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Conductor } from '../../../services/api.service';
import { IconComponent } from '../../../components/icon.component';

@Component({
  selector: 'app-conductores',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './conductores.html',
  styleUrl: './conductores.css'
})
export class ConductoresComponent implements OnInit {
  plus = 'plus'; pencil = 'pencil'; trash2 = 'trash-2'; users = 'users';

  private apiService = inject(ApiService);
  conductores: Conductor[] = []; cargando = false; error: string | null = null;
  modalAbierto = false; modalEliminar = false; editando = false; eliminarId: string | null = null;
  form: Partial<Conductor> = { id_conductor: '', nombre: '', licencia: '', telefono: '', email: '', experiencia_anios: 0, calificacion: 5.0, estado: 'Activo' };
  filtrarEstado: string = 'Todos';

  ngOnInit() { this.cargarDatos(); }

  cargarDatos() { this.cargando = true; this.error = null; this.apiService.getConductores().subscribe({ next: (r) => { this.conductores = r.data || []; this.cargando = false; }, error: (e) => { this.error = 'Error: ' + e.message; this.cargando = false; } }); }

  get filtrados(): Conductor[] { return this.filtrarEstado === 'Todos' ? this.conductores : this.conductores.filter(c => c.estado === this.filtrarEstado); }

  generarSiguienteId(): string {
    try {
      if (this.conductores.length === 0) return 'C-001';
      const nums = this.conductores
        .map(c => { const m = c.id_conductor.match(/C-0*(\d+)/i); return m ? parseInt(m[1]) : 0; })
        .filter(n => !isNaN(n));
      const siguiente = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
      return 'C-' + siguiente.toString().padStart(3, '0');
    } catch (e) {
      console.error('[ConductoresComponent.generarSiguienteId] Error al generar el siguiente ID:', e);
      return 'C-001';
    }
  }

  abrirNuevo() { this.editando = false; this.form = { id_conductor: this.generarSiguienteId(), nombre: '', licencia: 'A3B', telefono: '', email: '', experiencia_anios: 0, calificacion: 5.0, estado: 'Activo' }; this.modalAbierto = true; }
  abrirEditar(c: Conductor) { this.editando = true; this.form = { ...c }; this.modalAbierto = true; }
  cerrarModal() { this.modalAbierto = false; }

  guardar() {
    try {
      const camposInvalidos =
        !this.form.id_conductor?.trim() ||
        !this.form.nombre?.trim() ||
        !this.form.email?.trim() ||
        !this.form.telefono?.trim() ||
        !this.form.licencia?.trim() ||
        this.form.experiencia_anios == null ||
        !this.form.estado?.trim();
      if (camposInvalidos) { alert('Completa todos los campos obligatorios'); return; }
      if (!/^[0-9]{9}$/.test(this.form.telefono!.trim())) { alert('El telefono debe tener exactamente 9 digitos numericos'); return; }
      this.cargando = true;
      if (this.editando) {
        const id = this.form.id_conductor!;
        const { id_conductor, ...data } = this.form;
        this.apiService.updateConductor(id, data).subscribe({
          next: () => { this.cargarDatos(); this.cerrarModal(); },
          error: (e) => { console.error('[ConductoresComponent.guardar] Error al actualizar conductor:', e); alert('Error al actualizar: ' + e.message); this.cargando = false; }
        });
      } else {
        this.apiService.createConductor(this.form as Conductor).subscribe({
          next: () => { this.cargarDatos(); this.cerrarModal(); },
          error: (e) => { console.error('[ConductoresComponent.guardar] Error al crear conductor:', e); alert('Error al crear: ' + e.message); this.cargando = false; }
        });
      }
    } catch (e) {
      console.error('[ConductoresComponent.guardar] Error inesperado al guardar conductor:', e);
      alert('Error inesperado. Revisa la consola para mas detalles.');
      this.cargando = false;
    }
  }

  confirmarEliminar(id: string) { this.eliminarId = id; this.modalEliminar = true; }
  cancelarEliminar() { this.modalEliminar = false; this.eliminarId = null; }
  ejecutarEliminar() { if (!this.eliminarId) return; this.cargando = true; this.apiService.deleteConductor(this.eliminarId).subscribe({ next: () => { this.cargarDatos(); this.modalEliminar = false; this.eliminarId = null; }, error: (e) => { alert('Error: ' + e.message); this.cargando = false; } }); }

  soloNumeros(e: KeyboardEvent): void {
    try {
      if (!/^[0-9]$/.test(e.key)) e.preventDefault();
    } catch (err) {
      console.error('[ConductoresComponent.soloNumeros] Error al filtrar tecla:', err);
    }
  }

  getEstrellas(c: number): string { return '⭐'.repeat(Math.round(c)); }
}
