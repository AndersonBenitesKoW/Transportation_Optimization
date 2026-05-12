import { Component, OnInit, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FlotaService } from '../../../services/flota';
import * as L from 'leaflet';
import 'leaflet-routing-machine';

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardAdminComponent implements OnInit, AfterViewInit {
  flota: any[] = [];
  incidentes: any[] = [];
  alertasActivas: any[] = [];
  usuarioActual: any = null;

  conPeligro: number = 0;
  conAnomalia: number = 0;

  private flotaService = inject(FlotaService);
  private router = inject(Router);

  private map!: L.Map;
  private markers: { [id: string]: L.Marker } = {};
  private routes: { [id: string]: any } = {};

  private customIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
  });

  ngOnInit() {
    const sesion = localStorage.getItem('fleetmind_user');
    if (sesion) {
      this.usuarioActual = JSON.parse(sesion);
      if (this.usuarioActual.rol !== 'ADMIN') this.router.navigate(['/login']);
    } else {
      this.router.navigate(['/login']);
    }

    this.obtenerDatos();
    setInterval(() => this.obtenerDatos(), 5000);
  }

  ngAfterViewInit() {
    setTimeout(() => this.iniciarMapa(), 200);
  }

  iniciarMapa() {
    const el = document.getElementById('mapa-admin');
    if (!el) return;
    this.map = L.map('mapa-admin').setView([-8.1159, -79.0299], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
    setTimeout(() => this.map.invalidateSize(), 300);
  }

  obtenerDatos() {
    this.flotaService.getFlota().subscribe({
      next: (res) => {
        this.flota = res.data.map((c: any) => {
          c.peligro_mecanico = (c.temperatura_motor >= 102 || c.horas_conduccion >= 10);
          return c;
        });
        this.conPeligro = this.flota.filter(c => c.peligro_mecanico).length;
        this.conAnomalia = this.flota.filter(c => c.anomalia_combustible).length;
        this.actualizarMarcadores();
      }
    });

    this.flotaService.getIncidentes().subscribe({
      next: (res) => this.incidentes = res.data
    });
  }

  actualizarMarcadores() {
    if (!this.map) return;
    this.flota.forEach(camion => {
      const posActual = L.latLng(camion.ubicacion.lat, camion.ubicacion.lng);
      const posDestino = L.latLng(camion.destino.lat, camion.destino.lng);

      if (this.markers[camion.id_camion]) {
        this.markers[camion.id_camion].setLatLng(posActual);
      } else {
        const marker = L.marker(posActual, { icon: this.customIcon }).addTo(this.map);
        marker.bindTooltip(`${camion.id_camion}`, { permanent: true, direction: 'top', offset: [0, -30] });
        this.markers[camion.id_camion] = marker;
      }
      this.actualizarRuta(camion.id_camion, posActual, posDestino);
    });
  }

  actualizarRuta(id: string, origen: L.LatLng, destino: L.LatLng) {
    if (this.routes[id]) this.map.removeControl(this.routes[id]);

    const colores: any = {
      'CAMION-001': '#3498db',
      'CAMION-002': '#e74c3c',
      'CAMION-003': '#f1c40f',
      'CAMION-004': '#2ecc71',
      'CAMION-005': '#9b59b6'
    };

    const planSinMarcadores = L.Routing.plan([origen, destino], {
      createMarker: () => null as any
    });

    this.routes[id] = L.Routing.control({
      plan: planSinMarcadores,
      show: false,
      addWaypoints: false,
      fitSelectedRoutes: false,
      routeWhileDragging: false,
      lineOptions: {
        styles: [{ color: colores[id] || '#333', opacity: 0.7, weight: 5 }],
        extendToWaypoints: true,
        missingRouteTolerance: 0
      }
    }).addTo(this.map);
  }

  cerrarAlerta(id: number) {
    this.alertasActivas = this.alertasActivas.filter(a => a.id !== id);
  }
}
