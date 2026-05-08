import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { AdminComponent } from './components/admin/admin';
import { ConductorComponent } from './components/conductor/conductor';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'admin', component: AdminComponent },
  { path: 'conductor', component: ConductorComponent },
  { path: '**', redirectTo: 'login' }
];