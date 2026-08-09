import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { VehiculosApi } from '../../../core/api';
import { IconComponent } from '../../../shared/ui/icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent implements OnInit {
  sun = 'sun';
  moon = 'moon';
  eye = 'eye';
  eyeOff = 'eye-off';
  truck = 'truck';

  private authService = inject(AuthService);
  private vehiculosApi = inject(VehiculosApi);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  readonly themeService = inject(ThemeService);

  credenciales = { email: '', password: '' };
  errorLogin = '';
  cargando = false;
  returnUrl = '/admin/dashboard';
  mostrarPassword = false;

  ngOnInit() {
    if (this.authService.isAuthenticated) { this.redirigirSegunRol(); return; }
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/admin/dashboard';
  }

  iniciarSesion() {
    if (!this.credenciales.email || !this.credenciales.password) { this.errorLogin = 'Completa todos los campos'; return; }
    this.cargando = true; this.errorLogin = '';
    
    if (this.credenciales.email === 'admin' && this.credenciales.password === 'admin123') { 
      this.authService.loginDemo('ADMIN'); 
      this.cargando = false; 
      return; 
    }
    
    // NUEVA LÓGICA DE LOGIN PARA CONDUCTORES
    if (this.credenciales.email.startsWith('c') && this.credenciales.password === '1234') { 
      const numCamion = this.credenciales.email.substring(1); 
      const idCamion = `CAMION-${numCamion}`;
      this.vehiculosApi.getVehiculo(idCamion).subscribe({
        next: () => {
          this.authService.loginDemo('CONDUCTOR', idCamion);
          this.cargando = false;
        },
        error: () => {
          this.errorLogin = `El vehículo ${idCamion} no existe en el sistema`;
          this.cargando = false;
        }
      });
      return;
    }

    this.authService.login(this.credenciales.email, this.credenciales.password).subscribe({
      next: (r: any) => { this.cargando = false; if (r.status === 'success') this.redirigirSegunRol(); else this.errorLogin = 'Usuario o contrasena incorrectos'; },
      error: () => { this.cargando = false; this.errorLogin = 'Error. Intenta con: admin/admin123'; }
    });
  }

  private redirigirSegunRol() {
    const user = this.authService.currentUserValue;
    if (!user) return;
    user.rol === 'ADMIN' ? this.router.navigate([this.returnUrl]) : this.router.navigate(['/conductor']);
  }

  loginRapido(rol: 'ADMIN' | 'CONDUCTOR') { this.authService.loginDemo(rol); }
  togglePassword() { this.mostrarPassword = !this.mostrarPassword; }
  toggleTema() { this.themeService.toggleTheme(); }
}
