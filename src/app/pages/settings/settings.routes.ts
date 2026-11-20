import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const SETTING_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard],
    data: { roles: ['SYSTEM_ADMIN', 'SUPER_ADMIN', 'ADMIN'] },
    loadComponent: () =>
      import('./settings-overview/settings-overview.component').then((m) => m.SettingsOverviewComponent)
  },
  {
    path: 'departments',
    canActivate: [roleGuard],
    data: { roles: ['SYSTEM_ADMIN', 'SUPER_ADMIN', 'ADMIN'] },
    loadComponent: () =>
      import('./department-list/department-list.component').then((m) => m.DepartmentListComponent)
  },
  {
    path: 'categories',
    canActivate: [roleGuard],
    data: { roles: ['SYSTEM_ADMIN', 'SUPER_ADMIN', 'ADMIN'] },
    loadComponent: () =>
      import('./category-list/category-list.component').then((m) => m.CategoryListComponent)
  },
  {
    path: 'manage-users',
    canActivate: [roleGuard],
    data: { roles: ['SYSTEM_ADMIN', 'SUPER_ADMIN', 'ADMIN'] },
    loadComponent: () =>
      import('./manage-users/manage-users.component').then((m) => m.ManageUsersComponent)
  },
  {
    path: 'profile',
    canActivate: [roleGuard],
    data: { roles: ['SYSTEM_ADMIN', 'SUPER_ADMIN', 'ADMIN'] },
    loadComponent: () =>
      import('./profile-settings/profile-settings.component').then((m) => m.ProfileSettingsComponent)
  },
  {
    path: 'notifications',
    canActivate: [roleGuard],
    data: { roles: ['SYSTEM_ADMIN', 'SUPER_ADMIN', 'ADMIN'] },
    loadComponent: () =>
      import('./notification-preferences/notification-preferences.component').then((m) => m.NotificationPreferencesComponent)
  },
  {
    path: 'notification-sound',
    canActivate: [roleGuard],
    data: { roles: ['SYSTEM_ADMIN', 'SUPER_ADMIN', 'ADMIN'] },
    loadComponent: () =>
      import('./notification-sound/notification-sound.component').then((m) => m.NotificationSoundComponent)
  },
  {
    path: 'company-information',
    canActivate: [roleGuard],
    data: { roles: ['SYSTEM_ADMIN', 'SUPER_ADMIN', 'ADMIN'] },
    loadComponent: () =>
      import('./company-information/company-information.component').then((m) => m.CompanyInformationComponent)
  }
];