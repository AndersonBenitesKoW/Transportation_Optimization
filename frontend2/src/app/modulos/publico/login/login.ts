import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html'
})
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  
  credenciales = { email: '', password: '' };
  errorLogin = '';
  cargando = false;
  returnUrl = '/admin/dashboard';

  ngOnInit() {
    // Si ya está autenticado, redirigir
    if (this.authService.isAuthenticated) {
      this.redirigirSegunRol();
      return;
    }

    // Obtener URL de retorno si existe
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/admin/dashboard';
  }

  iniciarSesion() {
    if (!this.credenciales.email || !this.credenciales.password) {
      this.errorLogin = 'Por favor completa todos los campos';
      return;
    }

    this.cargando = true;
    this.errorLogin = '';

    // Login demo para pruebas rápidas
    if (this.credenciales.email === 'admin' && this.credenciales.password === 'admin123') {
      this.authService.loginDemo('ADMIN');
      this.cargando = false;
      return;
    }

    if (this.credenciales.email.startsWith('c00') && this.credenciales.password === '1234') {
      this.authService.loginDemo('CONDUCTOR');
      this.cargando = false;
      return;
    }

    // Login real (cuando tengamos el endpoint)
    this.authService.login(this.credenciales.email, this.credenciales.password).subscribe({
      next: (response) => {
        this.cargando = false;
        if (response.status === 'success') {
          this.redirigirSegunRol();
        } else {
          this.errorLogin = 'Usuario o contraseña incorrectos';
        }
      },
      error: (err) => {
        this.cargando = false;
        this.errorLogin = 'Error al iniciar sesión. Intenta con: admin/admin123';
        console.error('Error login:', err);
      }
    });
  }

  private redirigirSegunRol() {
    const user = this.authService.currentUserValue;
    if (!user) return;

    if (user.rol === 'ADMIN') {
      this.router.navigate([this.returnUrl]);
    } else if (user.rol === 'CONDUCTOR') {
      this.router.navigate(['/conductor']);
    }
  }

  // Método para login rápido de prueba
  loginRapido(rol: 'ADMIN' | 'CONDUCTOR') {
    this.authService.loginDemo(rol);
  }
}