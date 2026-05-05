import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/pages/dashboard.page').then(m => m.DashboardPageComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'vehiculos',
    loadComponent: () => import('./features/vehiculos/pages/vehicle.page').then(m => m.VehiclePageComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'combustible',
    loadComponent: () => import('./features/combustible/pages/fuel.page').then(m => m.FuelPageComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'mantenimiento',
    loadComponent: () => import('./features/mantenimiento/pages/maintenance.page').then(m => m.MaintenancePageComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'rutas',
    loadComponent: () => import('./features/rutas/pages/routes.page').then(m => m.RoutesPageComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'chatbot',
    loadComponent: () => import('./features/chatbot/pages/chatbot.page').then(m => m.ChatbotPageComponent),
    canActivate: [AuthGuard]
  }
];
