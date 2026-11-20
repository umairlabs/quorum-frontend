import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const MAINTENANCE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./maintenance-list/maintenance-list.component').then(
        (m) => m.MaintenanceListComponent
      ),
  },
  {
    path: 'create',
    canActivate: [roleGuard],
    data: {
      permission: 'maintenance.create',
      roles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER']
    },
    loadComponent: () =>
      import('./maintenance-create/maintenance-create.component').then(
        (m) => m.MaintenanceCreateComponent
      ),
  },
  {
    path: ':id/update-work',
    loadComponent: () =>
      import('./maintenance-work-update/maintenance-work-update.component').then(
        (m) => m.MaintenanceWorkUpdateComponent
      ),
  },
  {
    path: 'work-update/:id',
    loadComponent: () =>
      import('./maintenance-work-update/maintenance-work-update.component').then(
        (m) => m.MaintenanceWorkUpdateComponent
      ),
  },
];
