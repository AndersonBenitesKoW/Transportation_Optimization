import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService, Vehiculo, Conductor, Componente } from '../../../services/api.service';
import { IconComponent } from '../../../components/icon.component';

@Component({
  selector: 'app-unidades',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './unidades.html',
  styleUrl: './unidades.css'
})
export class UnidadesComponent implements OnInit {
  plus = 'plus'; pencil = 'pencil'; trash2 = 'trash-2'; truck = 'truck'; settings = 'settings'; xIcon = 'x';

  private apiService = inject(ApiService);
  unidades: Vehiculo[] = []; conductores: Conductor[] = [];
  cargando = false; error: string | null = null;
  modalAbierto = false; modalEliminar = false;
  modo: 'crear' | 'editar' | 'componentes' = 'crear';
  eliminarId: string | null = null;

  form: Partial<Vehiculo> = { id_vehiculo: '', placa: '', marca: '', modelo: '', anio: 2024, capacidad_tanque_L: 400, capacidad_carga_ton: 20, kilometraje_actual: 0, edad_motor_meses: 0, estado: 'Disponible', conductor_asignado: '' };
  idVehiculoNumero: string = '';
  filtrarEstado: string = 'Todas';

  private readonly PREFIJO_CAMION = 'CAMION-';

  NOMBRES_COMPONENTES_DEFAULT = ['motor', 'aceite', 'neumaticos', 'zapatas', 'mangueras', 'fajas'];
  nombresComponentes: string[] = [...this.NOMBRES_COMPONENTES_DEFAULT];
  nombresComponentesOriginales: string[] = [];
  componentesEliminados: string[] = [];

  tabActiva: string = 'datos_base';
  componentes: { [key: string]: Componente } = {};
  vehiculoEditandoId: string | null = null;

  mostrandoInputNuevo = false;
  nombreNuevoComponente = '';

  get NOMBRES_TABS() {
    const base = this.modo !== 'componentes'
      ? [{ id: 'datos_base', label: 'Datos Base' }]
      : [];
    return [...base, ...this.nombresComponentes.map(c => ({ id: c, label: this.capitalizar(c) }))];
  }

