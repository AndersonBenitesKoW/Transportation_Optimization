import { Component, OnInit, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FlotaService } from '../../services/flota';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';
import 'leaflet-routing-machine';

@Component({
  selector: 'app-conductor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conductor.html'
})
export class ConductorComponent implements OnInit, AfterViewInit {
  usuarioActual: any = null;
  miCamion: any = null;
  chatAbierto: boolean = false;

  private http = inject(HttpClient);
  mensajeNuevo: string = '';
  historial: { texto: string, soyYo: boolean }[] = [];
  cargandoIA: boolean = false;
  
  private flotaService = inject(FlotaService);
  private router = inject(Router);
  
  private map!: L.Map;
  private marker!: L.Marker;
  private routeControl: any; // Volvemos a usar el control inteligente

  private customIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
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
    setInterval(() => this.obtenerDatosFlota(), 5000);
  }

  ngAfterViewInit() {
    this.iniciarMapa();
  }

  cerrarSesion() {
    localStorage.removeItem('fleetmind_user');
    this.router.navigate(['/login']);
  }

  toggleChat() {
    this.chatAbierto = !this.chatAbierto;
  }

  iniciarMapa() {
    const el = document.getElementById('mapa-conductor');
    if (el) {
      this.map = L.map('mapa-conductor').setView([-8.1159, -79.0299], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);
    }
  }

  obtenerDatosFlota() {
    this.flotaService.getFlota().subscribe({
      next: (res) => {
        const datos = res.data.find((c: any) => c.id_camion === this.usuarioActual.ref);
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
      error: (err) => console.error(err)
    });
  }

  actualizarMapaConductor() {
    if (!this.map || !this.miCamion) return;

    const posActual = L.latLng(this.miCamion.ubicacion.lat, this.miCamion.ubicacion.lng);
    // El backend de la IA le dirá a Angular cuál es el nuevo destino
    const posDestino = L.latLng(this.miCamion.destino.lat, this.miCamion.destino.lng);

    if (this.marker) {
      this.marker.setLatLng(posActual);
    } else {
      this.marker = L.marker(posActual, { icon: this.customIcon }).addTo(this.map);
      this.marker.bindTooltip(`Mi Ubicación`, { permanent: true, direction: 'top', offset: [0, -30] });
      this.map.setView(posActual, 14); 
    }

    // --- MAGIA DEL RUTEO DINÁMICO ---
    if (this.routeControl) {
      // Si el camión se mueve o cambia el destino, actualizamos los puntos del enrutador
      this.routeControl.setWaypoints([posActual, posDestino]);
    } else {
      // Creamos el enrutador por primera vez
      const planSinMarcadores = L.Routing.plan([posActual, posDestino], { createMarker: () => null as any });
      this.routeControl = L.Routing.control({
        plan: planSinMarcadores, 
        show: false, 
        addWaypoints: false, 
        fitSelectedRoutes: false, 
        routeWhileDragging: false,
        lineOptions: { styles: [{ color: '#3498db', opacity: 0.8, weight: 6 }], extendToWaypoints: true, missingRouteTolerance: 0 }
      }).addTo(this.map);
    }
  }

  enviarConsulta() {
    if (!this.mensajeNuevo.trim() || this.cargandoIA) return;

    const pregunta = this.mensajeNuevo;
    this.historial.push({ texto: pregunta, soyYo: true });
    this.mensajeNuevo = '';
    this.cargandoIA = true;

    const payload = {
      mensaje: pregunta,
      rol: this.usuarioActual.rol,
      referencia: this.usuarioActual.ref
    };

    this.http.post<any>('http://127.0.0.1:8000/api/chat', payload).subscribe({
      next: (res) => {
        const textoLimpio = res.respuesta.replaceAll('**', '').replaceAll('*', '');
        this.historial.push({ texto: textoLimpio, soyYo: false });
        this.cargandoIA = false;
      },
      error: (err) => {
        console.error(err);
        this.historial.push({ texto: "Hubo un error al conectar con la central.", soyYo: false });
        this.cargandoIA = false;
      }
    });
  }
}