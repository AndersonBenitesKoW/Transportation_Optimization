import { MonoTypeOperatorFunction, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Operador que deja constancia en consola de cualquier error HTTP y vuelve a
 * lanzarlo.
 *
 * Garantiza que ningun fallo quede silencioso (regla de depuracion
 * transparente) sin alterar el flujo: el componente sigue recibiendo el error
 * y decide como reaccionar.
 *
 * @param contexto Origen del error, p. ej. 'VehiculosApi.getVehiculos'.
 */
export function registrarError<T>(contexto: string): MonoTypeOperatorFunction<T> {
  return catchError<T, Observable<never>>((error: unknown) => {
    console.error(`[${contexto}] Error en la peticion:`, error);
    return throwError(() => error);
  });
}
