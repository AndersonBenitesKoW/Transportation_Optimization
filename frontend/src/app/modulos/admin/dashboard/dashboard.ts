import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, timer, switchMap, exhaustMap } from 'rxjs';
import { FlotaService } from '../../../services/flota';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';
import { IconComponent } from '../../../components/icon.component';
import * as L from 'leaflet';

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

  flota: any[] = []; incidentes: any[] = []; alertasActivas: any[] = [];
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
  private pollSub1!: Subscription;
  private pollSub2!: Subscription;

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

  ngOnInit() {
    this.usuarioActual = this.authService.currentUserValue;
    if (!this.authService.isAuthenticated || !this.authService.isAdmin) { this.router.navigate(['/login']); return; }
    this.obtenerKPIs();
    this.pollSub1 = timer(0, 5000).pipe(
      exhaustMap(() => this.flotaService.getFlota())
    ).subscribe({
      next: (res: any) => {
        this.flota = (res.data || []).map((c: any) => { c.peligro_mecanico = (c.temperatura_motor >= 102 || c.horas_conduccion >= 10); return c; });
        this.conPeligro = this.flota.filter((c: any) => c.peligro_mecanico).length;
        this.conAnomalia = this.flota.filter((c: any) => c.anomalia_combustible).length;
        this.cargando = false;
        this.errorFlota = null;
        if (!this.map) {
          setTimeout(() => this.iniciarMapa(), 150);
        } else {
          this.map.invalidateSize();
          this.actualizarMarcadores();
        }
      },
      error: (e: any) => { this.cargando = false; this.errorFlota = 'Sin conexion con el servidor. Verifica que el backend y el simulador esten corriendo.'; console.error('Error flota:', e); }
    });
    this.pollSub2 = timer(0, 5000).pipe(
      switchMap(() => this.flotaService.getIncidentes())
    ).subscribe({
      next: (res: any) => this.incidentes = res.data || []
    });
  }

  ngOnDestroy() { this.pollSub1?.unsubscribe(); this.pollSub2?.unsubscribe(); if (this.map) this.map.remove(); }

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

  trackById(_index: number, item: any): string { return item.id_camion; }

  actualizarMarcadores() {
    if (!this.map) return;
    this.flota.forEach((camion: any) => {
      const posActual = L.latLng(camion.ubicacion.lat, camion.ubicacion.lng);
      const posDestino = L.latLng(camion.destino.lat, camion.destino.lng);
      if (this.markers[camion.id_camion]) { this.markers[camion.id_camion].setLatLng(posActual); }
      else { const m = L.marker(posActual, { icon: this.truckIcon }).addTo(this.map); m.bindTooltip(camion.id_camion, { permanent: true, direction: 'top', offset: [0, -30], className: 'etiqueta-camion' }); this.markers[camion.id_camion] = m; }
      const color = this.routeColors[camion.id_camion] || '#FF6B00';
      const puntosRuta: L.LatLngTuple[] = camion.puntos_ruta?.length > 0
        ? camion.puntos_ruta.map((p: any) => [p.lat, p.lng] as L.LatLngTuple)
        : [[posActual.lat, posActual.lng], [posDestino.lat, posDestino.lng]] as L.LatLngTuple[];
      if (this.routes[camion.id_camion]) { this.routes[camion.id_camion].setLatLngs(puntosRuta); }
      else { this.routes[camion.id_camion] = L.polyline(puntosRuta, { color, opacity: 0.7, weight: 4 }).addTo(this.map); }

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
  }

  cerrarAlerta(id: number) { this.alertasActivas = this.alertasActivas.filter((a: any) => a.id !== id); }

  obtenerKPIs() {
    this.apiService.getKPIs().subscribe({ next: (r: any) => { this.kpis = r.data; }, error: (e: any) => console.error('Error KPIs:', e) });
  }
}
