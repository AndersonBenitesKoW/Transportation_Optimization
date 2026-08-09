import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConductoresApi, UsuariosApi } from '../../core/api';
import { Conductor, Usuario } from '../../shared/models';
import { IconComponent } from '../../shared/ui/icon.component';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css'
})
export class UsuariosComponent implements OnInit {
  shield = 'shield'; trash2 = 'trash-2'; pencil = 'pencil'; plus = 'plus'; xIcon = 'x'; search = 'search';

  private usuariosApi = inject(UsuariosApi);
  private conductoresApi = inject(ConductoresApi);
  usuarios: Usuario[] = [];
  conductores: Conductor[] = [];
  cargando = false; error: string | null = null;
  modalAbierto = false; modalEliminar = false;
  modo: 'crear' | 'editar' = 'crear';
  modoTipo: 'admin' | 'conductor' = 'admin';
  eliminarId: string | null = null;
  editandoId: string | null = null;
  mostrarPassword = false;
  busquedaConductor = '';
  mostrandoDropdown = false;

  form: any = { nombre: '', email: '', password: '', telefono: '', rol: 'ADMIN', id_conductor: '' };

  ngOnInit() { this.cargarDatos(); }

  cargarDatos() {
    this.cargando = true; this.error = null;
    this.usuariosApi.getUsuarios().subscribe({
      next: (r) => { this.usuarios = r.data || []; this.cargando = false; },
      error: (e) => { this.error = 'Error: ' + e.message; this.cargando = false; }
    });
    this.conductoresApi.getConductores().subscribe({
      next: (r) => this.conductores = r.data || []
    });
  }

  get conteoAdmin(): number { return this.usuarios.filter(u => u.rol === 'ADMIN').length; }
  get conteoConductor(): number { return this.usuarios.filter(u => u.rol === 'CONDUCTOR').length; }

  get conductoresDisponibles(): Conductor[] {
    const idsConCuenta = new Set(
      this.usuarios.filter(u => u.id_conductor).map(u => u.id_conductor)
    );
    return this.conductores.filter(c => !idsConCuenta.has(c.id_conductor));
  }

  get conductoresFiltrados(): Conductor[] {
    const q = this.busquedaConductor.toLowerCase().trim();
    const disponibles = this.conductoresDisponibles;
    if (!q) return disponibles.slice(0, 20);
    return disponibles.filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      c.id_conductor.toLowerCase().includes(q)
    ).slice(0, 10);
  }

  get conductorSeleccionadoText(): string {
    if (!this.form.id_conductor) return '';
    const c = this.conductores.find(x => x.id_conductor === this.form.id_conductor);
    return c ? `${c.nombre} (${c.id_conductor})` : this.form.id_conductor;
  }

  abrirNuevo() {
    this.modo = 'crear'; this.editandoId = null;
    this.modoTipo = 'admin';
    this.form = { nombre: '', email: '', password: '', telefono: '', rol: 'ADMIN', id_conductor: '' };
    this.busquedaConductor = '';
    this.mostrandoDropdown = false;
    this.mostrarPassword = false;
    this.modalAbierto = true;
  }

  abrirEditar(u: Usuario) {
    this.modo = 'editar'; this.editandoId = u.id!;
    this.modoTipo = u.rol === 'CONDUCTOR' ? 'conductor' : 'admin';
    this.form = { nombre: u.nombre, email: u.email, password: '', telefono: u.telefono || '', rol: u.rol, id_conductor: u.id_conductor || '' };
    this.busquedaConductor = '';
    this.mostrandoDropdown = false;
    this.mostrarPassword = false;
    this.modalAbierto = true;
  }

  cambiarTipo(tipo: 'admin' | 'conductor') {
    this.modoTipo = tipo;
    this.form.rol = tipo === 'admin' ? 'ADMIN' : 'CONDUCTOR';
    if (tipo === 'admin') {
      this.form.id_conductor = '';
      this.busquedaConductor = '';
      this.mostrandoDropdown = false;
    }
  }

  onBuscarConductor() {
    this.mostrandoDropdown = true;
    if (this.form.id_conductor) {
      this.form.id_conductor = '';
      this.form.nombre = '';
      this.form.email = '';
      this.form.telefono = '';
    }
  }

  onFocusConductor() {
    if (this.conductoresFiltrados.length > 0) {
      this.mostrandoDropdown = true;
    }
  }

  ocultarDropdown() {
    setTimeout(() => { this.mostrandoDropdown = false; }, 200);
  }

  seleccionarConductor(cond: Conductor) {
    this.form.id_conductor = cond.id_conductor;
    this.form.nombre = cond.nombre;
    this.form.telefono = cond.telefono || '';
    this.form.email = cond.email || '';
    this.busquedaConductor = `${cond.nombre} (${cond.id_conductor})`;
    this.mostrandoDropdown = false;
  }

  limpiarConductor() {
    this.form.id_conductor = '';
    this.form.nombre = '';
    this.busquedaConductor = '';
    this.mostrandoDropdown = false;
  }

  cerrarModal() { this.modalAbierto = false; }

  guardar() {
    if (!this.form.email?.trim()) { alert('El email es obligatorio'); return; }
    if (this.modo === 'crear' && !this.form.password?.trim()) { alert('La contrasena es obligatoria'); return; }

    if (this.modoTipo === 'conductor' && this.modo === 'crear') {
      if (!this.form.id_conductor) { alert('Selecciona un conductor de la lista'); return; }
    }

    this.cargando = true;
    if (this.modo === 'crear') {
      const data: any = {
        nombre: this.form.nombre,
        email: this.form.email,
        password: this.form.password,
        telefono: this.form.telefono,
        rol: this.form.rol
      };
      if (this.modoTipo === 'conductor' && this.form.id_conductor) {
        data.id_conductor = this.form.id_conductor;
      }
      this.usuariosApi.register(data).subscribe({
        next: () => { this.cargarDatos(); this.cerrarModal(); },
        error: (e) => { alert('Error: ' + (e.error?.detail || e.message)); this.cargando = false; }
      });
    } else {
      const data: any = { nombre: this.form.nombre, email: this.form.email, telefono: this.form.telefono, rol: this.form.rol };
      if (this.form.password?.trim()) { data.password = this.form.password; }
      this.usuariosApi.updateUsuario(this.editandoId!, data).subscribe({
        next: () => { this.cargarDatos(); this.cerrarModal(); },
        error: (e) => { alert('Error: ' + e.message); this.cargando = false; }
      });
    }
  }

  confirmarEliminar(id: string) { this.eliminarId = id; this.modalEliminar = true; }
  cancelarEliminar() { this.modalEliminar = false; this.eliminarId = null; }

  ejecutarEliminar() {
    if (!this.eliminarId) return;
    this.cargando = true;
    this.usuariosApi.deleteUsuario(this.eliminarId).subscribe({
      next: () => { this.cargarDatos(); this.modalEliminar = false; this.eliminarId = null; },
      error: (e) => { alert('Error: ' + e.message); this.cargando = false; }
    });
  }
}