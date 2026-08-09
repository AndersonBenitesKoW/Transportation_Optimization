/** Modelos del dominio Conductores. */
export interface Conductor {
  id?: string;
  id_conductor: string;
  nombre: string;
  licencia: string;
  telefono: string;
  email: string;
  experiencia_anios: number;
  calificacion: number;
  estado?: string;
  fecha_contratacion?: string;
}
