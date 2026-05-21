import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';
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

  private apiService = inject(ApiService);
  alertas: any[] = []; alertasFiltradas: any[] = []; cargando = false; error: string | null = null;
  filtroEstado = 'Todas'; private interval: any = null;

  ngOnInit() { this.cargarAlertas(); this.interval = setInterval(() => this.cargarAlertas(), 30000); }
  ngOnDestroy() { if (this.interval) clearInterval(this.interval); }

  cargarAlertas() { this.cargando = true; this.error = null; this.apiService.getAlertas().subscribe({ next: (r: any) => { this.alertas = r.data || []; this.aplicarFiltro(); this.cargando = false; }, error: () => { this.error = 'Error al cargar alertas'; this.cargando = false; } }); }

  aplicarFiltro() { this.alertasFiltradas = this.filtroEstado === 'Todas' ? this.alertas : this.alertas.filter((a: any) => a.estado === this.filtroEstado); }
  cambiarFiltro(e: string) { this.filtroEstado = e; this.aplicarFiltro(); }

  resolverAlerta(a: any) { if (!confirm(`Marcar alerta como resuelta?\n\n${a.titulo}`)) return; this.apiService.resolverAlerta(a.id, 'Resuelta desde panel').subscribe({ next: () => this.cargarAlertas(), error: () => alert('Error') }); }

  get alertasPendientes(): number { return this.alertas.filter((a: any) => a.estado === 'Pendiente').length; }
  get alertasCriticas(): number { return this.alertas.filter((a: any) => a.prioridad === 'Critica' && a.estado === 'Pendiente').length; }

  getPrioridadClass(p: string): string { const m: any = { 'Critica': 'bg-red-50 text-red-600', 'Alta': 'bg-yellow-50 text-yellow-700', 'Media': 'bg-blue-50 text-blue-700', 'Baja': 'bg-green-50 text-green-600' }; return m[p] || 'bg-blue-50 text-blue-700'; }
  getTipoIcon(t: string): string { const m: any = { 'Mantenimiento Preventivo': '🔧', 'Anomalia de Combustible': '⛽', 'Combustible Bajo': '📉', 'Falla Inminente': '⚠️' }; return m[t] || '🔔'; }
}
