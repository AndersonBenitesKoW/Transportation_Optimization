import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class AdminLayout implements OnInit {
  private router = inject(Router);
  usuarioActual: any = null;

  ngOnInit() {
    const sesion = localStorage.getItem('fleetmind_user');
    if (sesion) {
      this.usuarioActual = JSON.parse(sesion);
      if (this.usuarioActual.rol !== 'ADMIN') this.router.navigate(['/login']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  cerrarSesion() {
    localStorage.removeItem('fleetmind_user');
    this.router.navigate(['/login']);
  }
}
