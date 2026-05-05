import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ButtonComponent } from '../../shared/components/button.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  template: `
    <header class="navbar">
      <div class="navbar-content">
        <div class="user-info">
          <span *ngIf="authService.currentUser()">Bienvenido, {{ authService.currentUser()?.name }}</span>
        </div>
        <app-button variant="secondary" (onClick)="logout()">Cerrar Sesión</app-button>
      </div>
    </header>
  `,
  styles: [`
    .navbar {
      height: 60px;
      background: white;
      border-bottom: 1px solid #ddd;
      padding: 0 20px;
      display: flex;
      align-items: center;
      margin-left: 250px;
    }
    .navbar-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }
    .user-info { font-weight: 500; }
  `]
})
export class NavbarComponent {
  constructor(public authService: AuthService) {}

  logout() {
    this.authService.logout();
  }
}