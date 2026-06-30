import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { MantenimientoService } from '../../../services/mantenimiento.service';
import { IconComponent } from '../../../components/icon.component';

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './alertas.html',
  styleUrl: './alertas.css'
})
export class AlertasComponent implements OnInit, OnDestroy {
  bell = 'bell'; alertTriangle = 'alert-triangle'; refreshCw = 'refresh-cw'; circleCheck = 'circle-check'; mapPin = 'map-pin';
  min = Math.min;

  private apiService = inject(ApiService);
  private mantenimientoService = inject(MantenimientoService);
  
  alertas: any[] = [];
  alertasFiltradas: any[] = [];
  alertasEstandar: any[] = [];
  alertasMantenimiento: any[] = [];
  
  cargando = false;
  error: string | null = null;
  filtroEstado = 'Todas';
  
  private interval: any = null;
  private mantenimientoSub?: Subscription;

  ngOnInit() {
    this.cargarAlertas();
    this.interval = setInterval(() => this.cargarAlertas(), 30000);
    
    // Suscripción en tiempo real a las alertas de mantenimiento preventivo y de cambio de piezas
    this.mantenimientoSub = this.mantenimientoService.getAlertasActivasRealtime().subscribe({
      next: (list) => {
        this.alertasMantenimiento = list.map(a => ({
          id: a.id,
          titulo: a.tipo_alerta === 'Reemplazo' ? 'Cambio de Pieza Requerido' : 'Revisión Preventiva',
          id_vehiculo: a.id_vehiculo,
          prioridad: a.prioridad,
          descripcion: a.mensaje,
          fecha_creacion: a.fecha_creacion,
          estado: a.estado,
          tipo: 'Mantenimiento Preventivo',
          isMantenimiento: true,
          componente: a.componente,
          tipo_alerta: a.tipo_alerta,
          km_desde_reparacion: a.km_desde_reparacion ?? 0,
          tiempo_vida: a.tiempo_vida ?? 0,
          kilometraje_reparacion: a.kilometraje_reparacion ?? 0
        }));
        this.combinarAlertas();
      },
      error: (err) => {
        console.error('Error al escuchar alertas de mantenimiento preventivo:', err);
      }
    });
  }

  ngOnDestroy() {
    if (this.interval) clearInterval(this.interval);
    this.mantenimientoSub?.unsubscribe();
  }

  cargarAlertas() {
    this.cargando = true;
    this.error = null;
    this.apiService.getAlertas().subscribe({
      next: (r: any) => {
        this.alertasEstandar = (r.data || []).map((a: any) => ({
          ...a,
          titulo: a.titulo || a.tipo || 'Alerta del Sistema',
          descripcion: a.descripcion || a.mensaje || '',
          isMantenimiento: false
        }));
        this.combinarAlertas();
        this.cargando = false;
      },
      error: () => {
        this.error = 'Error al cargar alertas';
        this.cargando = false;
      }
    });
  }

  combinarAlertas() {
    const combinadas = [...this.alertasEstandar, ...this.alertasMantenimiento];
    
    // Ordenar: Pendientes primero, luego por prioridad (Critica, Alta, Media, Baja), luego por fecha más reciente
    combinadas.sort((a, b) => {
      if (a.estado === 'Pendiente' && b.estado !== 'Pendiente') return -1;
      if (a.estado !== 'Pendiente' && b.estado === 'Pendiente') return 1;

      const pA = a.prioridad === 'Critica' ? 4 : (a.prioridad === 'Alta' ? 3 : (a.prioridad === 'Media' ? 2 : 1));
      const pB = b.prioridad === 'Critica' ? 4 : (b.prioridad === 'Alta' ? 3 : (b.prioridad === 'Media' ? 2 : 1));
      if (pA !== pB) return pB - pA;

      return new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime();
    });

    this.alertas = combinadas;
    this.aplicarFiltro();
  }

  aplicarFiltro() {
    this.alertasFiltradas = this.filtroEstado === 'Todas' 
      ? this.alertas 
      : this.alertas.filter((a: any) => a.estado === this.filtroEstado);
  }

  cambiarFiltro(e: string) {
    this.filtroEstado = e;
    this.aplicarFiltro();
  }

  resolverAlerta(a: any) {
    if (!confirm(`¿Marcar alerta como resuelta?\n\n${a.titulo}`)) return;
    this.apiService.resolverAlerta(a.id, 'Resuelta desde panel').subscribe({
      next: () => this.cargarAlertas(),
      error: () => alert('Error al resolver la alerta.')
    });
  }

  marcarRevisado(a: any) {
    if (!confirm(`¿Marcar como revisado el componente "${a.componente}" del vehículo ${a.id_vehiculo}?`)) return;
    this.mantenimientoService.marcarComoRevisado(a.id, a.id_vehiculo, a.componente)
      .then(() => {
        // No es necesario llamar a cargarAlertas() ya que la suscripción onSnapshot actualiza la lista automáticamente.
      })
      .catch((err) => alert('Error al registrar revisión: ' + err.message));
  }

  marcarReemplazado(a: any) {
    if (!confirm(`¿Confirmar reemplazo completo del componente "${a.componente}" del vehículo ${a.id_vehiculo}?\nEsto reiniciará su desgaste acumulado a 0.`)) return;
    this.mantenimientoService.marcarComoReemplazado(a.id, a.id_vehiculo, a.componente)
      .then(() => {
        // No es necesario llamar a cargarAlertas() ya que la suscripción onSnapshot actualiza la lista automáticamente.
      })
      .catch((err) => alert('Error al registrar reemplazo: ' + err.message));
  }

  get alertasPendientes(): number {
    return this.alertas.filter((a: any) => a.estado === 'Pendiente').length;
  }

  get alertasCriticas(): number {
    return this.alertas.filter((a: any) => a.prioridad === 'Critica' && a.estado === 'Pendiente').length;
  }

  getPrioridadClass(p: string): string {
    const m: any = {
      'Critica': 'bg-red-50 text-red-600',
      'Alta': 'bg-yellow-50 text-yellow-700',
      'Media': 'bg-blue-50 text-blue-700',
      'Baja': 'bg-green-50 text-green-600'
    };
    return m[p] || 'bg-blue-50 text-blue-700';
  }

  getTipoIcon(t: string): string {
    const m: any = {
      'Mantenimiento Preventivo': '🔧',
      'Anomalia de Combustible': '⛽',
      'Combustible Bajo': '📉',
      'Falla Inminente': '⚠️'
    };
    return m[t] || '🔔';
  }
}
