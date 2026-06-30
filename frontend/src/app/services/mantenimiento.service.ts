import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { initializeApp, getApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  updateDoc,
  addDoc
} from 'firebase/firestore';
import { Observable, interval, of } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Componente {
  kilometraje_reparacion: number;
  tiempo_vida: number;
  km_desde_reparacion?: number;
  ultima_reparacion?: string;
  proxima_reparacion?: string;
}

export interface AlertaMantenimiento {
  id?: string;
  id_vehiculo: string;
  componente: string;
  tipo_alerta: 'Revision' | 'Reemplazo';
  estado: 'Pendiente' | 'Resuelta';
  prioridad: 'Alta' | 'Critica';
  mensaje: string;
  fecha_creacion: string;
  fecha_resolucion?: string;
  km_desde_reparacion: number;
  tiempo_vida: number;
  kilometraje_reparacion?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MantenimientoService {
  private http = inject(HttpClient);
  private app = getApps().length === 0 ? initializeApp(environment.firebase) : getApp();
  private db = getFirestore(this.app);
  private readonly apiUrl = environment.apiUrl;
  private readonly POLL_INTERVAL_MS = 20000;

  // Reemplaza onSnapshot por polling al backend (evita errores de permisos de Firestore)
  getAlertasActivasRealtime(): Observable<AlertaMantenimiento[]> {
    return interval(this.POLL_INTERVAL_MS).pipe(
      startWith(0),
      switchMap(() =>
        this.http.get<any>(`${this.apiUrl}/api/alertas?estado=Pendiente`).pipe(
          catchError(err => {
            console.error('[MantenimientoService.getAlertasActivasRealtime] Error al cargar alertas:', err);
            return of({ data: [] });
          })
        )
      ),
      map(r => this._normalizarAlertas(r.data || []))
    );
  }

  getAlertasVehiculoRealtime(idVehiculo: string): Observable<AlertaMantenimiento[]> {
    return interval(this.POLL_INTERVAL_MS).pipe(
      startWith(0),
      switchMap(() =>
        this.http.get<any>(`${this.apiUrl}/api/alertas?estado=Pendiente`).pipe(
          catchError(err => {
            console.error('[MantenimientoService.getAlertasVehiculoRealtime] Error al cargar alertas:', err);
            return of({ data: [] });
          })
        )
      ),
      map(r => this._normalizarAlertas((r.data || []).filter((a: any) => a.id_vehiculo === idVehiculo)))
    );
  }

  private _normalizarAlertas(raw: any[]): AlertaMantenimiento[] {
    return raw
      .filter((a: any) => a.tipo_alerta === 'Revision' || a.tipo_alerta === 'Reemplazo')
      .map((a: any) => ({
        ...a,
        km_desde_reparacion: a.km_desde_reparacion ?? a.kilometraje_acumulado ?? 0,
        kilometraje_reparacion: a.kilometraje_reparacion ?? a.limite_revision ?? 0
      } as AlertaMantenimiento));
  }

  async registrarDesgasteYVerificarAlertas(idVehiculo: string, kmRecorridos: number): Promise<void> {
    if (kmRecorridos <= 0) return;
    try {
      const { getDocs } = await import('firebase/firestore');
      const compColRef = collection(this.db, 'vehiculos', idVehiculo, 'componentes');
      const snapshot = await getDocs(compColRef);

      for (const compDoc of snapshot.docs) {
        const nombre = compDoc.id;
        const data = compDoc.data() as Componente;

        const umbralAlerta = data.kilometraje_reparacion || 0;
        const kmDesdeReparacion = Number(((data.km_desde_reparacion || 0) + kmRecorridos).toFixed(2));
        const nuevoTiempoVida = Number(Math.max(0, (data.tiempo_vida || 0) - kmRecorridos).toFixed(2));

        const compDocRef = doc(this.db, 'vehiculos', idVehiculo, 'componentes', nombre);
        try {
          await updateDoc(compDocRef, {
            km_desde_reparacion: kmDesdeReparacion,
            tiempo_vida: nuevoTiempoVida
          });
        } catch (writeErr) {
          console.error(`[MantenimientoService] Error actualizando componente ${nombre}:`, writeErr);
          continue;
        }

        if (umbralAlerta > 0 && kmDesdeReparacion >= umbralAlerta) {
          await this._crearAlerta(idVehiculo, nombre, 'Revision', kmDesdeReparacion, nuevoTiempoVida, umbralAlerta);
        }
        if (nuevoTiempoVida <= 0) {
          await this._crearAlerta(idVehiculo, nombre, 'Reemplazo', kmDesdeReparacion, nuevoTiempoVida, umbralAlerta);
        }
      }
    } catch (error) {
      console.error('[MantenimientoService.registrarDesgasteYVerificarAlertas] Error:', error);
      throw error;
    }
  }

  private async _crearAlerta(
    idVehiculo: string, componente: string, tipo: 'Revision' | 'Reemplazo',
    kmDesdeReparacion: number, tiempoVida: number, umbralAlerta: number
  ): Promise<void> {
    try {
      const { getDocs, query, where } = await import('firebase/firestore');
      const alertsColRef = collection(this.db, 'alertas');
      const q = query(alertsColRef,
        where('id_vehiculo', '==', idVehiculo),
        where('componente', '==', componente),
        where('tipo_alerta', '==', tipo),
        where('estado', '==', 'Pendiente')
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) return;

      const msg = tipo === 'Reemplazo'
        ? `⚠️ Cambio obligatorio: Componente "${componente}" del vehículo ${idVehiculo} ha agotado su vida util (tiempo restante: ${tiempoVida.toFixed(1)} km).`
        : `🔧 Revision preventiva: Componente "${componente}" del vehículo ${idVehiculo} alcanzó el umbral de alerta (${kmDesdeReparacion.toFixed(1)} / ${umbralAlerta} km desde ultima reparacion). Vida restante: ${tiempoVida.toFixed(1)} km.`;

      await addDoc(alertsColRef, {
        id_vehiculo: idVehiculo,
        componente,
        tipo_alerta: tipo,
        estado: 'Pendiente',
        prioridad: tipo === 'Reemplazo' ? 'Critica' : 'Alta',
        mensaje: msg,
        fecha_creacion: new Date().toISOString(),
        km_desde_reparacion: Number(kmDesdeReparacion.toFixed(2)),
        tiempo_vida: tiempoVida,
        kilometraje_reparacion: umbralAlerta
      });
    } catch (error) {
      console.error('[MantenimientoService._crearAlerta] Error:', error);
    }
  }

  async marcarComoRevisado(alertaId: string, idVehiculo: string, nombreComponente: string): Promise<void> {
    try {
      await updateDoc(doc(this.db, 'vehiculos', idVehiculo, 'componentes', nombreComponente), {
        km_desde_reparacion: 0
      });
      await updateDoc(doc(this.db, 'alertas', alertaId), {
        estado: 'Resuelta',
        fecha_resolucion: new Date().toISOString()
      });
    } catch (error) {
      console.error('[MantenimientoService.marcarComoRevisado] Error:', error);
      throw error;
    }
  }

  async marcarComoReemplazado(alertaId: string, idVehiculo: string, nombreComponente: string): Promise<void> {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await updateDoc(doc(this.db, 'vehiculos', idVehiculo, 'componentes', nombreComponente), {
        km_desde_reparacion: 0,
        ultima_reparacion: todayStr
      });
      await updateDoc(doc(this.db, 'alertas', alertaId), {
        estado: 'Resuelta',
        fecha_resolucion: new Date().toISOString()
      });
    } catch (error) {
      console.error('[MantenimientoService.marcarComoReemplazado] Error:', error);
      throw error;
    }
  }
}
