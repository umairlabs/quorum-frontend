import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthApisService } from '../services/api/auth-apis.service';
import { PermissionService } from '../services/permission.service';
import { ToastService } from '../services/toast.service';

function normalizeRole(role: string | null | undefined): string {
  return (role || '').toUpperCase().replace(/\s+/g, '_');
}

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthApisService);
  const permissionService = inject(PermissionService);
  const router = inject(Router);
  const toastService = inject(ToastService);

  const allowedRoles: string[] | undefined = route.data?.['roles'];
  const requiredPermission: string | undefined = route.data?.['permission'];

  const currentRole = normalizeRole(
    authService.currentUser()?.role || localStorage.getItem('role')
  );

  // System admin always passes
  if (['SYSTEM_ADMIN', 'SUPER_ADMIN', 'ADMIN'].includes(currentRole)) {
    return true;
  }

  // 1. Check required permission if specified
  if (requiredPermission) {
    if (!permissionService.hasPermission(requiredPermission)) {
      toastService.presentToast('Access Denied: You do not have permission to access this page.', 3000, 'warning');
      const redirectTo = currentRole === 'EMPLOYEE' ? '/assets' : '/dashboard';
      return router.createUrlTree([redirectTo]);
    }
  }

  // 2. Check allowed roles if specified
  if (allowedRoles && allowedRoles.length > 0) {
    const normalizedAllowed = allowedRoles.map(normalizeRole);
    if (!normalizedAllowed.includes(currentRole)) {
      toastService.presentToast('Access Denied: You do not have permission to access this page.', 3000, 'warning');
      // Employees redirect to their own landing page
      const redirectTo = currentRole === 'EMPLOYEE' ? '/assets' : '/dashboard';
      return router.createUrlTree([redirectTo]);
    }
  }

  return true;
};