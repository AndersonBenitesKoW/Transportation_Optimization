import { Routes } from '@angular/router';

import { AdminLayout } from './layouts/admin/admin';
import { PublicoLayout } from './layouts/publico/publico';
import { adminGuard, conductorGuard } from './core/guards/auth.guard';

/**
 * Rutas de la aplicacion, agrupadas por area funcional.
 *
 * Los layouts se cargan de forma inmediata porque son el armazon de la
 * navegacion; cada pantalla se carga bajo demanda con `loadComponent`, de modo
 * que agregar una feature no aumenta el bundle inicial.
 */
export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  // --- Area publica ---
  {
    path: '',
    component: PublicoLayout,
    children: [
      {
        path: 'home',
        loadComponent: () => import('./features/home/home').then(m => m.HomeComponent)
      },
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register').then(m => m.RegisterComponent)
      }
    ]
  },

  // --- Area de administracion ---
  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then(m => m.DashboardAdminComponent)
      },
      {
        path: 'unidades',
        loadComponent: () => import('./features/unidades/unidades').then(m => m.UnidadesComponent)
      },
      {
        path: 'conductores',
        loadComponent: () =>
          import('./features/conductores/conductores').then(m => m.ConductoresComponent)
      },
      {
        path: 'alertas',
        loadComponent: () => import('./features/alertas/alertas').then(m => m.AlertasComponent)
      },
      {
        path: 'viajes',
        loadComponent: () => import('./features/viajes/viajes').then(m => m.ViajesComponent)
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./features/usuarios/usuarios').then(m => m.UsuariosComponent)
      }
    ]
  },

  // --- Area del conductor ---
  {
    path: 'conductor',
    canActivate: [conductorGuard],
    loadComponent: () => import('./features/conductor/conductor').then(m => m.ConductorComponent)
  },

  { path: '**', redirectTo: 'home' }
];
