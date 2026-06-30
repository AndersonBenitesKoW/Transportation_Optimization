import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FlotaService } from '../../services/flota';
import { Subscription, timer, switchMap, exhaustMap } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { MantenimientoService } from '../../services/mantenimiento.service';
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
export class ConductorComponent implements OnInit, OnDestroy {
  usuarioActual: any = null;
  miCamion: any = null;
  sinTelemetria: boolean = false;
  chatAbierto: boolean = false;
  mostrarConfirmacion: boolean = false;
  cargandoLogout: boolean = false;
  alertasMantenimiento: any[] = [];
  origenNombre: string = '';
  distanciaTotalKm: number = 0;
  private ultimaPosOrigen: string = '';

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

  wrench = 'wrench';

  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private flotaService = inject(FlotaService);
  private mantenimientoService = inject(MantenimientoService);
  private alertsSub?: Subscription;
  private router = inject(Router);
  readonly themeService = inject(ThemeService);

  viajeCargando: boolean = false;
  modalEmergencia: boolean = false;
  emailVerificacion: string = '';
  emailError: string = '';
  motivoEmergencia: string = '';

  mensajeNuevo: string = '';
  historial: { texto: string, soyYo: boolean }[] = [];
  cargandoIA: boolean = false;

  private map!: L.Map;
  private marker: L.Marker | null = null;
  private destMarker: L.Marker | null = null;
  private origenMarker: L.Marker | null = null;
  private routeLine: L.Polyline | null = null;
  private routeLineRepos: L.Polyline | null = null;
  private rutaAnterior: string = '';
  private pollSub?: Subscription;

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

    this.pollSub = timer(0, 5000).pipe(
      exhaustMap(() => this.flotaService.getFlota())
    ).subscribe({
      next: (res: any) => {
        const datos = res.data?.find((c: any) => c.id_camion === this.usuarioActual?.ref);
        if (datos) {
          this.miCamion = datos;
          this.sinTelemetria = false;
          if (!this.map) {
            setTimeout(() => this.iniciarMapa(), 400);
          } else {
            setTimeout(() => {
              this.map.invalidateSize();
              this.actualizarMapaConductor();
            }, 100);
          }
        } else if (!this.miCamion) {
          this.cargarDesdeCRUD();
        }
      },
      error: (err: any) => {
        console.error('Error obteniendo datos de flota:', err);
        if (!this.miCamion) { this.cargarDesdeCRUD(); }
      }
    });

