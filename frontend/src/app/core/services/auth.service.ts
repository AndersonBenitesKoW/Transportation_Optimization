import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { UsuariosApi } from '../api/usuarios.api';
import { RolUsuario, UsuarioSesion } from '../../shared/models';

const CLAVE_SESION = 'fleetmind_user';

/**
 * Gestiona la sesion del usuario en el navegador.
 *
 * No realiza peticiones HTTP directamente: delega en `UsuariosApi`, de modo
 * que este servicio solo se ocupa del estado de sesion y la navegacion.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private usuariosApi = inject(UsuariosApi);
  private router = inject(Router);

  private currentUserSubject = new BehaviorSubject<UsuarioSesion | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  private getUserFromStorage(): UsuarioSesion | null {
    try {
      const userJson = localStorage.getItem(CLAVE_SESION);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('[AuthService.getUserFromStorage] Sesion corrupta en localStorage:', error);
      localStorage.removeItem(CLAVE_SESION);
      return null;
    }
  }

  private guardarSesion(usuario: UsuarioSesion): void {
    try {
      localStorage.setItem(CLAVE_SESION, JSON.stringify(usuario));
      this.currentUserSubject.next(usuario);
    } catch (error) {
      console.error('[AuthService.guardarSesion] No se pudo persistir la sesion:', error);
      this.currentUserSubject.next(usuario);
    }
  }

  get currentUserValue(): UsuarioSesion | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return !!this.currentUserValue;
  }

  get isAdmin(): boolean {
    return this.currentUserValue?.rol === 'ADMIN';
  }

  get isConductor(): boolean {
    return this.currentUserValue?.rol === 'CONDUCTOR';
  }

  login(email: string, password: string): Observable<any> {
    return this.usuariosApi.login({ email, password }).pipe(
      tap(response => {
        if (response.status === 'success' && response.data) {
          const user: any = response.data;
          this.guardarSesion({
            uid: user.id || user.uid || '',
            email: user.email,
            nombre: user.nombre,
            rol: user.rol,
            empresa: user.empresa || 'Ransa',
            telefono: user.telefono || '',
            ref: user.ref || undefined
          });
        }
      })
    );
  }

  register(userData: any): Observable<any> {
    return this.usuariosApi.register(userData).pipe(
      tap(response => {
        if (response.status === 'success') {
          const data: any = response.data ?? {};
          this.guardarSesion({
            uid: data.id || userData.email.split('@')[0],
            email: userData.email,
            nombre: userData.nombre,
            rol: userData.rol || 'CONDUCTOR',
            empresa: userData.empresa || 'Ransa',
            telefono: userData.telefono || '',
            ref: data.ref || undefined
          });
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(CLAVE_SESION);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  loginDemo(rol: RolUsuario, refCamion?: string): void {
    const usuario: UsuarioSesion =
      rol === 'ADMIN'
        ? {
            uid: 'admin001',
            email: 'admin@fleetmind.com',
            nombre: 'Administrador Principal',
            rol: 'ADMIN',
            empresa: 'Ransa'
          }
        : {
            uid: `conductor_${refCamion}`,
            email: `${refCamion?.toLowerCase()}@empresa.com`,
            nombre: `Conductor de ${refCamion}`,
            rol: 'CONDUCTOR',
            empresa: 'Ransa',
            ref: refCamion || 'CAMION-001'
          };

    this.guardarSesion(usuario);

    if (rol === 'ADMIN') {
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.router.navigate(['/conductor']);
    }
  }
}
