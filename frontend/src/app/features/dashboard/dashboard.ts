import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, timer, switchMap, exhaustMap, combineLatest } from 'rxjs';
import { AlertasApi, FlotaApi, KpisApi, VehiculosApi, ViajesApi } from '../../core/api';
import { AuthService } from '../../core/services/auth.service';
import { Vehiculo } from '../../shared/models';
import { IconComponent } from '../../shared/ui/icon.component';
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
  usuarioActual: any = null; kpis: any = null; rendimientoCombustible: any = null;
  conPeligro: number = 0; conAnomalia: number = 0; cargando: boolean = true;
  errorFlota: string | null = null;

  private flotaApi = inject(FlotaApi);
  private authService = inject(AuthService);
  private vehiculosApi = inject(VehiculosApi);
  private viajesApi = inject(ViajesApi);
  private kpisApi = inject(KpisApi);
  private alertasApi = inject(AlertasApi);
  private router = inject(Router);

  private map!: L.Map;
  private markers: { [id: string]: L.Marker } = {};
  private destMarkers: { [id: string]: L.Marker } = {};
  private routes: { [id: string]: L.Polyline } = {};
  private reposRoutes: Record<string, L.Polyline> = {};
  private reposRoutesDetail: Record<string, L.Polyline> = {};
  private reposPuntos: Record<string, L.CircleMarker> = {};
  private reposDetailedCoordsCache: Record<string, L.LatLngTuple[]> = {};
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
    this.cargarRendimientoCombustible();

    this.pollSub1 = timer(0, 5000).pipe(
      exhaustMap(() => this.flotaApi.getFlota())
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
      switchMap(() => this.flotaApi.getIncidentes())
    ).subscribe({
      next: (res: any) => this.incidentes = res.data || []
    });

    this.pollDespSub = timer(0, 30000).pipe(
      exhaustMap(() => this.viajesApi.getDesplazamientos())
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
    this.vehiculosApi.getVehiculos().subscribe({
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

      // 2. Dibujar ruta principal B -> C (si el viaje está activo o tiene puntos de ruta guardados)
      const tienePuntos = camion.puntos_ruta?.length > 0;
      if (tienePuntos || camion.viaje_activo) {
        const puntosRuta: L.LatLngTuple[] = tienePuntos
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
      } else {
        // Si no hay viaje activo ni puntos de ruta, limpiamos la ruta y el marcador de destino anterior
        if (this.routes[camion.id_camion]) {
          this.map.removeLayer(this.routes[camion.id_camion]);
          delete this.routes[camion.id_camion];
        }
        if (this.destMarkers[camion.id_camion]) {
          this.map.removeLayer(this.destMarkers[camion.id_camion]);
          delete this.destMarkers[camion.id_camion];
        }
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

    const activos = this.flotaOriginal.filter((c: any) => c.viaje_activo);
    const vidsWithRepos = new Set<string>();

    for (const camion of activos) {
      // Si el camión está en fase de reposición física activa, no dibujamos la línea recta
      if (camion.fase_viaje === 'reposicion') continue;

      const desp = this.desplazamientos
        .filter(d => d.id_vehiculo === camion.id_camion)
        .sort((a: any, b: any) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime())[0];

      if (!desp || !desp.origen_lat || !desp.origen_lng || !desp.destino_lat || !desp.destino_lng) continue;
      if (Math.abs(desp.origen_lat - desp.destino_lat) < 0.0001 && Math.abs(desp.origen_lng - desp.destino_lng) < 0.0001) continue;

      const key = camion.id_camion;
      vidsWithRepos.add(key);

      const cacheKey = `${desp.origen_lat.toFixed(4)},${desp.origen_lng.toFixed(4)}->${desp.destino_lat.toFixed(4)},${desp.destino_lng.toFixed(4)}`;

      // 1. Dibujar o actualizar marcador circular de origen
      const posOrigen = L.latLng(desp.origen_lat, desp.origen_lng);
      if (this.reposPuntos[key]) {
        this.reposPuntos[key].setLatLng(posOrigen);
      } else {
        this.reposPuntos[key] = L.circleMarker(
          posOrigen,
          { radius: 5, color: '#ef4444', fillColor: '#fff', fillOpacity: 1, weight: 2 }
        ).addTo(this.map);
      }

      // 2. Dibujar o actualizar la ruta de reposición
      if (this.reposDetailedCoordsCache[cacheKey]) {
        // Usar los puntos detallados en caché
        const coords = this.reposDetailedCoordsCache[cacheKey];
        if (this.reposRoutes[key]) {
          this.reposRoutes[key].setLatLngs(coords);
        } else {
          this.reposRoutes[key] = L.polyline(coords, {
            color: '#ef4444', opacity: 0.7, weight: 3, dashArray: '8 4'
          }).addTo(this.map);
        }
      } else {
        // No está en caché, dibujar línea recta temporalmente y pedir a OSRM
        const tempCoords: L.LatLngTuple[] = [
          [desp.origen_lat, desp.origen_lng],
          [desp.destino_lat, desp.destino_lng]
        ];
        
        if (this.reposRoutes[key]) {
          this.reposRoutes[key].setLatLngs(tempCoords);
        } else {
          this.reposRoutes[key] = L.polyline(tempCoords, {
            color: '#ef4444', opacity: 0.7, weight: 3, dashArray: '8 4'
          }).addTo(this.map);
        }

        // Consultar OSRM
        const url = `https://router.project-osrm.org/route/v1/driving/${desp.origen_lng},${desp.origen_lat};${desp.destino_lng},${desp.destino_lat}?overview=full&geometries=geojson`;
        fetch(url)
          .then(res => res.json())
          .then((data: any) => {
            if (data.routes && data.routes.length > 0 && data.routes[0].geometry?.coordinates) {
              const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as L.LatLngTuple);
              this.reposDetailedCoordsCache[cacheKey] = coords;
              // Si la ruta sigue siendo para el mismo camion y no ha cambiado el desplazamiento, actualizar
              if (this.reposRoutes[key] && vidsWithRepos.has(key)) {
                this.reposRoutes[key].setLatLngs(coords);
              }
            } else {
              // Cache temporal para evitar reintentar
              this.reposDetailedCoordsCache[cacheKey] = tempCoords;
            }
          })
          .catch(() => {
            this.reposDetailedCoordsCache[cacheKey] = tempCoords;
          });
      }
    }

    // Limpiar camiones que ya no tienen reposición activa
    Object.keys(this.reposRoutes).forEach(key => {
      if (!vidsWithRepos.has(key)) {
        if (this.map) {
          this.map.removeLayer(this.reposRoutes[key]);
        }
        delete this.reposRoutes[key];
      }
    });

    Object.keys(this.reposPuntos).forEach(key => {
      if (!vidsWithRepos.has(key)) {
        if (this.map) {
          this.map.removeLayer(this.reposPuntos[key]);
        }
        delete this.reposPuntos[key];
      }
    });
  }

  cerrarAlerta(id: number) { this.alertasActivas = this.alertasActivas.filter((a: any) => a.id !== id); }

  obtenerKPIs() {
    this.kpisApi.getKPIs().subscribe({ next: (r: any) => { this.kpis = r.data; }, error: (e: any) => console.error('Error KPIs:', e) });
  }

  cargarAlertasMantenimiento() {
    this.alertasApi.getMantenimientoAlertas().subscribe({
      next: (r: any) => { this.alertasMantenimiento = r.data || []; },
      error: (e: any) => console.error('Error alertas mantenimiento:', e)
    });
  }

  cargarRendimientoCombustible() {
    try {
      this.kpisApi.getRendimientoCombustible().subscribe({
        next: (r: any) => { this.rendimientoCombustible = r.data; },
        error: (e: any) => console.error('[DashboardAdminComponent.cargarRendimientoCombustible] Error:', e)
      });
    } catch (e) {
      console.error('[DashboardAdminComponent.cargarRendimientoCombustible] Error inesperado:', e);
    }
  }
}