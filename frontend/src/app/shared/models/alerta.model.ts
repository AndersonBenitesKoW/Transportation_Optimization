/** Modelos del dominio Alertas de mantenimiento preventivo. */
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
