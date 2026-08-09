import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated) {
    return true;
  }

  // Guardar la URL a la que intentaba acceder
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated && authService.isAdmin) {
    return true;
  }

  if (authService.isAuthenticated) {
    // Usuario autenticado pero no es admin
    router.navigate(['/conductor']);
    return false;
  }

  // No autenticado
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

export const conductorGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated && authService.isConductor) {
    return true;
  }

  if (authService.isAuthenticated) {
    // Usuario autenticado pero no es conductor
    router.navigate(['/admin/dashboard']);
    return false;
  }

  // No autenticado
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
