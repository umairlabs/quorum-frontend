import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthApisService } from '../services/api/auth-apis.service';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthApisService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
