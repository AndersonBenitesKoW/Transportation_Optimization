import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { IconComponent } from '../../components/icon.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class AdminLayout implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  readonly themeService = inject(ThemeService);

  layoutDashboard = 'layout-dashboard';
  truck = 'truck';
  users = 'users';
  bell = 'bell';
  mapPin = 'map-pin';
  logOut = 'log-out';
  sun = 'sun';
  moon = 'moon';
  chevronLeft = 'chevron-left';
  chevronRight = 'chevron-right';
  menu = 'menu';
  shield = 'shield';

  usuarioActual: any = null;
  sidebarColapsado = false;

  ngOnInit() {
    this.usuarioActual = this.authService.currentUserValue;
    if (!this.authService.isAuthenticated || !this.authService.isAdmin) {
      this.router.navigate(['/login']);
    }
    const saved = localStorage.getItem('fleetmind_sidebar');
    if (saved === 'collapsed') this.sidebarColapsado = true;
  }

  get iniciales(): string {
    if (!this.usuarioActual?.nombre) return 'A';
    const partes = this.usuarioActual.nombre.split(' ');
    return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase() || 'A';
  }

  toggleSidebar() {
    this.sidebarColapsado = !this.sidebarColapsado;
    localStorage.setItem('fleetmind_sidebar', this.sidebarColapsado ? 'collapsed' : 'expanded');
  }

  toggleTema() { this.themeService.toggleTheme(); }
  cerrarSesion() { this.authService.logout(); }
}
