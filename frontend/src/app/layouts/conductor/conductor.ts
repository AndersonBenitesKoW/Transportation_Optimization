import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FlotaService } from '../../services/flota';
import { ApiService } from '../../services/api.service';
import { ThemeService } from '../../services/theme.service';
import { IconComponent } from '../../components/icon.component';
import * as L from 'leaflet';

@Component({
  selector: 'app-conductor',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './conductor.html',
  styleUrl: './conductor.css'
})
export class ConductorComponent implements OnInit, AfterViewInit, OnDestroy {
  usuarioActual: any = null;
  miCamion: any = null;
  chatAbierto: boolean = false;
  mostrarConfirmacion: boolean = false;
  cargandoLogout: boolean = false;

  logOut = 'log-out';
  sun = 'sun';
  moon = 'moon';
  mapPin = 'map-pin';
  fuel = 'fuel';
  messageCircle = 'message-circle';
  send = 'send';
  x = 'x';
  alertTriangle = 'alert-triangle';
  truck = 'truck';
  zap = 'zap';

  private apiService = inject(ApiService);
  private flotaService = inject(FlotaService);
  private router = inject(Router);
  readonly themeService = inject(ThemeService);

  mensajeNuevo: string = '';
  historial: { texto: string, soyYo: boolean }[] = [];
  cargandoIA: boolean = false;

  private map!: L.Map;
  private marker!: L.Marker;
  private destMarker!: L.Marker;
  private routeLine: L.Polyline | null = null;
  private rutaAnterior: string = '';
  private pollingInterval: any = null;

  private darkIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  private destIconOrange = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  ngOnInit() {
    const sesion = localStorage.getItem('fleetmind_user');
    if (sesion) {
      this.usuarioActual = JSON.parse(sesion);
      if (this.usuarioActual.rol !== 'CONDUCTOR') {
        this.router.navigate(['/login']);
      }
    } else {
      this.router.navigate(['/login']);
    }

    this.obtenerDatosFlota();
    this.pollingInterval = setInterval(() => this.obtenerDatosFlota(), 5000);
  }

  ngAfterViewInit() {
    setTimeout(() => this.iniciarMapa(), 300);
  }

  ngOnDestroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    if (this.map) {
      this.map.remove();
    }
  }

  get iniciales(): string {
    if (!this.usuarioActual?.nombre) return '??';
    const partes = this.usuarioActual.nombre.split(' ');
    return (partes[0]?.[0] || '') + (partes[1]?.[0] || partes[0]?.[1] || '').toUpperCase();
  }

  get nivelCombustible(): number {
    return this.miCamion?.nivel_combustible_pct || 0;
  }

  get combustibleColor(): string {
    if (this.nivelCombustible <= 15) return '#EF4444';
    if (this.nivelCombustible <= 40) return '#F59E0B';
    return '#22C55E';
  }

  abrirConfirmacionLogout() {
    this.mostrarConfirmacion = true;
  }

  cancelarLogout() {
    this.mostrarConfirmacion = false;
  }

  confirmarLogout() {
    this.cargandoLogout = true;
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    setTimeout(() => {
      localStorage.removeItem('fleetmind_user');
      this.router.navigate(['/login']);
    }, 400);
  }

  toggleChat() {
    this.chatAbierto = !this.chatAbierto;
  }

  toggleTema() {
    this.themeService.toggleTheme();
  }

  iniciarMapa() {
    const el = document.getElementById('mapa-conductor');
    if (!el) return;

    const isDark = this.themeService.isDark();

    this.map = L.map('mapa-conductor', {
      zoomControl: false,
      attributionControl: false
    }).setView([-8.1159, -79.0299], 13);

    if (isDark) {
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(this.map);
    } else {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(this.map);
    }

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
  }

  obtenerDatosFlota() {
    if (!this.usuarioActual?.ref) return;
    this.flotaService.getFlota().subscribe({
      next: (res: any) => {
        const datos = res.data?.find((c: any) => c.id_camion === this.usuarioActual.ref);
        if (datos) {
          this.miCamion = datos;
          if (this.map) {
            setTimeout(() => {
              this.map.invalidateSize();
              this.actualizarMapaConductor();
            }, 100);
          }
        }
      },
      error: (err: any) => console.error('Error obteniendo datos de flota:', err)
    });
  }

  actualizarMapaConductor() {
    if (!this.map || !this.miCamion?.ubicacion) return;

    const posActual = L.latLng(this.miCamion.ubicacion.lat, this.miCamion.ubicacion.lng);
    const posDestino = L.latLng(this.miCamion.destino.lat, this.miCamion.destino.lng);

    if (this.marker) {
      this.marker.setLatLng(posActual);
    } else {
      this.marker = L.marker(posActual, { icon: this.darkIcon }).addTo(this.map);
      this.marker.bindTooltip('Mi Ubicacion', {
        permanent: true, direction: 'top', offset: [0, -30], className: 'etiqueta-camion'
      });
      this.map.setView(posActual, 14);
    }

    if (this.destMarker) {
      this.destMarker.setLatLng(posDestino);
    } else {
      this.destMarker = L.marker(posDestino, { icon: this.destIconOrange }).addTo(this.map);
      this.destMarker.bindTooltip(this.miCamion.destino?.nombre || 'Destino', {
        permanent: true, direction: 'top', offset: [0, -30], className: 'etiqueta-camion'
      });
    }

    this.mapaDibujarRuta(posActual, posDestino);
  }

  private mapaDibujarRuta(posActual: L.LatLng, posDestino: L.LatLng) {
    const puntosRuta = this.miCamion.puntos_ruta?.length > 0
      ? this.miCamion.puntos_ruta.map((p: any) => [p.lat, p.lng] as L.LatLngTuple)
      : [[posActual.lat, posActual.lng], [posDestino.lat, posDestino.lng]] as L.LatLngTuple[];

    const hashRuta = JSON.stringify(puntosRuta);
    if (hashRuta === this.rutaAnterior && this.routeLine) return;
    this.rutaAnterior = hashRuta;

    if (this.routeLine) {
      this.routeLine.setLatLngs(puntosRuta);
    } else {
      this.routeLine = L.polyline(puntosRuta, {
        color: '#FF6B00', opacity: 0.85, weight: 5,
        dashArray: '10 6', lineCap: 'round', lineJoin: 'round'
      }).addTo(this.map);
    }
  }

  enviarConsulta() {
    if (!this.mensajeNuevo.trim() || this.cargandoIA) return;
    const pregunta = this.mensajeNuevo;
    this.historial.push({ texto: pregunta, soyYo: true });
    this.mensajeNuevo = '';
    this.cargandoIA = true;
    this.apiService.enviarMensajeChat(pregunta, this.usuarioActual.rol, this.usuarioActual.ref).subscribe({
      next: (res: any) => {
        const textoLimpio = (res?.respuesta || '').replaceAll('**', '').replaceAll('*', '');
        this.historial.push({ texto: textoLimpio, soyYo: false });
        this.cargandoIA = false;
      },
      error: (err: any) => {
        console.error(err);
        this.historial.push({ texto: 'Hubo un error al conectar con la central.', soyYo: false });
        this.cargandoIA = false;
      }
    });
  }
}
