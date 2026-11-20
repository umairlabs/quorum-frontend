import { inject, Injectable, signal, WritableSignal } from '@angular/core';

export interface PermissionDefinition {
  code: string;
  name: string;
  group: string;
  description: string;
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  { code: 'asset.view', name: 'View Assets', group: 'ASSETS', description: 'Browse and inspect asset catalog & stock units' },
  { code: 'asset.create', name: 'Create Asset', group: 'ASSETS', description: 'Define new products in the catalog' },
  { code: 'asset.edit', name: 'Edit Asset', group: 'ASSETS', description: 'Update product & unit details' },
  { code: 'asset.delete', name: 'Delete Asset', group: 'ASSETS', description: 'Delete products or physical stock units' },
  { code: 'asset.assign', name: 'Assign Asset', group: 'ASSETS', description: 'Assign physical units to employees' },
  { code: 'asset.transfer', name: 'Transfer Asset', group: 'ASSETS', description: 'Transfer unit between employees' },
  { code: 'asset.return', name: 'Return Asset', group: 'ASSETS', description: 'Process unit returns to inventory' },
  { code: 'asset.retire', name: 'Retire Asset', group: 'ASSETS', description: 'Mark unit as sold or scrapped' },
  { code: 'asset.history.view', name: 'View Asset History', group: 'ASSETS', description: 'Inspect asset audit trail & status history' },

  { code: 'purchase.view', name: 'View Purchases', group: 'PURCHASES', description: 'View purchase orders and suppliers' },
  { code: 'purchase.create', name: 'Create Purchase', group: 'PURCHASES', description: 'Create purchase orders & add suppliers' },
  { code: 'purchase.edit', name: 'Edit Purchase', group: 'PURCHASES', description: 'Modify purchase orders and payment info' },
  { code: 'purchase.delete', name: 'Delete Purchase', group: 'PURCHASES', description: 'Cancel or delete purchase records' },

  { code: 'assignment.view', name: 'View Assignments', group: 'ASSIGNMENTS', description: 'View list of active and past assignments' },
  { code: 'assignment.create', name: 'Create Assignment', group: 'ASSIGNMENTS', description: 'Issue asset units to staff' },
  { code: 'assignment.transfer', name: 'Transfer Assignment', group: 'ASSIGNMENTS', description: 'Reassign unit from one employee to another' },
  { code: 'assignment.return', name: 'Return Assignment', group: 'ASSIGNMENTS', description: 'Mark assignment as returned' },
  { code: 'assignment.history.view', name: 'View Assignment History', group: 'ASSIGNMENTS', description: 'Inspect complete assignment logs' },

  { code: 'maintenance.view', name: 'View Maintenance', group: 'MAINTENANCE', description: 'View repair tickets and status' },
  { code: 'maintenance.create', name: 'Create Maintenance Ticket', group: 'MAINTENANCE', description: 'Log new repair tickets' },
  { code: 'maintenance.manage', name: 'Manage Maintenance', group: 'MAINTENANCE', description: 'Assign technicians and edit tickets' },
  { code: 'maintenance.status.update', name: 'Update Maintenance Status', group: 'MAINTENANCE', description: 'Update work log and repair status' },

  { code: 'depreciation.view', name: 'View Depreciation', group: 'DEPRECIATION', description: 'View financial depreciation values' },
  { code: 'depreciation.manage', name: 'Manage Depreciation', group: 'DEPRECIATION', description: 'Configure depreciation schedules' },

  { code: 'notification.view', name: 'View Notifications', group: 'NOTIFICATIONS', description: 'Receive system alerts and updates' },
  { code: 'notification.manage', name: 'Manage Notifications', group: 'NOTIFICATIONS', description: 'Mark notifications as read or clear' },

  { code: 'report.view', name: 'View Reports', group: 'REPORTS', description: 'View analytics and export system reports' }
];

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  public readonly permissions: WritableSignal<string[]> = signal<string[]>([]);

  constructor() {
    this.restorePermissions();
  }

  public setPermissions(perms: string[]): void {
    const list = Array.isArray(perms) ? perms : [];
    this.permissions.set(list);
    localStorage.setItem('permissions', JSON.stringify(list));
  }

  public hasPermission(permissionCode: string): boolean {
    const currentRole = (localStorage.getItem('role') || '').toUpperCase().replace(/\s+/g, '_');
    if (currentRole === 'SYSTEM_ADMIN' || currentRole === 'SUPER_ADMIN' || currentRole === 'ADMIN') {
      return true;
    }
    if (currentRole === 'EMPLOYEE') {
      const employeePagePermissions = ['asset.view', 'maintenance.view', 'notification.view'];
      if (employeePagePermissions.includes(permissionCode)) {
        return true;
      }
    }
    const list = this.permissions();
    return list.includes('*') || list.includes(permissionCode);
  }

  public hasAnyPermission(permissionCodes: string[]): boolean {
    return permissionCodes.some((code) => this.hasPermission(code));
  }

  public hasAllPermissions(permissionCodes: string[]): boolean {
    return permissionCodes.every((code) => this.hasPermission(code));
  }

  public clearPermissions(): void {
    this.permissions.set([]);
    localStorage.removeItem('permissions');
  }

  private restorePermissions(): void {
    const saved = localStorage.getItem('permissions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.permissions.set(parsed);
        }
      } catch {
        // corrupt data ignored
      }
    }
  }
}
