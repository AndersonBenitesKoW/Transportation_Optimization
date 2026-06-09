import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, timer, switchMap, exhaustMap, combineLatest } from 'rxjs';
import { FlotaService } from '../../../services/flota';
import { AuthService } from '../../../services/auth.service';
import { ApiService, Vehiculo } from '../../../services/api.service';
import { IconComponent } from '../../../components/icon.component';
import * as L from 'leaflet';

interface FlotaItem {
  id: string;
  sinTelemetria: boolean;
  id_camion?: string;
  mision?: string;
  viaje_activo?: boolean;
  conductor_asignado?: any;
  peligro_mecanico?: boolean;
  anomalia_combustible?: boolean;
  kilometraje?: number;
  temperatura_motor?: number;
  combustible_actual_L?: number;
  capacidad_tanque_L?: number;
  nivel_combustible_pct?: number;
  ultima_actualizacion?: any;
  ubicacion?: any;
  destino?: any;
  puntos_ruta?: any;
  destino_viaje?: any;
  vehiculo?: Vehiculo;
  placa?: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  estado?: string;
  kilometraje_actual?: number;
  conductor_asignado_nombre?: string;
}

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardAdminComponent implements OnInit, OnDestroy {
  truck = 'truck'; alertTriangle = 'alert-triangle'; trendingUp = 'trending-up';
  trendingDown = 'trending-down'; mapPin = 'map-pin'; fuel = 'fuel'; activity = 'activity';
  wrench = 'wrench';

  flotaOriginal: any[] = [];
  vehiculosCRUD: Vehiculo[] = [];
  vehiculosCombinados: FlotaItem[] = [];
  incidentes: any[] = []; alertasActivas: any[] = [];
  alertasMantenimiento: any[] = [];
  desplazamientos: any[] = [];
  usuarioActual: any = null; kpis: any = null;
  conPeligro: number = 0; conAnomalia: number = 0; cargando: boolean = true;
  errorFlota: string | null = null;

  private flotaService = inject(FlotaService);
  private authService = inject(AuthService);
  private apiService = inject(ApiService);
  private router = inject(Router);

  private map!: L.Map;
  private markers: { [id: string]: L.Marker } = {};
  private destMarkers: { [id: string]: L.Marker } = {};
  private routes: { [id: string]: L.Polyline } = {};
  private reposRoutes: Record<string, L.Polyline> = {};
  private reposRoutesDetail: Record<string, L.Polyline> = {};
  private reposPuntos: Record<string, L.CircleMarker> = {};
  private pollSub1!: Subscription;
  private pollSub2!: Subscription;
  private pollDespSub!: Subscription;
  private crudSub!: Subscription;

  private truckIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
  });

  private destIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
  });

  private routeColors: Record<string, string> = {
    'CAMION-001': '#3498db', 'CAMION-002': '#e74c3c', 'CAMION-003': '#f1c40f', 'CAMION-004': '#2ecc71', 'CAMION-005': '#9b59b6'
  };

  private dynamicColors: string[] = ['#f97316', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1', '#ef4444'];

  min(a: number, b: number): number { return Math.min(a, b); }

  ngOnInit() {
    this.usuarioActual = this.authService.currentUserValue;
    if (!this.authService.isAuthenticated || !this.authService.isAdmin) { this.router.navigate(['/login']); return; }
    this.obtenerKPIs();
    this.cargarVehiculosCRUD();
    this.cargarAlertasMantenimiento();

    this.pollSub1 = timer(0, 5000).pipe(
      exhaustMap(() => this.flotaService.getFlota())
    ).subscribe({
      next: (res: any) => {
        this.flotaOriginal = (res.data || []).map((c: any) => { c.peligro_mecanico = (c.temperatura_motor >= 102 || c.horas_conduccion >= 10); return c; });
        this.conPeligro = this.flotaOriginal.filter((c: any) => c.peligro_mecanico).length;
        this.conAnomalia = this.flotaOriginal.filter((c: any) => c.anomalia_combustible).length;
        this.mergearVehiculos();
        this.cargando = false;
        this.errorFlota = null;
        if (!this.map) {
          setTimeout(() => this.iniciarMapa(), 150);
        } else {
          this.map.invalidateSize();
          this.actualizarMarcadores();
        }
      },
      error: (e: any) => {
        this.cargando = false;
        this.errorFlota = 'Sin conexion con el servidor. Verifica que el backend y el simulador esten corriendo.';
        this.mergearVehiculos();
        console.error('Error flota:', e);
      }
    });

    this.pollSub2 = timer(0, 5000).pipe(
      switchMap(() => this.flotaService.getIncidentes())
    ).subscribe({
      next: (res: any) => this.incidentes = res.data || []
    });

    this.pollDespSub = timer(0, 30000).pipe(
      exhaustMap(() => this.apiService.getDesplazamientos())
    ).subscribe({
      next: (r: any) => {
        this.desplazamientos = (r.data || []).sort((a: any, b: any) =>
          new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime()
        );
        if (this.map) this.dibujarReposiciones();
      }
    });
  }

  ngOnDestroy() { this.pollSub1?.unsubscribe(); this.pollSub2?.unsubscribe(); this.pollDespSub?.unsubscribe(); this.crudSub?.unsubscribe(); if (this.map) this.map.remove(); }

  cargarVehiculosCRUD() {
    this.apiService.getVehiculos().subscribe({
      next: (r) => { this.vehiculosCRUD = r.data || []; this.mergearVehiculos(); },
      error: (e) => console.error('Error cargando vehiculos CRUD:', e)
    });
  }

  mergearVehiculos() {
    const flotaIds = new Set(this.flotaOriginal.map((c: any) => c.id_camion));
    const items: FlotaItem[] = [];

    for (const camion of this.flotaOriginal) {
      items.push({
        id: camion.id_camion,
        sinTelemetria: false,
        id_camion: camion.id_camion,
        mision: camion.mision,
        viaje_activo: camion.viaje_activo,
        conductor_asignado: camion.conductor_asignado,
        peligro_mecanico: camion.peligro_mecanico,
        anomalia_combustible: camion.anomalia_combustible,
        kilometraje: camion.kilometraje,
        temperatura_motor: camion.temperatura_motor,
        combustible_actual_L: camion.combustible_actual_L,
        capacidad_tanque_L: camion.capacidad_tanque_L,
        nivel_combustible_pct: camion.nivel_combustible_pct,
        ultima_actualizacion: camion.ultima_actualizacion,
        ubicacion: camion.ubicacion,
        destino: camion.destino,
        puntos_ruta: camion.puntos_ruta,
        destino_viaje: camion.destino_viaje
      });
    }

    for (const v of this.vehiculosCRUD) {
      if (!flotaIds.has(v.id_vehiculo)) {
        items.push({
          id: v.id_vehiculo,
          sinTelemetria: true,
          vehiculo: v,
          id_camion: v.id_vehiculo,
          mision: v.estado,
          peligro_mecanico: false,
          anomalia_combustible: false,
          kilometraje: v.kilometraje_actual,
          capacidad_tanque_L: v.capacidad_tanque_L,
          temperatura_motor: 0,
          combustible_actual_L: 0,
          nivel_combustible_pct: 0,
          placa: v.placa,
          marca: v.marca,
          modelo: v.modelo,
          anio: v.anio,
          estado: v.estado,
          kilometraje_actual: v.kilometraje_actual,
          conductor_asignado_nombre: v.conductor_asignado
        });
      }
    }

    this.vehiculosCombinados = items;
  }

  iniciarMapa() {
    const el = document.getElementById('mapa-admin'); if (!el) return;
    this.map = L.map('mapa-admin', { zoomControl: false }).setView([-8.1159, -79.0299], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CARTO', subdomains: 'abcd', maxZoom: 19 }).addTo(this.map);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    setTimeout(() => {
      this.map.invalidateSize();
      this.actualizarMarcadores();
    }, 300);
  }

  trackById(_index: number, item: FlotaItem): string { return item.id; }

  actualizarMarcadores() {
    if (!this.map) return;
    this.flotaOriginal.forEach((camion: any) => {
      if (camion?.ubicacion?.lat == null || camion?.destino?.lat == null) return;
      const posActual = L.latLng(camion.ubicacion.lat, camion.ubicacion.lng);
      const posDestino = L.latLng(camion.destino.lat, camion.destino.lng);
      if (this.markers[camion.id_camion]) { this.markers[camion.id_camion].setLatLng(posActual); }
      else { const m = L.marker(posActual, { icon: this.truckIcon }).addTo(this.map); m.bindTooltip(camion.id_camion, { permanent: true, direction: 'top', offset: [0, -30], className: 'etiqueta-camion' }); this.markers[camion.id_camion] = m; }
      
      const color = this.routeColors[camion.id_camion] || this.dynamicColors[parseInt((camion.id_camion || '').replace(/\D/g, ''), 10) % this.dynamicColors.length];
      
      // 1. Dibujar ruta de reposición detallada si la fase es 'reposicion' y hay puntos
      if (camion.fase_viaje === 'reposicion' && camion.puntos_reposicion?.length > 0) {
        const ptsRepos = camion.puntos_reposicion.map((p: any) => [p.lat, p.lng] as L.LatLngTuple);
        if (this.reposRoutesDetail[camion.id_camion]) {
          this.reposRoutesDetail[camion.id_camion].setLatLngs(ptsRepos);
        } else {
          this.reposRoutesDetail[camion.id_camion] = L.polyline(ptsRepos, {
            color: '#ef4444',
            opacity: 0.8,
            weight: 3,
            dashArray: '8 4'
          }).addTo(this.map);
        }
      } else {
        if (this.reposRoutesDetail[camion.id_camion]) {
          this.map.removeLayer(this.reposRoutesDetail[camion.id_camion]);
          delete this.reposRoutesDetail[camion.id_camion];
        }
      }

      // 2. Dibujar ruta principal B -> C (Atenuada si está en reposición)
      const puntosRuta: L.LatLngTuple[] = camion.puntos_ruta?.length > 0
        ? camion.puntos_ruta.map((p: any) => [p.lat, p.lng] as L.LatLngTuple)
        : [[posActual.lat, posActual.lng], [posDestino.lat, posDestino.lng]] as L.LatLngTuple[];
      
      const opacity = camion.fase_viaje === 'reposicion' ? 0.35 : 0.75;
      if (this.routes[camion.id_camion]) {
        this.routes[camion.id_camion].setLatLngs(puntosRuta);
        this.routes[camion.id_camion].setStyle({ color, opacity, weight: 4 });
      } else {
        this.routes[camion.id_camion] = L.polyline(puntosRuta, { color, opacity, weight: 4 }).addTo(this.map);
      }

      const nombreDestino = camion.destino?.nombre || camion.destino_viaje?.nombre || 'Destino';
      if (this.destMarkers[camion.id_camion]) {
        this.destMarkers[camion.id_camion].setLatLng(posDestino);
        this.destMarkers[camion.id_camion].setTooltipContent(nombreDestino);
      } else {
        const dm = L.marker(posDestino, { icon: this.destIcon }).addTo(this.map);
        dm.bindTooltip(nombreDestino, { permanent: true, direction: 'top', offset: [0, -30], className: 'etiqueta-camion' });
        this.destMarkers[camion.id_camion] = dm;
      }
    });
    const currentIds = new Set(this.flotaOriginal.map((c: any) => c.id_camion));
    Object.keys(this.markers).forEach(id => { if (!currentIds.has(id)) { this.map.removeLayer(this.markers[id]); delete this.markers[id]; } });
    Object.keys(this.destMarkers).forEach(id => { if (!currentIds.has(id)) { this.map.removeLayer(this.destMarkers[id]); delete this.destMarkers[id]; } });
    Object.keys(this.routes).forEach(id => { if (!currentIds.has(id)) { this.map.removeLayer(this.routes[id]); delete this.routes[id]; } });
    
    // Limpiar también las reposiciones detalladas de camiones eliminados
    Object.keys(this.reposRoutesDetail).forEach(id => {
      if (!currentIds.has(id)) {
        this.map.removeLayer(this.reposRoutesDetail[id]);
        delete this.reposRoutesDetail[id];
      }
    });

    this.dibujarReposiciones();
  }

  dibujarReposiciones() {
    if (!this.map) return;
    Object.values(this.reposRoutes).forEach(r => { if (this.map) this.map.removeLayer(r); });
    Object.values(this.reposPuntos).forEach(p => { if (this.map) this.map.removeLayer(p); });
    this.reposRoutes = {}; this.reposPuntos = {};

    const activos = this.flotaOriginal.filter((c: any) => c.viaje_activo);
    for (const camion of activos) {
      // Si el camión está en fase de reposición física activa, no dibujamos la línea recta
      if (camion.fase_viaje === 'reposicion') continue;

      const desp = this.desplazamientos
        .filter(d => d.id_vehiculo === camion.id_camion)
        .sort((a: any, b: any) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime())[0];

      if (!desp || !desp.origen_lat || !desp.origen_lng || !desp.destino_lat || !desp.destino_lng) continue;
      if (Math.abs(desp.origen_lat - desp.destino_lat) < 0.0001 && Math.abs(desp.origen_lng - desp.destino_lng) < 0.0001) continue;

      const key = camion.id_camion;
      this.reposRoutes[key] = L.polyline(
        [[desp.origen_lat, desp.origen_lng], [desp.destino_lat, desp.destino_lng]],
        { color: '#ef4444', opacity: 0.7, weight: 3, dashArray: '8 4' }
      ).addTo(this.map);

      this.reposPuntos[key] = L.circleMarker(
        [desp.origen_lat, desp.origen_lng],
        { radius: 5, color: '#ef4444', fillColor: '#fff', fillOpacity: 1, weight: 2 }
      ).addTo(this.map);
    }
  }

  cerrarAlerta(id: number) { this.alertasActivas = this.alertasActivas.filter((a: any) => a.id !== id); }

  obtenerKPIs() {
    this.apiService.getKPIs().subscribe({ next: (r: any) => { this.kpis = r.data; }, error: (e: any) => console.error('Error KPIs:', e) });
  }

  cargarAlertasMantenimiento() {
    this.apiService.getMantenimientoAlertas().subscribe({
      next: (r: any) => { this.alertasMantenimiento = r.data || []; },
      error: (e: any) => console.error('Error alertas mantenimiento:', e)
    });
  }
}