import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FlotaApi, VehiculosApi, ViajesApi } from '../../core/api';
import { Desplazamiento, Vehiculo, Viaje } from '../../shared/models';
import { MantenimientoService } from '../../core/api/mantenimiento.api';
import { IconComponent } from '../../shared/ui/icon.component';
import * as L from 'leaflet';

interface Sugerencia {
  nombre: string;
  nombreCompleto: string;
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-viajes',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './viajes.html',
  styleUrl: './viajes.css'
})
export class ViajesComponent implements OnInit {
  mapPin = 'map-pin'; plus = 'plus'; truck = 'truck';

  private viajesApi = inject(ViajesApi);
  private vehiculosApi = inject(VehiculosApi);
  private flotaApi = inject(FlotaApi);
  private mantenimientoService = inject(MantenimientoService);
  viajes: Viaje[] = []; vehiculos: Vehiculo[] = [];
  desplazamientos: Desplazamiento[] = [];
  cargando = false; error: string | null = null;
  modalAbierto = false; editando = false;
  mostrarReposicion = false;
  calculandoReposicion = false;

  form: any = {
    id_vehiculo: '', origen_nombre: '', origen_lat: 0, origen_lng: 0,
    destino_nombre: '', destino_lat: 0, destino_lng: 0,
    km_inicio: 0, km_fin: 0,
    reposicion_origen_nombre: '', reposicion_origen_lat: 0, reposicion_origen_lng: 0,
    reposicion_distancia_km: 0, reposicion_combustible_L: 0
  };
  filtrarVehiculo: string = 'Todos';
  tabActiva: string = 'viajes';

  busquedaVehiculo = '';
  mostrandoDropdownVehiculo = false;
  mostrarUbicacionInicial = false;

  modoSeleccion: 'origen' | 'destino' | 'ubicacion_inicial' | null = null;

  sugerenciasOrigen: Sugerencia[] = [];
  sugerenciasDestino: Sugerencia[] = [];
  buscandoOrigen = false;
  buscandoDestino = false;
  mostrarSugerenciasOrigen = false;
  mostrarSugerenciasDestino = false;
  private debounceOrigen: any = null;
  private debounceDestino: any = null;

  private mapModal: L.Map | null = null;
  private markerOrigen: L.Marker | null = null;
  private markerDestino: L.Marker | null = null;
  private markerInicial: L.Marker | null = null;
  private polylineRuta: L.Polyline | null = null;
  private polylineReposicion: L.Polyline | null = null;

