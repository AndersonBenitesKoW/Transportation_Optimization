import { Routes } from '@angular/router';
import { PublicoLayout } from './layouts/publico/publico';
import { HomeComponent } from './modulos/publico/home/home';
import { LoginComponent } from './modulos/publico/login/login';
import { RegisterComponent } from './modulos/publico/register/register';
import { AdminLayout } from './layouts/admin/admin';
import { DashboardAdminComponent } from './modulos/admin/dashboard/dashboard';
import { UnidadesComponent } from './modulos/admin/unidades/unidades';
import { ConductoresComponent } from './modulos/admin/conductores/conductores';
import { AlertasComponent } from './modulos/admin/alertas/alertas';
import { ViajesComponent } from './modulos/admin/viajes/viajes';
import { ConductorComponent } from './layouts/conductor/conductor';
import { adminGuard, conductorGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: '',
    component: PublicoLayout,
    children: [
      { path: 'home', component: HomeComponent },
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent }
    ]
  },
  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardAdminComponent },
      { path: 'unidades', component: UnidadesComponent },
      { path: 'conductores', component: ConductoresComponent },
      { path: 'alertas', component: AlertasComponent },
      { path: 'viajes', component: ViajesComponent }
    ]
  },
  { 
    path: 'conductor', 
    component: ConductorComponent,
    canActivate: [conductorGuard]
  },
  { path: '**', redirectTo: 'home' }
];