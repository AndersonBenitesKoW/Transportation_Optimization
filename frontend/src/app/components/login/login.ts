import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html'
})
export class LoginComponent implements OnInit {
  usuariosBD = [
    { user: 'admin', pass: 'admin123', rol: 'ADMIN', ref: 'TODOS' },
    { user: 'c001', pass: '1234', rol: 'CONDUCTOR', ref: 'CAMION-001' },
    { user: 'c002', pass: '1234', rol: 'CONDUCTOR', ref: 'CAMION-002' },
    { user: 'c003', pass: '1234', rol: 'CONDUCTOR', ref: 'CAMION-003' }
  ];
  
  credenciales = { user: '', pass: '' };
  errorLogin = '';
  private router = inject(Router);

  ngOnInit() {
    // Si ya hay sesión guardada, saltamos el login
    const sesion = localStorage.getItem('fleetmind_user');
    if (sesion) {
      const user = JSON.parse(sesion);
      this.redirigirSegunRol(user.rol);
    }
  }

  iniciarSesion() {
    const user = this.usuariosBD.find(u => u.user === this.credenciales.user && u.pass === this.credenciales.pass);
    if (user) {
      localStorage.setItem('fleetmind_user', JSON.stringify(user));
      this.redirigirSegunRol(user.rol);
    } else {
      this.errorLogin = 'Usuario o contraseña incorrectos.';
    }
  }

  private redirigirSegunRol(rol: string) {
    if (rol === 'ADMIN') {
      this.router.navigate(['/admin']);
    } else if (rol === 'CONDUCTOR') {
      this.router.navigate(['/conductor']);
    }
  }
}