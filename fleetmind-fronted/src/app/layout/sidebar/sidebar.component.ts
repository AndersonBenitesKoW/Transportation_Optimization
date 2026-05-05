import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ROUTES } from '../../core/config/constants';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="sidebar">
      <div class="logo">
        <h3>FleetMind AI</h3>
      </div>
      <ul class="nav-menu">
        <li>
          <a routerLink="{{ ROUTES.DASHBOARD }}" routerLinkActive="active">Dashboard</a>
        </li>
        <li>
          <a routerLink="{{ ROUTES.VEHICULOS }}" routerLinkActive="active">Vehículos</a>
        </li>
        <li>
          <a routerLink="{{ ROUTES.COMBUSTIBLE }}" routerLinkActive="active">Combustible</a>
        </li>
        <li>
          <a routerLink="{{ ROUTES.MANTENIMIENTO }}" routerLinkActive="active">Mantenimiento</a>
        </li>
        <li>
          <a routerLink="{{ ROUTES.RUTAS }}" routerLinkActive="active">Rutas</a>
        </li>
        <li>
          <a routerLink="{{ ROUTES.CHATBOT }}" routerLinkActive="active">Chatbot</a>
        </li>
      </ul>
    </nav>
  `,
  styles: [`
    .sidebar {
      width: 250px;
      height: 100vh;
      background: #343a40;
      color: white;
      padding: 20px 0;
      position: fixed;
      left: 0;
      top: 0;
    }
    .logo { padding: 0 20px; margin-bottom: 30px; }
    .nav-menu { list-style: none; padding: 0; }
    .nav-menu li { margin-bottom: 10px; }
    .nav-menu a {
      display: block;
      padding: 12px 20px;
      color: #adb5bd;
      text-decoration: none;
      transition: background 0.3s;
    }
    .nav-menu a:hover, .nav-menu a.active {
      background: #495057;
      color: white;
    }
  `]
})
export class SidebarComponent {
  protected readonly ROUTES = ROUTES;
}