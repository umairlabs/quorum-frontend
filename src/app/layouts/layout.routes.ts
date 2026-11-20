import { Routes } from '@angular/router';
import { roleGuard } from '../core/guards/role.guard';

export const LayoutRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    canActivate: [roleGuard],
    data: { roles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXTERNAL_TECHNICIAN', 'TECH', 'TECHNICIAN'] },
    loadChildren: () => import('../pages/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES)
  },
  {
    path: 'assets',
    canActivate: [roleGuard],
    data: { permission: 'asset.view', roles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'] },
    loadChildren: () => import('../pages/assets/assets.routes').then((m) => m.ASSET_ROUTES)
  },
  {
    path: 'purchases',
    canActivate: [roleGuard],
    data: { permission: 'purchase.view', roles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
    loadChildren: () => import('../pages/purchases/purchases.routes').then((m) => m.PURCHASE_ROUTES)
  },
  {
    path: 'assignments',
    canActivate: [roleGuard],
    data: { permission: 'assignment.view', roles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
    loadChildren: () => import('../pages/assignments/assignments.routes').then((m) => m.ASSIGNMENT_ROUTES)
  },
  {
    path: 'maintenance',
    canActivate: [roleGuard],
    data: { permission: 'maintenance.view', roles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXTERNAL_TECHNICIAN', 'TECHNICIAN', 'TECH', 'EMPLOYEE'] },
    loadChildren: () => import('../pages/maintenance/maintenance.routes').then((m) => m.MAINTENANCE_ROUTES)
  },
  {
    path: 'audit-logs',
    canActivate: [roleGuard],
    data: { roles: ['SYSTEM_ADMIN', 'SUPER_ADMIN', 'ADMIN'] },
    loadChildren: () => import('../pages/audit-logs/audit-logs.routes').then((m) => m.AUDIT_LOG_ROUTES)
  },
  {
    path: 'reports',
    canActivate: [roleGuard],
    data: { permission: 'report.view', roles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
    loadChildren: () => import('../pages/reports/reports.routes').then((m) => m.REPORT_ROUTES)
  },
  {
    path: 'users',
    canActivate: [roleGuard],
    data: { roles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
    loadChildren: () => import('../pages/users/users.routes').then((m) => m.USER_ROUTES)
  },
  {
    path: 'settings',
    canActivate: [roleGuard],
    data: { roles: ['SYSTEM_ADMIN', 'SUPER_ADMIN', 'ADMIN'] },
    loadChildren: () => import('../pages/settings/settings.routes').then((m) => m.SETTING_ROUTES)
  },
  {
    path: 'categories',
    redirectTo: 'settings/categories',
    pathMatch: 'full'
  },
  {
    path: 'depreciation',
    canActivate: [roleGuard],
    data: { permission: 'depreciation.view', roles: ['SYSTEM_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'OPERATIONS_MANAGER', 'MANAGER'] },
    loadChildren: () => import('../pages/depreciation/depreciation.routes').then((m) => m.DEPRECIATION_ROUTES)
  },
  {
    path: 'notifications',
    loadChildren: () => import('../pages/notifications/notifications.routes').then((m) => m.NOTIFICATION_ROUTES)
  },
  {
    path: 'ai-assistant',
    canActivate: [roleGuard],
    data: { roles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
    loadChildren: () => import('../pages/ai-assistant/ai-assistant.routes').then((m) => m.AI_ASSISTANT_ROUTES)
  }
];