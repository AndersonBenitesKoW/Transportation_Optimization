import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Viaje, Vehiculo } from '../../../services/api.service';
import { IconComponent } from '../../../components/icon.component';
import * as L from 'leaflet';

@Component({
  selector: 'app-viajes',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './viajes.html',
  styleUrl: './viajes.css'
})
export class ViajesComponent implements OnInit {
  mapPin = 'map-pin'; plus = 'plus';

  private apiService = inject(ApiService);
  viajes: Viaje[] = []; vehiculos: Vehiculo[] = [];
  cargando = false; error: string | null = null;
  modalAbierto = false; editando = false;

  form: any = {
    id_vehiculo: '', origen_nombre: '', origen_lat: 0, origen_lng: 0,
    destino_nombre: '', destino_lat: 0, destino_lng: 0,
    km_inicio: 0, km_fin: 0
  };
  filtrarVehiculo: string = 'Todos';

  // --- VARIABLES PARA EL MAPA ---
  private mapModal: L.Map | null = null;
  private markerOrigen: L.Marker | null = null;
  private markerDestino: L.Marker | null = null;
  modoSeleccion: 'origen' | 'destino' | null = null;

  private iconBlue = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41]
  });

  private iconRed = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41]
  });

  ngOnInit() { this.cargarDatos(); }

  flotaTelemetry: any[] = [];

  cargarDatos() {
  this.cargando = true; this.error = null;
  this.apiService.getViajes().subscribe({
    next: (r) => { this.viajes = r.data || []; this.cargando = false; },
    error: (e) => { this.error = 'Error: ' + e.message; this.cargando = false; }
  });
  this.apiService.getVehiculos().subscribe({
    next: (r) => this.vehiculos = r.data || []
  });
  
  // CARGAR TELEMETRÍA EN VIVO PARA CONOCER LAS UBICACIONES ACTUALES
  this.apiService.getFlota().subscribe({
    next: (r) => this.flotaTelemetry = r.data || []
  });
}

  get filtrados(): Viaje[] {
    return this.filtrarVehiculo === 'Todos'
      ? this.viajes
      : this.viajes.filter(v => v.id_vehiculo === this.filtrarVehiculo);
  }

  onVehiculoChange() {
  const v = this.vehiculos.find(x => x.id_vehiculo === this.form.id_vehiculo);
  if (v) { this.form.km_inicio = v.kilometraje_actual; }

  // 1. BUSCAR LA UBICACIÓN ACTUAL EN LA TELEMETRÍA EN VIVO
  const camionVivo = this.flotaTelemetry.find(x => x.id_camion === this.form.id_vehiculo);

  if (camionVivo && camionVivo.ubicacion) {
    // Si el camión ya se está moviendo o terminó un viaje en el mapa
    this.form.origen_lat = camionVivo.ubicacion.lat;
    this.form.origen_lng = camionVivo.ubicacion.lng;
    this.form.origen_nombre = 'Ubicación Actual (Telemetría)';
  } else {
    this.form.origen_lat = -8.1159; 
    this.form.origen_lng = -79.0299;
    this.form.origen_nombre = 'Base Central (Origen por Defecto)';
  }

  // 2. DIBUJAR EL MARCADOR DE ORIGEN AUTOMÁTICAMENTE SI EL MAPA YA CARGÓ
  if (this.mapModal) {
    if (this.markerOrigen) {
      this.markerOrigen.setLatLng([this.form.origen_lat, this.form.origen_lng]);
    } else {
      this.markerOrigen = L.marker([this.form.origen_lat, this.form.origen_lng], { icon: this.iconBlue })
        .addTo(this.mapModal)
        .bindTooltip('Origen Automático', { permanent: true, direction: 'top' });
    }
    // Enfocamos el mapa en el origen para que el admin vea dónde está el camión parado
    this.mapModal.setView([this.form.origen_lat, this.form.origen_lng], 14);
  }

  // 3. PASAR EL MODO AUTOMÁTICAMENTE A DESTINO
  // Así el administrador solo tiene que abrir el modal, elegir el camión y hacer un clic en el destino
  this.modoSeleccion = 'destino';
}

  get kmRecorridosCalculado(): number {
    return this.form.km_fin - this.form.km_inicio;
  }

  abrirNuevo() {
  this.editando = false;
  this.form = {
    id_vehiculo: '', origen_nombre: '', origen_lat: 0, origen_lng: 0,
    destino_nombre: '', destino_lat: 0, destino_lng: 0,
    km_inicio: 0, km_fin: 0
  };
  this.modalAbierto = true;
  this.modoSeleccion = null; // No seleccionamos nada hasta que elija el camión
  setTimeout(() => this.iniciarMapaModal(), 300);
}

  iniciarMapaModal() {
    const mapEl = document.getElementById('mapa-modal-viaje');
    if (!mapEl) return;
    
    if (this.mapModal) {
      this.mapModal.remove();
      this.markerOrigen = null;
      this.markerDestino = null;
    }

    this.mapModal = L.map('mapa-modal-viaje').setView([-8.1159, -79.0299], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.mapModal);

    this.mapModal.on('click', (e: any) => {
      const lat = parseFloat(e.latlng.lat.toFixed(5));
      const lng = parseFloat(e.latlng.lng.toFixed(5));

      if (this.modoSeleccion === 'origen') {
        this.form.origen_lat = lat;
        this.form.origen_lng = lng;
        this.form.origen_nombre = `Ubicación Seleccionada`;
        
        if (this.markerOrigen) { this.markerOrigen.setLatLng([lat, lng]); }
        else { this.markerOrigen = L.marker([lat, lng], { icon: this.iconBlue }).addTo(this.mapModal!).bindTooltip('Origen', {permanent: true, direction: 'top'}); }
        
        this.modoSeleccion = 'destino';
      } 
      else if (this.modoSeleccion === 'destino') {
        this.form.destino_lat = lat;
        this.form.destino_lng = lng;
        this.form.destino_nombre = `Destino Seleccionado`;
        
        if (this.markerDestino) { this.markerDestino.setLatLng([lat, lng]); }
        else { this.markerDestino = L.marker([lat, lng], { icon: this.iconRed }).addTo(this.mapModal!).bindTooltip('Destino', {permanent: true, direction: 'top'}); }
        
        this.modoSeleccion = null;
      }
    });
  }

  seleccionarModo(modo: 'origen' | 'destino') {
    this.modoSeleccion = modo;
  }

  cerrarModal() { 
    this.modalAbierto = false; 
    if (this.mapModal) { this.mapModal.remove(); this.mapModal = null; }
  }

  guardar() {
    if (!this.form.id_vehiculo || !this.form.origen_lat || !this.form.destino_lat) {
      alert('⚠️ Selecciona el vehículo y marca en el mapa el Origen y el Destino.'); 
      return;
    }

    if (this.form.km_fin > 0) {
      this.cargando = true;
      this.apiService.finalizarViaje({
        id_vehiculo: this.form.id_vehiculo,
        km_fin: this.form.km_fin
      }).subscribe({
        next: () => { this.cargarDatos(); this.cerrarModal(); },
        error: (e) => { alert('Error: ' + e.message); this.cargando = false; }
      });
    } else {
      this.cargando = true;
      this.apiService.iniciarViaje({
        id_vehiculo: this.form.id_vehiculo,
        origen_nombre: this.form.origen_nombre,
        origen_lat: this.form.origen_lat,
        origen_lng: this.form.origen_lng,
        destino_nombre: this.form.destino_nombre,
        destino_lat: this.form.destino_lat,
        destino_lng: this.form.destino_lng,
        km_inicio: this.form.km_inicio
      }).subscribe({
        next: () => { this.cargarDatos(); this.cerrarModal(); },
        error: (e) => { alert('Error del Servidor: ' + e.message); this.cargando = false; }
      });
    }
  }
}