    if (this.usuarioActual?.ref) {
      this.alertsSub = this.mantenimientoService.getAlertasVehiculoRealtime(this.usuarioActual.ref).subscribe({
        next: (list) => {
          this.alertasMantenimiento = list.map(a => {
            const umbral = a.kilometraje_reparacion ?? 0;
            const pct = umbral > 0 ? (a.km_desde_reparacion / umbral) * 100 : 0;
            return {
              componente: a.componente,
              gravedad: a.tipo_alerta === 'Reemplazo' ? 'critico' : 'advertencia',
              porcentaje_desgaste: Math.min(Math.round(pct), 100),
              km_desde_reparacion: a.km_desde_reparacion,
              tiempo_vida_km: a.tiempo_vida,
              mensaje: a.mensaje
            };
          });
        },
        error: (e: any) => console.error('Error alertas mantenimiento conductor:', e)
      });
    }
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
    this.alertsSub?.unsubscribe();
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
    this.pollSub?.unsubscribe();
    this.authService.logout();
  }

  toggleChat() {
    this.chatAbierto = !this.chatAbierto;
  }

  cargarDesdeCRUD() {
    const ref = this.usuarioActual?.ref;
    if (!ref) return;
    this.apiService.getVehiculo(ref).subscribe({
      next: (r: any) => {
        const v = r.data;
        if (v) {
          this.miCamion = {
            id_camion: v.id_vehiculo,
            placa: v.placa,
            marca: v.marca,
            modelo: v.modelo,
            anio: v.anio,
            estado: v.estado,
            kilometraje: v.kilometraje_actual,
            kilometraje_actual: v.kilometraje_actual,
            capacidad_tanque_L: v.capacidad_tanque_L,
            combustible_actual_L: 0,
            nivel_combustible_pct: 0,
            conductor_asignado: { nombre: v.conductor_asignado || 'No asignado', telefono: '' },
            mision: v.estado,
            viaje_activo: false,
            destino: { nombre: '--' },
            distancia_restante_km: 0,
            ubicacion: { lat: -8.1159, lng: -79.0299 },
            puntos_ruta: []
          };
          this.sinTelemetria = true;
          this.origenNombre = '';
          this.distanciaTotalKm = 0;
          this.ultimaPosOrigen = '';
          if (!this.map) {
            setTimeout(() => this.iniciarMapa(), 400);
          }
        }
      },
      error: () => console.error('Error cargando vehiculo desde CRUD')
    });
  }

  abrirModalEmergencia(): void {
    this.emailVerificacion = '';
    this.emailError = '';
    this.motivoEmergencia = '';
    this.modalEmergencia = true;
  }

  cancelarEmergencia(): void {
    this.modalEmergencia = false;
    this.emailVerificacion = '';
    this.emailError = '';
    this.motivoEmergencia = '';
  }

  ejecutarFinalizarEmergencia(): void {
    try {
      const emailUsuario = this.usuarioActual?.email?.trim().toLowerCase();
      const emailIngresado = this.emailVerificacion.trim().toLowerCase();
      if (!emailIngresado) { this.emailError = 'Ingresa tu correo para confirmar.'; return; }
      if (emailIngresado !== emailUsuario) { this.emailError = 'El correo no coincide con tu cuenta. Verifica e intenta de nuevo.'; return; }
      if (!this.miCamion) return;

      this.viajeCargando = true;
      this.emailError = '';

      this.apiService.registrarEmergencia({
        id_vehiculo: this.miCamion.id_camion,
        email_conductor: emailIngresado,
        motivo: this.motivoEmergencia.trim() || 'No especificado'
      }).subscribe({
        next: () => {
          this.apiService.finalizarViaje({
            id_vehiculo: this.miCamion.id_camion,
            km_fin: this.miCamion.kilometraje
          }).subscribe({
            next: () => { this.viajeCargando = false; this.cancelarEmergencia(); },
            error: (e: any) => {
              console.error('[ConductorComponent.ejecutarFinalizarEmergencia] Error al finalizar viaje:', e);
              this.viajeCargando = false;
              this.cancelarEmergencia();
            }
          });
        },
        error: (e: any) => {
          console.error('[ConductorComponent.ejecutarFinalizarEmergencia] Error al registrar emergencia:', e);
          this.emailError = 'Error al registrar la emergencia. Intenta de nuevo.';
          this.viajeCargando = false;
        }
      });
    } catch (e) {
      console.error('[ConductorComponent.ejecutarFinalizarEmergencia] Error inesperado:', e);
      this.emailError = 'Error inesperado. Revisa la consola.';
      this.viajeCargando = false;
    }
  }

  toggleTema() {
    this.themeService.toggleTheme();
  }

  iniciarMapa() {
    const el = document.getElementById('mapa-conductor');
    if (!el) { console.warn('⚠️ iniciarMapa: elemento #mapa-conductor NO encontrado en el DOM'); return; }
    console.log('🟢 iniciarMapa: elemento encontrado, creando mapa...');

    const isDark = this.themeService.isDark();
    console.log(`🟢 iniciarMapa: tema isDark=${isDark}, tileLayer=${isDark ? 'CARTO light_all' : 'OSM'}`);

    this.map = L.map('mapa-conductor', {
      zoomControl: false,
      attributionControl: false
    }).setView([-8.1159, -79.0299], 13);

    if (isDark) {
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).on('tileerror', (e: any) => {
        console.warn(`⚠️ Tile CARTO error: ${e.tile?.src || '?'}`);
      }).addTo(this.map);
    } else {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).on('tileerror', (e: any) => {
        console.warn(`⚠️ Tile OSM error: ${e.tile?.src || '?'}`);
      }).addTo(this.map);
    }

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    console.log('🟢 iniciarMapa: mapa creado correctamente');
    setTimeout(() => {
      this.map.invalidateSize();
      this.actualizarMapaConductor();
    }, 300);
  }


  actualizarMapaConductor() {
    if (!this.map || !this.miCamion?.ubicacion) {
      if (!this.map) console.warn('⚠️ actualizarMapaConductor: mapa no inicializado');
      else console.warn('⚠️ actualizarMapaConductor: miCamion.ubicacion es null/undefined. Datos:', JSON.stringify(this.miCamion));
      return;
    }

    const posActual = L.latLng(this.miCamion.ubicacion.lat, this.miCamion.ubicacion.lng);

    // Si no hay viaje activo ni puntos de ruta, limpiamos marcadores de destino, origen y líneas
    if (!this.miCamion.viaje_activo && !(this.miCamion.puntos_ruta?.length > 0)) {
      if (this.destMarker) { this.map.removeLayer(this.destMarker); this.destMarker = null; }
      if (this.origenMarker) { this.map.removeLayer(this.origenMarker); this.origenMarker = null; }
      if (this.routeLine) { this.map.removeLayer(this.routeLine); this.routeLine = null; }
      if (this.routeLineRepos) { this.map.removeLayer(this.routeLineRepos); this.routeLineRepos = null; }

      if (this.marker) {
        this.marker.setLatLng(posActual);
      } else {
        this.marker = L.marker(posActual, { icon: this.darkIcon }).addTo(this.map);
        this.marker.bindTooltip('Mi Ubicacion', {
          permanent: true, direction: 'top', offset: [0, -30], className: 'etiqueta-camion'
        });
      }
      this.map.setView(posActual, 14);
      return;
    }

    console.log(`🟢 actualizarMapaConductor: ubicacion=(${this.miCamion.ubicacion.lat},${this.miCamion.ubicacion.lng}) destino=(${this.miCamion.destino?.lat},${this.miCamion.destino?.lng}) puntos_ruta=${this.miCamion.puntos_ruta?.length || 0}pts`);

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

    const posOrigen = this.miCamion.puntos_ruta?.length > 0
      ? L.latLng(this.miCamion.puntos_ruta[0].lat, this.miCamion.puntos_ruta[0].lng)
      : posActual;

    const origenKey = `${posOrigen.lat.toFixed(4)},${posOrigen.lng.toFixed(4)}`;
    if (origenKey !== this.ultimaPosOrigen) {
      this.ultimaPosOrigen = origenKey;
      this.buscarNombreOrigen(posOrigen.lat, posOrigen.lng);
      this.distanciaTotalKm = this.calcularDistanciaDirectaOrigen(posOrigen.lat, posOrigen.lng, posDestino.lat, posDestino.lng);
    }

    if (this.origenMarker) {
      this.origenMarker.setLatLng(posOrigen);
      this.origenMarker.setTooltipContent('Inicio del Viaje');
    } else if (this.miCamion.viaje_activo || this.miCamion.puntos_ruta?.length > 0) {
      this.origenMarker = L.marker(posOrigen, { icon: this.darkIcon }).addTo(this.map);
      this.origenMarker.bindTooltip('Inicio del Viaje', {
        permanent: true, direction: 'top', offset: [0, -30], className: 'etiqueta-camion'
      });
    }

    this.mapaDibujarRuta(posActual, posDestino);
  }

  private mapaDibujarRuta(posActual: L.LatLng, posDestino: L.LatLng) {
    // 1. Dibujar ruta de reposición detallada si existe y está en fase reposición
    if (this.miCamion.fase_viaje === 'reposicion' && this.miCamion.puntos_reposicion?.length > 0) {
      const ptsRepos = this.miCamion.puntos_reposicion.map((p: any) => [p.lat, p.lng] as L.LatLngTuple);
      if (this.routeLineRepos) {
        this.routeLineRepos.setLatLngs(ptsRepos);
      } else {
        this.routeLineRepos = L.polyline(ptsRepos, {
          color: '#ef4444',
          opacity: 0.8,
          weight: 3,
          dashArray: '8 4'
        }).addTo(this.map);
      }
    } else {
      if (this.routeLineRepos) {
        this.map.removeLayer(this.routeLineRepos);
        this.routeLineRepos = null;
      }
    }

    // 2. Dibujar ruta principal (Atenuada si está en reposición)
    const puntosRuta = this.miCamion.puntos_ruta?.length > 0
      ? this.miCamion.puntos_ruta.map((p: any) => [p.lat, p.lng] as L.LatLngTuple)
      : [[posActual.lat, posActual.lng], [posDestino.lat, posDestino.lng]] as L.LatLngTuple[];

    const opacity = this.miCamion.fase_viaje === 'reposicion' ? 0.35 : 0.8;
    const hashRuta = JSON.stringify(puntosRuta) + '_' + opacity;
    if (hashRuta === this.rutaAnterior && this.routeLine) return;
    this.rutaAnterior = hashRuta;

    if (this.routeLine) {
      this.routeLine.setLatLngs(puntosRuta);
      this.routeLine.setStyle({ opacity });
    } else {
      this.routeLine = L.polyline(puntosRuta, {
        color: '#f97316', opacity, weight: 4,
        lineCap: 'round', lineJoin: 'round'
      }).addTo(this.map);
    }
  }

  private buscarNombreOrigen(lat: number, lng: number) {
    if (!lat || !lng) return;
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&countrycodes=pe&zoom=16`;
    fetch(url).then(res => res.json()).then((data: any) => {
      if (data?.display_name) {
        this.origenNombre = data.display_name.split(',').slice(0, 3).join(',').trim();
      }
    }).catch(() => {});
  }

  private calcularDistanciaDirectaOrigen(lat1: number, lng1: number, lat2: number, lng2: number): number {
    if (!lat1 || !lng1 || !lat2 || !lng2) return 0;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  min(a: number, b: number): number { return Math.min(a, b); }

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
