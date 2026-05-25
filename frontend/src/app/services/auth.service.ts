import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Usuario {
  uid: string;
  email: string;
  nombre: string;
  rol: 'ADMIN' | 'CONDUCTOR';
  empresa?: string;
  telefono?: string;
  ref?: string;
}

export interface LoginResponse {
  status: string;
  token?: string;
  usuario?: Usuario;
  mensaje?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  
  private currentUserSubject = new BehaviorSubject<Usuario | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    // Cargar usuario al iniciar
    const user = this.getUserFromStorage();
    if (user) {
      this.currentUserSubject.next(user);
    }
  }

  private getUserFromStorage(): Usuario | null {
    const userJson = localStorage.getItem('fleetmind_user');
    return userJson ? JSON.parse(userJson) : null;
  }

  get currentUserValue(): Usuario | null {
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

  // Login simple (sin Firebase Auth por ahora, solo validación local)
  login(email: string, password: string): Observable<any> {
    // Por ahora hacemos login simulado contra la colección usuarios
    return this.http.get<any>(`${environment.apiUrl}/api/usuarios?email=${email}`).pipe(
      tap(response => {
        if (response.status === 'success' && response.data) {
          const usuario = response.data;
          localStorage.setItem('fleetmind_user', JSON.stringify(usuario));
          this.currentUserSubject.next(usuario);
        }
      })
    );
  }

  // Registro simple
  register(userData: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/usuarios`, userData).pipe(
      tap(response => {
        if (response.status === 'success') {
          // Auto-login después del registro
          const usuario: Usuario = {
            uid: response.data.uid,
            email: userData.email,
            nombre: userData.nombre,
            rol: 'ADMIN',
            empresa: userData.empresa,
            telefono: userData.telefono
          };
          localStorage.setItem('fleetmind_user', JSON.stringify(usuario));
          this.currentUserSubject.next(usuario);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('fleetmind_user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  // Método temporal para login rápido de prueba
  // Modifica la firma de la función para aceptar refCamion
  loginDemo(rol: 'ADMIN' | 'CONDUCTOR', refCamion?: string): void {
    const usuario: Usuario = rol === 'ADMIN' 
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
          // AQUÍ ESTÁ LA CLAVE: Usamos el camión que nos pasan, o el 001 por defecto
          ref: refCamion || 'CAMION-001' 
        };
    
    localStorage.setItem('fleetmind_user', JSON.stringify(usuario));
    this.currentUserSubject.next(usuario);
    
    if (rol === 'ADMIN') {
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.router.navigate(['/conductor']);
    }
  }
}
