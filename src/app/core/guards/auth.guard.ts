import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthApisService } from '../services/api/auth-apis.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthApisService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.isTokenValid()) {
    return true;
  }

  // Clear any expired or malformed token from storage
  authService.clearSession();
  return router.createUrlTree(['/auth/login']);
};
