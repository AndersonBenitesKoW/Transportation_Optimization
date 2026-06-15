import { Injectable } from '@angular/core';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  updateDoc, 
  query, 
  where, 
  onSnapshot, 
  getDocs, 
  addDoc 
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Componente {
  kilometraje_acumulado: number;
  tiempo_vida: number;
  ultima_reparacion?: string;
  proxima_reparacion?: string;
  limite_revision?: number;
  kilometraje_desde_revision?: number;
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
  kilometraje_acumulado: number;
  tiempo_vida: number;
  limite_revision?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MantenimientoService {
  private app = getApps().length === 0 ? initializeApp(environment.firebase) : getApp();
  private db = getFirestore(this.app);

  /**
   * Actualiza el kilometraje de los componentes de un vehículo tras finalizar un viaje
   * y evalúa las condiciones de las alertas preventivas y de cambio de pieza.
   */
  async registrarDesgasteYVerificarAlertas(idVehiculo: string, kmRecorridos: number): Promise<void> {
    if (kmRecorridos <= 0) return;

    try {
      const compColRef = collection(this.db, 'vehiculos', idVehiculo, 'componentes');
      const snapshot = await getDocs(compColRef);

      for (const compDoc of snapshot.docs) {
        const nombre = compDoc.id;
        const data = compDoc.data() as Componente;

        const kmAcumulado = (data.kilometraje_acumulado || 0) + kmRecorridos;
        const kmDesdeRevision = (data.kilometraje_desde_revision || 0) + kmRecorridos;
        const tiempoVida = data.tiempo_vida || 0;
        // Si limite_revision no está configurado, por defecto se usa 2.0 km (como en el ejemplo)
        const limiteRevision = data.limite_revision !== undefined ? data.limite_revision : 2.0;

        // 1. Actualizar el documento del componente en Firestore
        const compDocRef = doc(this.db, 'vehiculos', idVehiculo, 'componentes', nombre);
        await updateDoc(compDocRef, {
          kilometraje_acumulado: Number(kmAcumulado.toFixed(2)),
          kilometraje_desde_revision: Number(kmDesdeRevision.toFixed(2))
        });

        // 2. Evaluar Alerta 1: Revisión Preventiva (Frecuente)
        if (limiteRevision > 0 && kmDesdeRevision >= limiteRevision) {
          await this.crearAlertaSiNoExiste(idVehiculo, nombre, 'Revision', kmAcumulado, tiempoVida, limiteRevision);
        }

        // 3. Evaluar Alerta 2: Cambio de Pieza (Fin de Vida Útil)
        if (tiempoVida > 0 && kmAcumulado >= tiempoVida) {
          await this.crearAlertaSiNoExiste(idVehiculo, nombre, 'Reemplazo', kmAcumulado, tiempoVida, limiteRevision);
        }
      }
    } catch (error) {
      console.error('Error en registrarDesgasteYVerificarAlertas:', error);
      throw error;
    }
  }

  /**
   * Crea una alerta en Firestore si no existe una alerta pendiente idéntica.
   */
  private async crearAlertaSiNoExiste(
    idVehiculo: string,
    componente: string,
    tipo: 'Revision' | 'Reemplazo',
    kmAcumulado: number,
    tiempoVida: number,
    limiteRevision: number
  ): Promise<void> {
    try {
      const alertsColRef = collection(this.db, 'alertas');
      const q = query(
        alertsColRef,
        where('id_vehiculo', '==', idVehiculo),
        where('componente', '==', componente),
        where('tipo_alerta', '==', tipo),
        where('estado', '==', 'Pendiente')
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        const msg = tipo === 'Reemplazo'
          ? `⚠️ Cambio obligatorio: Componente "${componente}" del vehículo ${idVehiculo} ha superado su vida útil (${kmAcumulado.toFixed(1)} / ${tiempoVida} km).`
          : `🔧 Revisión preventiva: Componente "${componente}" del vehículo ${idVehiculo} requiere inspección (${kmAcumulado.toFixed(1)} km totales).`;
          
        const priority = tipo === 'Reemplazo' ? 'Critica' : 'Alta';

        await addDoc(alertsColRef, {
          id_vehiculo: idVehiculo,
          componente: componente,
          tipo_alerta: tipo,
          estado: 'Pendiente',
          prioridad: priority,
          mensaje: msg,
          fecha_creacion: new Date().toISOString(),
          kilometraje_acumulado: Number(kmAcumulado.toFixed(2)),
          tiempo_vida: tiempoVida,
          limite_revision: limiteRevision
        });
      }
    } catch (error) {
      console.error('Error en crearAlertaSiNoExiste:', error);
    }
  }

  /**
   * Escucha todas las alertas activas (Pendientes) en tiempo real para el Administrador
   */
  getAlertasActivasRealtime(): Observable<AlertaMantenimiento[]> {
    return new Observable<AlertaMantenimiento[]>(subscriber => {
      const q = query(
        collection(this.db, 'alertas'),
        where('estado', '==', 'Pendiente')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: AlertaMantenimiento[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as AlertaMantenimiento);
        });
        // Ordenar: primero críticas (Reemplazo), luego altas (Revisión)
        list.sort((a, b) => {
          if (a.prioridad === 'Critica' && b.prioridad !== 'Critica') return -1;
          if (a.prioridad !== 'Critica' && b.prioridad === 'Critica') return 1;
          return new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime();
        });
        subscriber.next(list);
      }, (err) => {
        console.error('Error en onSnapshot getAlertasActivasRealtime:', err);
        subscriber.error(err);
      });

      return () => unsubscribe();
    });
  }

  /**
   * Escucha las alertas activas de un vehículo en tiempo real para el Chofer
   */
  getAlertasVehiculoRealtime(idVehiculo: string): Observable<AlertaMantenimiento[]> {
    return new Observable<AlertaMantenimiento[]>(subscriber => {
      const q = query(
        collection(this.db, 'alertas'),
        where('id_vehiculo', '==', idVehiculo),
        where('estado', '==', 'Pendiente')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: AlertaMantenimiento[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as AlertaMantenimiento);
        });
        subscriber.next(list);
      }, (err) => {
        console.error('Error en onSnapshot getAlertasVehiculoRealtime:', err);
        subscriber.error(err);
      });

      return () => unsubscribe();
    });
  }

  /**
   * Resetea el contador de la revisión preventiva y marca la alerta como resuelta
   */
  async marcarComoRevisado(alertaId: string, idVehiculo: string, nombreComponente: string): Promise<void> {
    try {
      const compDocRef = doc(this.db, 'vehiculos', idVehiculo, 'componentes', nombreComponente);
      await updateDoc(compDocRef, {
        kilometraje_desde_revision: 0
      });

      const alertDocRef = doc(this.db, 'alertas', alertaId);
      await updateDoc(alertDocRef, {
        estado: 'Resuelta',
        fecha_resolucion: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error en marcarComoRevisado:', error);
      throw error;
    }
  }

  /**
   * Resetea la vida útil de la pieza (acumulado = 0, revisión = 0), actualiza la fecha de reparación
   * y marca la alerta como resuelta.
   */
  async marcarComoReemplazado(alertaId: string, idVehiculo: string, nombreComponente: string): Promise<void> {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const compDocRef = doc(this.db, 'vehiculos', idVehiculo, 'componentes', nombreComponente);
      
      await updateDoc(compDocRef, {
        kilometraje_acumulado: 0,
        kilometraje_desde_revision: 0,
        ultima_reparacion: todayStr
      });

      const alertDocRef = doc(this.db, 'alertas', alertaId);
      await updateDoc(alertDocRef, {
        estado: 'Resuelta',
        fecha_resolucion: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error en marcarComoReemplazado:', error);
      throw error;
    }
  }
}
