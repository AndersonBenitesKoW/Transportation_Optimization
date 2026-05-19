import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class AdminLayout implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  usuarioActual: any = null;

  ngOnInit() {
    // Usar AuthService en lugar de localStorage directo
    this.usuarioActual = this.authService.currentUserValue;
    
    if (!this.authService.isAuthenticated || !this.authService.isAdmin) {
      this.router.navigate(['/login']);
    }
  }

  cerrarSesion() {
    this.authService.logout();
  }
}