  private iconOrange = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41]
  });

  private iconRed = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41]
  });

  private iconGray = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41]
  });

  private iconP = L.divIcon({
    className: 'marker-inicial-div',
    html: '<div style="background:#f97316;color:#fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.4)">P</div>',
    iconSize: [30, 30], iconAnchor: [15, 15]
  });

  flotaTelemetry: any[] = [];
  ubicacionCamion: any = null;

  ngOnInit() { this.cargarDatos(); }

  cargarDatos() {
    this.cargando = true; this.error = null;
    this.viajesApi.getViajes().subscribe({
      next: (r) => { this.viajes = r.data || []; this.cargando = false; },
      error: (e) => { this.error = 'Error: ' + e.message; this.cargando = false; }
    });
    this.vehiculosApi.getVehiculos().subscribe({ next: (r) => this.vehiculos = r.data || [] });
    this.flotaApi.getFlota().subscribe({ next: (r) => this.flotaTelemetry = r.data || [] });
    this.viajesApi.getDesplazamientos().subscribe({ next: (r) => this.desplazamientos = r.data || [] });
  }

  get filtrados(): Viaje[] {
    return this.filtrarVehiculo === 'Todos' ? this.viajes : this.viajes.filter(v => v.id_vehiculo === this.filtrarVehiculo);
  }

  get filtradosDesp(): Desplazamiento[] {
    return this.filtrarVehiculo === 'Todos' ? this.desplazamientos : this.desplazamientos.filter(d => d.id_vehiculo === this.filtrarVehiculo);
  }

  get telemetriaDisponible(): boolean { return !!this.ubicacionCamion; }

  get vehiculosDisponibles(): Vehiculo[] { return this.vehiculos.filter(v => v.estado !== 'En ruta'); }

  get vehiculosFiltrados(): Vehiculo[] {
    const q = this.busquedaVehiculo.toLowerCase().trim();
    const d = this.vehiculosDisponibles;
    if (!q) return d.slice(0, 30);
    return d.filter(v => v.id_vehiculo.toLowerCase().includes(q) || v.placa.toLowerCase().includes(q) || (v.marca || '').toLowerCase().includes(q) || (v.modelo || '').toLowerCase().includes(q)).slice(0, 10);
  }

  get vehiculoSeleccionadoText(): string {
    if (!this.form.id_vehiculo) return '';
    const v = this.vehiculos.find(x => x.id_vehiculo === this.form.id_vehiculo);
    const km = v ? Math.round(v.kilometraje_actual || 0).toLocaleString() : '0';
    return v ? `${v.id_vehiculo} - ${v.placa} (${km} km)` : this.form.id_vehiculo;
  }

  get kmRecorridosCalculado(): number { return this.form.km_fin - this.form.km_inicio; }

  // ========== VEHICULO AUTOCOMPLETE ==========

  onBuscarVehiculo() { this.mostrandoDropdownVehiculo = true; if (this.form.id_vehiculo) { this.form.id_vehiculo = ''; } }
  onFocusVehiculo() { if (this.vehiculosFiltrados.length > 0) { this.mostrandoDropdownVehiculo = true; } }
  ocultarDropdownVehiculo() { setTimeout(() => { this.mostrandoDropdownVehiculo = false; }, 200); }

  seleccionarVehiculo(v: Vehiculo) {
    this.form.id_vehiculo = v.id_vehiculo;
    this.busquedaVehiculo = `${v.id_vehiculo} - ${v.placa}`;
    this.mostrandoDropdownVehiculo = false;
    this.onVehiculoChange();
  }

  limpiarVehiculo() {
    this.form.id_vehiculo = ''; this.busquedaVehiculo = '';
    this.mostrandoDropdownVehiculo = false;
    this.ubicacionCamion = null; this.mostrarUbicacionInicial = false;
  }

  // ========== VEHICULO CHANGE ==========

  onVehiculoChange() {
    const v = this.vehiculos.find(x => x.id_vehiculo === this.form.id_vehiculo);
    if (v) { this.form.km_inicio = v.kilometraje_actual; }

    const camionVivo = this.flotaTelemetry.find((x: any) => x.id_camion === this.form.id_vehiculo);

    if (camionVivo && camionVivo.ubicacion) {
      this.ubicacionCamion = { lat: camionVivo.ubicacion.lat, lng: camionVivo.ubicacion.lng, nombre: 'Ubicacion Actual (' + camionVivo.id_camion + ')' };
      this.form.reposicion_origen_lat = camionVivo.ubicacion.lat;
      this.form.reposicion_origen_lng = camionVivo.ubicacion.lng;
      this.form.reposicion_origen_nombre = this.ubicacionCamion.nombre;
      this.form.origen_lat = camionVivo.ubicacion.lat;
      this.form.origen_lng = camionVivo.ubicacion.lng;
      if (!this.form.origen_nombre || this.form.origen_nombre === '' || this.form.origen_nombre.startsWith('Ubicaci') || this.form.origen_nombre.startsWith('Base Central') || this.form.origen_nombre.startsWith('Punto seleccionado')) {
        this.buscarReverseGeocode(camionVivo.ubicacion.lat, camionVivo.ubicacion.lng, 'origen');
      }
      this.actualizarMarcadorOrigen();
      if (this.mapModal) { this.mapModal.setView([this.form.origen_lat, this.form.origen_lng], 14); }
    } else {
      this.ubicacionCamion = null;
      this.form.reposicion_origen_lat = 0;
      this.form.reposicion_origen_lng = 0;
      this.form.reposicion_origen_nombre = '';
      this.form.reposicion_distancia_km = 0;
      this.form.reposicion_combustible_L = 0;
      if (!this.form.origen_nombre || this.form.origen_nombre.startsWith('Ubicaci') || this.form.origen_nombre.startsWith('Base Central') || this.form.origen_nombre.startsWith('Punto seleccionado')) {
        this.form.origen_nombre = '';
      }
      this.form.origen_lat = 0; this.form.origen_lng = 0;
      if (this.markerOrigen && this.mapModal) { this.mapModal.removeLayer(this.markerOrigen); this.markerOrigen = null; }
    }
  }

  seleccionarModoUbicacionInicial() { this.modoSeleccion = 'ubicacion_inicial'; }

  // ========== ORIGEN/DESTINO AUTOCOMPLETE ==========

  onBuscarOrigen() { this.buscarNominatim('origen'); }
  onBuscarDestino() { this.buscarNominatim('destino'); }

  private buscarNominatim(tipo: 'origen' | 'destino') {
    const debounceRef = tipo === 'origen' ? 'debounceOrigen' : 'debounceDestino';
    if ((this as any)[debounceRef]) clearTimeout((this as any)[debounceRef]);
    const query = tipo === 'origen' ? this.form.origen_nombre?.trim() : this.form.destino_nombre?.trim();
    if (!query || query.length < 3) {
      if (tipo === 'origen') { this.sugerenciasOrigen = []; this.mostrarSugerenciasOrigen = false; }
      else { this.sugerenciasDestino = []; this.mostrarSugerenciasDestino = false; }
      return;
    }
    (this as any)[debounceRef] = setTimeout(() => {
      if (tipo === 'origen') this.buscandoOrigen = true; else this.buscandoDestino = true;
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=pe&format=json&limit=5&addressdetails=1`;
      fetch(url).then(res => res.json()).then((data: any[]) => {
        const sugerencias = data.map((r: any) => ({ nombre: r.display_name.split(',')[0], nombreCompleto: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) }));
        if (tipo === 'origen') { this.sugerenciasOrigen = sugerencias; this.mostrarSugerenciasOrigen = sugerencias.length > 0; this.buscandoOrigen = false; }
        else { this.sugerenciasDestino = sugerencias; this.mostrarSugerenciasDestino = sugerencias.length > 0; this.buscandoDestino = false; }
      }).catch(() => {
        if (tipo === 'origen') { this.sugerenciasOrigen = []; this.mostrarSugerenciasOrigen = false; this.buscandoOrigen = false; }
        else { this.sugerenciasDestino = []; this.mostrarSugerenciasDestino = false; this.buscandoDestino = false; }
      });
    }, 500);
  }

  seleccionarSugerenciaOrigen(s: Sugerencia) {
    this.form.origen_nombre = s.nombre; this.form.origen_lat = s.lat; this.form.origen_lng = s.lng;
    this.mostrarSugerenciasOrigen = false; this.sugerenciasOrigen = [];
    this.actualizarMarcadorOrigen();
    if (this.mapModal) { this.mapModal.setView([s.lat, s.lng], 15); }
    this.modoSeleccion = null;
    if (this.ubicacionCamion && this.form.reposicion_origen_lat) { this.calcularReposicion(); }
  }

  seleccionarSugerenciaDestino(s: Sugerencia) {
    this.form.destino_nombre = s.nombre; this.form.destino_lat = s.lat; this.form.destino_lng = s.lng;
    this.mostrarSugerenciasDestino = false; this.sugerenciasDestino = [];
    this.actualizarMarcadorDestino();
    if (this.mapModal) { this.mapModal.setView([s.lat, s.lng], 15); }
    this.modoSeleccion = null;
  }

  ocultarSugerenciasOrigen() { setTimeout(() => { this.mostrarSugerenciasOrigen = false; }, 200); }
  ocultarSugerenciasDestino() { setTimeout(() => { this.mostrarSugerenciasDestino = false; }, 200); }

  onBuscarUbicacionInicial() {
    const query = this.form.reposicion_origen_nombre?.trim();
    if (!query || query.length < 3) return;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=pe&format=json&limit=5`;
    fetch(url).then(res => res.json()).then((data: any[]) => {
      if (data.length > 0) {
        const r = data[0]; const n = r.display_name.split(',')[0];
        this.form.reposicion_origen_lat = parseFloat(r.lat); this.form.reposicion_origen_lng = parseFloat(r.lon);
        this.form.reposicion_origen_nombre = n;
        this.ubicacionCamion = { lat: parseFloat(r.lat), lng: parseFloat(r.lon), nombre: n };
        if (this.mapModal) {
          this.mapModal.setView([parseFloat(r.lat), parseFloat(r.lon)], 15);
          if (this.markerInicial) { this.markerInicial.setLatLng([parseFloat(r.lat), parseFloat(r.lon)]); this.markerInicial.setTooltipContent(n); }
          else {
            this.markerInicial = L.marker([parseFloat(r.lat), parseFloat(r.lon)], { icon: this.iconP }).addTo(this.mapModal).bindTooltip(n, { permanent: true, direction: 'top' });
            this.markerInicial.on('click', () => { this.buscarReverseGeocodeInicial(this.form.reposicion_origen_lat, this.form.reposicion_origen_lng, true); });
          }
        }
        this.modoSeleccion = null;
        this.sincronizarTodo();
        if (this.form.origen_lat) { this.calcularReposicion(); }
      }
    }).catch(() => {});
  }

  // ========== REVERSE GEOCODE ==========

  private buscarReverseGeocode(lat: number, lng: number, tipo: 'origen' | 'destino', forzar: boolean = false) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&countrycodes=pe&zoom=16&addressdetails=1`;
    fetch(url).then(res => res.json()).then((data: any) => {
      if (data && data.display_name) {
        const nombre = data.display_name.split(',').slice(0, 3).join(',').trim();
        if (tipo === 'origen') {
          const guard = !this.form.origen_nombre || this.form.origen_nombre.startsWith('Punto seleccionado') || this.form.origen_nombre.startsWith('Ubicaci') || this.form.origen_nombre.startsWith('Base Central');
          if (forzar || guard) { this.form.origen_nombre = nombre; this.actualizarMarcadorOrigen(); }
        } else {
          const guard = !this.form.destino_nombre || this.form.destino_nombre.startsWith('Punto seleccionado') || this.form.destino_nombre.startsWith('Destino Seleccionado');
          if (forzar || guard) { this.form.destino_nombre = nombre; this.actualizarMarcadorDestino(); }
        }
      }
    }).catch(() => {});
  }

  private buscarReverseGeocodeInicial(lat: number, lng: number, forzar: boolean = false) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&countrycodes=pe&zoom=16&addressdetails=1`;
    fetch(url).then(res => res.json()).then((data: any) => {
      if (data && data.display_name) {
        const nombre = data.display_name.split(',').slice(0, 3).join(',').trim();
        const guard = !this.form.reposicion_origen_nombre || this.form.reposicion_origen_nombre.startsWith('Punto seleccionado');
        if (forzar || guard) {
          this.form.reposicion_origen_nombre = nombre;
          this.ubicacionCamion = { lat, lng, nombre };
          if (this.markerInicial) { this.markerInicial.setTooltipContent(nombre); }
        }
      }
    }).catch(() => {});
  }

  // ========== REPOSICION ==========

  calcularReposicion() {
    if (!this.form.origen_lat || !this.form.origen_lng) { this.form.reposicion_distancia_km = 0; this.form.reposicion_combustible_L = 0; return; }
    if (!this.form.reposicion_origen_lat && !this.ubicacionCamion) { this.form.reposicion_distancia_km = 0; this.form.reposicion_combustible_L = 0; return; }
    const oLat = this.form.reposicion_origen_lat || this.ubicacionCamion?.lat;
    const oLng = this.form.reposicion_origen_lng || this.ubicacionCamion?.lng;
    if (!oLat || !oLng) { this.form.reposicion_distancia_km = 0; this.form.reposicion_combustible_L = 0; return; }
    this.calculandoReposicion = true;
    const url = `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${this.form.origen_lng},${this.form.origen_lat}?overview=false`;
    fetch(url).then(res => res.json()).then((data: any) => {
      if (data.routes && data.routes.length > 0) {
        this.form.reposicion_distancia_km = Math.round(data.routes[0].distance / 1000 * 10) / 10;
        this.form.reposicion_combustible_L = Math.round(this.form.reposicion_distancia_km * 0.35 * 10) / 10;
      } else {
        const d = this.calcularDistanciaDirecta(oLat, oLng, this.form.origen_lat, this.form.origen_lng);
        this.form.reposicion_distancia_km = d; this.form.reposicion_combustible_L = Math.round(d * 0.35 * 10) / 10;
      }
      this.calculandoReposicion = false;
    }).catch(() => {
      const d = this.calcularDistanciaDirecta(oLat, oLng, this.form.origen_lat, this.form.origen_lng);
      this.form.reposicion_distancia_km = d; this.form.reposicion_combustible_L = Math.round(d * 0.35 * 10) / 10;
      this.calculandoReposicion = false;
    });
  }

  private calcularDistanciaDirecta(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 1.3 * 10) / 10;
  }

  // ========== MARCADORES ==========

  private actualizarMarcadorOrigen() {
    if (!this.mapModal || !this.form.origen_lat || !this.form.origen_lng) return;
    if (this.markerOrigen) { this.markerOrigen.setLatLng([this.form.origen_lat, this.form.origen_lng]); this.markerOrigen.setTooltipContent(this.form.origen_nombre || 'Origen'); }
    else {
      this.markerOrigen = L.marker([this.form.origen_lat, this.form.origen_lng], { icon: this.iconOrange }).addTo(this.mapModal).bindTooltip(this.form.origen_nombre || 'Origen', { permanent: true, direction: 'top' });
      this.markerOrigen.on('click', () => { this.buscarReverseGeocode(this.form.origen_lat, this.form.origen_lng, 'origen', true); });
    }
    this.sincronizarTodo();
  }

  private actualizarMarcadorDestino() {
    if (!this.mapModal || !this.form.destino_lat || !this.form.destino_lng) return;
    if (this.markerDestino) { this.markerDestino.setLatLng([this.form.destino_lat, this.form.destino_lng]); this.markerDestino.setTooltipContent(this.form.destino_nombre || 'Destino'); }
    else {
      this.markerDestino = L.marker([this.form.destino_lat, this.form.destino_lng], { icon: this.iconRed }).addTo(this.mapModal!).bindTooltip(this.form.destino_nombre || 'Destino', { permanent: true, direction: 'top' });
      this.markerDestino.on('click', () => { this.buscarReverseGeocode(this.form.destino_lat, this.form.destino_lng, 'destino', true); });
    }
    this.actualizarPolylineRuta();
  }

  private actualizarPolylineRuta() {
    if (this.polylineRuta && this.mapModal) { this.mapModal.removeLayer(this.polylineRuta); this.polylineRuta = null; }
    if (!this.mapModal || !this.form.origen_lat || !this.form.origen_lng || !this.form.destino_lat || !this.form.destino_lng) return;

    const url = `https://router.project-osrm.org/route/v1/driving/${this.form.origen_lng},${this.form.origen_lat};${this.form.destino_lng},${this.form.destino_lat}?overview=full&geometries=geojson`;
    fetch(url)
      .then(res => res.json())
      .then((data: any) => {
        if (this.polylineRuta && this.mapModal) { this.mapModal.removeLayer(this.polylineRuta); this.polylineRuta = null; }
        if (!this.mapModal) return;

        if (data.routes && data.routes.length > 0 && data.routes[0].geometry?.coordinates) {
          const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as L.LatLngTuple);
          this.polylineRuta = L.polyline(coords, { color: '#f97316', weight: 4, opacity: 0.8 }).addTo(this.mapModal);
        } else {
          this.polylineRuta = L.polyline(
            [[this.form.origen_lat, this.form.origen_lng], [this.form.destino_lat, this.form.destino_lng]],
            { color: '#f97316', weight: 4, opacity: 0.8 }
          ).addTo(this.mapModal);
        }
      })
      .catch(() => {
        if (this.polylineRuta && this.mapModal) { this.mapModal.removeLayer(this.polylineRuta); this.polylineRuta = null; }
        if (!this.mapModal) return;
        this.polylineRuta = L.polyline(
          [[this.form.origen_lat, this.form.origen_lng], [this.form.destino_lat, this.form.destino_lng]],
          { color: '#f97316', weight: 4, opacity: 0.8 }
        ).addTo(this.mapModal);
      });
  }

  private actualizarPolylineReposicion() {
    if (this.polylineReposicion && this.mapModal) { this.mapModal.removeLayer(this.polylineReposicion); this.polylineReposicion = null; }
    if (!this.mapModal || !this.form.reposicion_origen_lat || !this.form.reposicion_origen_lng || !this.form.origen_lat || !this.form.origen_lng) return;

    const url = `https://router.project-osrm.org/route/v1/driving/${this.form.reposicion_origen_lng},${this.form.reposicion_origen_lat};${this.form.origen_lng},${this.form.origen_lat}?overview=full&geometries=geojson`;
    fetch(url)
      .then(res => res.json())
      .then((data: any) => {
        if (this.polylineReposicion && this.mapModal) { this.mapModal.removeLayer(this.polylineReposicion); this.polylineReposicion = null; }
        if (!this.mapModal) return;

        if (data.routes && data.routes.length > 0 && data.routes[0].geometry?.coordinates) {
          const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as L.LatLngTuple);
          this.polylineReposicion = L.polyline(coords, { color: '#ef4444', weight: 4, opacity: 0.8, dashArray: '8 4' }).addTo(this.mapModal);
        } else {
          this.polylineReposicion = L.polyline(
            [[this.form.reposicion_origen_lat, this.form.reposicion_origen_lng], [this.form.origen_lat, this.form.origen_lng]],
            { color: '#ef4444', weight: 4, opacity: 0.8, dashArray: '8 4' }
          ).addTo(this.mapModal);
        }
      })
      .catch(() => {
        if (this.polylineReposicion && this.mapModal) { this.mapModal.removeLayer(this.polylineReposicion); this.polylineReposicion = null; }
        if (!this.mapModal) return;
        this.polylineReposicion = L.polyline(
          [[this.form.reposicion_origen_lat, this.form.reposicion_origen_lng], [this.form.origen_lat, this.form.origen_lng]],
          { color: '#ef4444', weight: 4, opacity: 0.8, dashArray: '8 4' }
        ).addTo(this.mapModal);
      });
  }

  private sincronizarReposicion() {
    const same = this.form.reposicion_origen_lat && this.form.origen_lat &&
      Math.abs(this.form.reposicion_origen_lat - this.form.origen_lat) < 0.0001 &&
      Math.abs(this.form.reposicion_origen_lng - this.form.origen_lng) < 0.0001;
    if (same) {
      if (this.markerInicial && this.mapModal) { this.mapModal.removeLayer(this.markerInicial); this.markerInicial = null; }
      if (this.polylineReposicion && this.mapModal) { this.mapModal.removeLayer(this.polylineReposicion); this.polylineReposicion = null; }
    } else {
      this.actualizarPolylineReposicion();
    }
  }

  private sincronizarTodo() {
    this.actualizarPolylineRuta();
    this.sincronizarReposicion();
  }

  // ========== MODAL ==========

  abrirNuevo() {
    this.editando = false; this.mostrarReposicion = false; this.ubicacionCamion = null;
    this.sugerenciasOrigen = []; this.sugerenciasDestino = [];
    this.mostrarSugerenciasOrigen = false; this.mostrarSugerenciasDestino = false;
    this.busquedaVehiculo = ''; this.mostrandoDropdownVehiculo = false;
    this.mostrarUbicacionInicial = false;
    this.form = {
      id_vehiculo: '', origen_nombre: '', origen_lat: 0, origen_lng: 0,
      destino_nombre: '', destino_lat: 0, destino_lng: 0,
      km_inicio: 0, km_fin: 0,
      reposicion_origen_nombre: '', reposicion_origen_lat: 0, reposicion_origen_lng: 0,
      reposicion_distancia_km: 0, reposicion_combustible_L: 0
    };
    this.modoSeleccion = null;
    this.modalAbierto = true;
    setTimeout(() => this.iniciarMapaModal(), 300);
  }

  iniciarMapaModal() {
    const mapEl = document.getElementById('mapa-modal-viaje');
    if (!mapEl) return;
    if (this.mapModal) { this.mapModal.remove(); this.markerOrigen = null; this.markerDestino = null; this.markerInicial = null; this.polylineRuta = null; this.polylineReposicion = null; }
    this.mapModal = L.map('mapa-modal-viaje').setView([-8.1159, -79.0299], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.mapModal);
    this.mapModal.on('click', (e: any) => {
      const lat = parseFloat(e.latlng.lat.toFixed(5));
      const lng = parseFloat(e.latlng.lng.toFixed(5));
      if (this.modoSeleccion === 'origen') {
        this.form.origen_lat = lat; this.form.origen_lng = lng;
        if (this.markerOrigen) { this.markerOrigen.setLatLng([lat, lng]); this.markerOrigen.setTooltipContent(this.form.origen_nombre || 'Origen'); }
        else {
          this.markerOrigen = L.marker([lat, lng], { icon: this.iconOrange }).addTo(this.mapModal!).bindTooltip(this.form.origen_nombre || 'Origen', { permanent: true, direction: 'top' });
          this.markerOrigen.on('click', () => { this.buscarReverseGeocode(this.form.origen_lat, this.form.origen_lng, 'origen', true); });
        }
        this.buscarReverseGeocode(lat, lng, 'origen', true);
        this.sincronizarTodo();
        if (this.ubicacionCamion && this.form.reposicion_origen_lat) { this.calcularReposicion(); }
      } else if (this.modoSeleccion === 'destino') {
        this.form.destino_lat = lat; this.form.destino_lng = lng;
        if (this.markerDestino) { this.markerDestino.setLatLng([lat, lng]); this.markerDestino.setTooltipContent(this.form.destino_nombre || 'Destino'); }
        else {
          this.markerDestino = L.marker([lat, lng], { icon: this.iconRed }).addTo(this.mapModal!).bindTooltip(this.form.destino_nombre || 'Destino', { permanent: true, direction: 'top' });
          this.markerDestino.on('click', () => { this.buscarReverseGeocode(this.form.destino_lat, this.form.destino_lng, 'destino', true); });
        }
        this.buscarReverseGeocode(lat, lng, 'destino', true);
      } else if (this.modoSeleccion === 'ubicacion_inicial') {
        this.form.reposicion_origen_lat = lat; this.form.reposicion_origen_lng = lng;
        if (!this.form.reposicion_origen_nombre || this.form.reposicion_origen_nombre.startsWith('Punto seleccionado')) { this.form.reposicion_origen_nombre = 'Punto seleccionado'; }
        this.ubicacionCamion = { lat, lng, nombre: this.form.reposicion_origen_nombre || 'Ubicacion inicial' };
        if (this.markerInicial) { this.markerInicial.setLatLng([lat, lng]); this.markerInicial.setTooltipContent(this.form.reposicion_origen_nombre || 'Ubicacion inicial'); }
        else {
          this.markerInicial = L.marker([lat, lng], { icon: this.iconP }).addTo(this.mapModal!).bindTooltip(this.form.reposicion_origen_nombre || 'Ubicacion inicial', { permanent: true, direction: 'top' });
          this.markerInicial.on('click', () => { this.buscarReverseGeocodeInicial(this.form.reposicion_origen_lat, this.form.reposicion_origen_lng, true); });
        }
        this.buscarReverseGeocodeInicial(lat, lng, true);
        this.sincronizarTodo();
        if (this.form.origen_lat) { this.calcularReposicion(); }
      }
    });
  }

  seleccionarModo(modo: 'origen' | 'destino' | 'ubicacion_inicial') { this.modoSeleccion = modo; }

  cerrarModal() {
    this.modalAbierto = false;
    this.mostrarSugerenciasOrigen = false; this.mostrarSugerenciasDestino = false;
    this.mostrandoDropdownVehiculo = false; this.mostrarUbicacionInicial = false;
    this.markerInicial = null;
    if (this.polylineRuta && this.mapModal) { this.mapModal.removeLayer(this.polylineRuta); this.polylineRuta = null; }
    if (this.polylineReposicion && this.mapModal) { this.mapModal.removeLayer(this.polylineReposicion); this.polylineReposicion = null; }
    if (this.mapModal) { this.mapModal.remove(); this.mapModal = null; }
  }

  guardar() {
    if (!this.form.id_vehiculo || !this.form.origen_nombre?.trim() || !this.form.destino_nombre?.trim()) { alert('Completa el vehiculo, nombre de origen y nombre de destino.'); return; }
    if (!this.form.origen_lat || !this.form.destino_lat) { alert('Selecciona el Origen y el Destino en el mapa o escribe un nombre y selecciona una sugerencia.'); return; }
    const vehiculo = this.vehiculos.find(v => v.id_vehiculo === this.form.id_vehiculo);
    if (vehiculo?.estado === 'En ruta') { alert('El vehiculo ya se encuentra en ruta. Finalice el viaje actual primero.'); return; }

    if (this.form.km_fin > 0) {
      this.cargando = true;
      const kmRecorridos = this.form.km_fin - this.form.km_inicio;
      this.viajesApi.finalizarViaje({ id_vehiculo: this.form.id_vehiculo, km_fin: this.form.km_fin }).subscribe({
        next: async () => {
          try {
            await this.mantenimientoService.registrarDesgasteYVerificarAlertas(this.form.id_vehiculo, kmRecorridos);
          } catch (err) {
            console.error('Error al registrar desgaste preventivo en Firestore:', err);
          }
          this.cargarDatos();
          this.cerrarModal();
        },
        error: (e) => { alert('Error: ' + e.message); this.cargando = false; }
      });
    } else {
      this.cargando = true;
      const data: any = {
        id_vehiculo: this.form.id_vehiculo, origen_nombre: this.form.origen_nombre,
        origen_lat: this.form.origen_lat, origen_lng: this.form.origen_lng,
        destino_nombre: this.form.destino_nombre, destino_lat: this.form.destino_lat, destino_lng: this.form.destino_lng,
        km_inicio: this.form.km_inicio
      };
      if (this.form.reposicion_distancia_km > 0 && this.form.reposicion_origen_lat) {
        data.reposicion_origen_nombre = this.form.reposicion_origen_nombre;
        data.reposicion_origen_lat = this.form.reposicion_origen_lat;
        data.reposicion_origen_lng = this.form.reposicion_origen_lng;
        data.reposicion_distancia_km = this.form.reposicion_distancia_km;
      }
      if (!this.telemetriaDisponible && this.form.reposicion_origen_lat) {
        data.ubicacion_inicial_lat = this.form.reposicion_origen_lat;
        data.ubicacion_inicial_lng = this.form.reposicion_origen_lng;
        data.ubicacion_inicial_nombre = this.form.reposicion_origen_nombre;
      }
      this.viajesApi.iniciarViaje(data).subscribe({
        next: () => { this.cargarDatos(); this.cerrarModal(); },
        error: (e) => {
          const detalle = e.error?.detail || e.message || 'Error desconocido';
          console.error('[ViajesComponent.guardar] Error al iniciar viaje:', detalle, e);
          alert('Error al iniciar viaje: ' + detalle);
          this.cargando = false;
        }
      });
    }
  }
}