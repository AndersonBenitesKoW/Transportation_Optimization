/**
 * Envoltorio estandar de todas las respuestas del backend FleetMind.
 */
export interface ApiResponse<T> {
  status: string;
  data?: T;
  mensaje?: string;
}