  capitalizar(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  ngOnInit() { this.cargarDatos(); }

  cargarDatos() {
    this.cargando = true; this.error = null;
    this.apiService.getVehiculos().subscribe({ next: (r) => { this.unidades = r.data || []; this.cargando = false; }, error: (e) => { this.error = 'Error: ' + e.message; this.cargando = false; } });
    this.apiService.getConductores().subscribe({ next: (r) => this.conductores = r.data || [] });
  }

  get filtradas(): Vehiculo[] { return this.filtrarEstado === 'Todas' ? this.unidades : this.unidades.filter(u => u.estado === this.filtrarEstado); }

  get conductoresDisponibles(): Conductor[] {
    const asignados = this.unidades
      .filter(u => u.id_vehiculo !== this.vehiculoEditandoId)
      .map(u => u.conductor_asignado)
      .filter(Boolean);
    return this.conductores.filter(c =>
      !asignados.includes(c.id_conductor) || c.id_conductor === this.form.conductor_asignado
    );
  }

  cambiarTab(tab: string) { this.tabActiva = tab; }

  resetComponentes() {
    this.componentes = {};
    for (const c of this.nombresComponentes) {
      this.componentes[c] = { kilometraje_acumulado: 0, tiempo_vida: 0, ultima_reparacion: undefined, proxima_reparacion: undefined };
    }
  }

  abrirNuevo() {
    this.modo = 'crear'; this.vehiculoEditandoId = null; this.tabActiva = 'datos_base';
    this.nombresComponentes = [...this.NOMBRES_COMPONENTES_DEFAULT];
    this.nombresComponentesOriginales = [];
    this.componentesEliminados = [];
    this.idVehiculoNumero = '';
    this.form = { id_vehiculo: '', placa: '', marca: '', modelo: '', anio: 2024, capacidad_tanque_L: 400, capacidad_carga_ton: 20, kilometraje_actual: 0, edad_motor_meses: 0, estado: 'Disponible', conductor_asignado: '' };
    this.resetComponentes();
    this.modalAbierto = true;
  }

  abrirEditar(u: Vehiculo) {
    this.modo = 'editar'; this.vehiculoEditandoId = u.id_vehiculo; this.tabActiva = 'datos_base';
    this.form = { ...u };
    this.idVehiculoNumero = u.id_vehiculo.startsWith(this.PREFIJO_CAMION) ? u.id_vehiculo.slice(this.PREFIJO_CAMION.length) : u.id_vehiculo;
    this.modalAbierto = true;
    this.cargarComponentes(u.id_vehiculo);
  }

  abrirConfigurar(u: Vehiculo) {
    this.modo = 'componentes'; this.vehiculoEditandoId = u.id_vehiculo;
    this.form = { ...u };
    this.idVehiculoNumero = u.id_vehiculo.startsWith(this.PREFIJO_CAMION) ? u.id_vehiculo.slice(this.PREFIJO_CAMION.length) : u.id_vehiculo;
    this.modalAbierto = true;
    this.cargarComponentes(u.id_vehiculo).then(() => {
      this.tabActiva = this.nombresComponentes.length > 0 ? this.nombresComponentes[0] : 'datos_base';
    });
  }

  cargarComponentes(id: string): Promise<void> {
    return new Promise((resolve) => {
      this.resetComponentes();
      this.apiService.getComponentes(id).subscribe({
        next: (r) => {
          const data: any = r.data || {};
          const claves = Object.keys(data);
          this.nombresComponentes = claves.length > 0 ? claves : [...this.NOMBRES_COMPONENTES_DEFAULT];
          this.nombresComponentesOriginales = [...this.nombresComponentes];
          this.componentesEliminados = [];
          this.resetComponentes();
          for (const comp of this.nombresComponentes) {
            if (data[comp]) {
              this.componentes[comp] = {
                kilometraje_acumulado: data[comp].kilometraje_acumulado ?? 0,
                tiempo_vida: data[comp].tiempo_vida ?? 0,
                ultima_reparacion: data[comp].ultima_reparacion ? String(data[comp].ultima_reparacion).split('T')[0] : undefined,
                proxima_reparacion: data[comp].proxima_reparacion ? String(data[comp].proxima_reparacion).split('T')[0] : undefined
              };
            }
          }
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  cerrarModal() { this.modalAbierto = false; }

  activarInputNuevo() {
    this.mostrandoInputNuevo = true;
    this.nombreNuevoComponente = '';
    setTimeout(() => {
      const input = document.querySelector('#input-nuevo-componente') as HTMLInputElement;
      if (input) input.focus();
    }, 50);
  }

  agregarComponente() {
    const nombre = this.nombreNuevoComponente.trim().toLowerCase();
    if (!nombre || this.nombresComponentes.includes(nombre)) { this.mostrandoInputNuevo = false; return; }
    this.nombresComponentes.push(nombre);
    this.componentes[nombre] = { kilometraje_acumulado: 0, tiempo_vida: 0, ultima_reparacion: undefined, proxima_reparacion: undefined };
    this.tabActiva = nombre;
    this.nombreNuevoComponente = '';
    this.mostrandoInputNuevo = false;
  }

  removerComponente(nombre: string) {
    if (this.nombresComponentesOriginales.includes(nombre) && !this.componentesEliminados.includes(nombre)) {
      this.componentesEliminados.push(nombre);
    }
    this.nombresComponentes = this.nombresComponentes.filter(c => c !== nombre);
    delete this.componentes[nombre];
    if (this.tabActiva === nombre) {
      this.tabActiva = this.nombresComponentes.length > 0 ? this.nombresComponentes[0] : 'datos_base';
    }
  }

  guardarTodo() {
    if (this.modo !== 'componentes') {
      if (!this.idVehiculoNumero?.trim() || !this.form.placa?.trim()) { alert('Completa los campos obligatorios'); return; }
      this.form.id_vehiculo = this.PREFIJO_CAMION + this.idVehiculoNumero.trim();
    }
    this.cargando = true;

    if (this.modo === 'componentes') {
      this.guardarComponentesYSalir();
    } else {
      const guardarVehiculo = this.modo === 'editar'
        ? this.apiService.updateVehiculo(this.form.id_vehiculo!, (({ id_vehiculo, ...rest }) => rest)(this.form))
        : this.apiService.createVehiculo(this.form as Vehiculo);

      guardarVehiculo.subscribe({
        next: () => this.guardarComponentesYSalir(),
        error: (e) => { alert('Error: ' + e.message); this.cargando = false; }
      });
    }
  }

  private guardarComponentesYSalir() {
    const eliminados$ = this.componentesEliminados.map(nombre =>
      this.apiService.deleteComponente(this.form.id_vehiculo!, nombre)
    );

    const finalizar = () => {
      const compsPayload: Record<string, Componente> = {};
      for (const comp of this.nombresComponentes) {
        const c = this.componentes[comp];
        compsPayload[comp] = {
          kilometraje_acumulado: c?.kilometraje_acumulado ?? 0,
          tiempo_vida: c?.tiempo_vida ?? 0,
          ultima_reparacion: c?.ultima_reparacion || undefined,
          proxima_reparacion: c?.proxima_reparacion || undefined
        };
      }
      this.apiService.updateComponentes(this.form.id_vehiculo!, compsPayload).subscribe({
        next: () => { this.cargarDatos(); this.cerrarModal(); },
        error: (e: any) => { alert('Error guardando componentes: ' + e.message); this.cargando = false; }
      });
    };

    if (eliminados$.length > 0) {
      forkJoin(eliminados$).subscribe({ next: finalizar, error: finalizar });
    } else {
      finalizar();
    }
  }

  confirmarEliminar(id: string) { this.eliminarId = id; this.modalEliminar = true; }
  cancelarEliminar() { this.modalEliminar = false; this.eliminarId = null; }
  ejecutarEliminar() { if (!this.eliminarId) return; this.cargando = true; this.apiService.deleteVehiculo(this.eliminarId).subscribe({ next: () => { this.cargarDatos(); this.modalEliminar = false; this.eliminarId = null; }, error: (e) => { alert('Error: ' + e.message); this.cargando = false; } }); }

  getNombreConductor(id: string): string { const c = this.conductores.find(x => x.id_conductor === id); return c ? c.nombre : id; }
}
