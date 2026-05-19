import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alertas.html',
  styleUrl: './alertas.css'
})
export class AlertasComponent implements OnInit {
  private apiService = inject(ApiService);
  
  alertas: any[] = [];
  alertasFiltradas: any[] = [];
  cargando = false;
  error: string | null = null;
  filtroEstado = 'Todas';

  ngOnInit() {
    this.cargarAlertas();
    // Actualizar cada 30 segundos
    setInterval(() => this.cargarAlertas(), 30000);
  }

  cargarAlertas() {
    this.cargando = true;
    this.error = null;

    this.apiService.getAlertas().subscribe({
      next: (response) => {
        this.alertas = response.data || [];
        this.aplicarFiltro();
        this.cargando = false;
      },
      error: (err) => {
        this.error = 'Error al cargar alertas';
        this.cargando = false;
        console.error('Error:', err);
      }
    });
  }

  aplicarFiltro() {
    if (this.filtroEstado === 'Todas') {
      this.alertasFiltradas = this.alertas;
    } else {
      this.alertasFiltradas = this.alertas.filter(a => a.estado === this.filtroEstado);
    }
  }

  cambiarFiltro(estado: string) {
    this.filtroEstado = estado;
    this.aplicarFiltro();
  }

  resolverAlerta(alerta: any) {
    if (!confirm(`¿Marcar alerta como resuelta?\n\n${alerta.titulo}`)) {
      return;
    }

    this.apiService.resolverAlerta(alerta.id, 'Resuelta desde panel de alertas').subscribe({
      next: (response) => {
        console.log('Alerta resuelta:', response);
        this.cargarAlertas();
      },
      error: (err) => {
        alert('Error al resolver alerta');
        console.error('Error:', err);
      }
    });
  }

  get alertasPendientes(): number {
    return this.alertas.filter(a => a.estado === 'Pendiente').length;
  }

  get alertasCriticas(): number {
    return this.alertas.filter(a => a.prioridad === 'Crítica' && a.estado === 'Pendiente').length;
  }

  getPrioridadClass(prioridad: string): string {
    const classes: any = {
      'Crítica': 'prioridad-critica',
      'Alta': 'prioridad-alta',
      'Media': 'prioridad-media',
      'Baja': 'prioridad-baja'
    };
    return classes[prioridad] || 'prioridad-media';
  }

  getTipoIcon(tipo: string): string {
    const icons: any = {
      'Mantenimiento Preventivo': '🔧',
      'Anomalía de Combustible': '⛽',
      'Combustible Bajo': '📉',
      'Falla Inminente': '⚠️',
      'default': '🔔'
    };
    return icons[tipo] || icons['default'];
  }
}
