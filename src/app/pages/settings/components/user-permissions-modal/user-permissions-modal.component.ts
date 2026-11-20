import { Component, computed, inject, input, InputSignal, output, OutputEmitterRef, signal, WritableSignal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../../../core/interfaces/user.interface';
import { ALL_PERMISSIONS, PermissionDefinition } from '../../../../core/services/permission.service';
import { UserApisService } from '../../../users/services/user-apis.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ModalComponent } from '../../../../core/components/modal/modal.component';

export interface PermissionGroup {
  name: string;
  label: string;
  items: PermissionDefinition[];
}

@Component({
  selector: 'app-user-permissions-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  templateUrl: './user-permissions-modal.component.html'
})
export class UserPermissionsModalComponent implements OnChanges {
  private readonly userApisService = inject(UserApisService);
  private readonly toastService = inject(ToastService);

  public readonly isOpen: InputSignal<boolean> = input<boolean>(false);
  public readonly user: InputSignal<User | null> = input<User | null>(null);
  public readonly close: OutputEmitterRef<void> = output<void>();
  public readonly saved: OutputEmitterRef<string[]> = output<string[]>();

  protected readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly saving: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly searchQuery: WritableSignal<string> = signal<string>('');
  protected readonly selectedPermissions: WritableSignal<string[]> = signal<string[]>([]);

  protected readonly allGroups: PermissionGroup[] = [
    { name: 'ASSETS', label: 'Assets', items: ALL_PERMISSIONS.filter((p) => p.group === 'ASSETS') },
    { name: 'PURCHASES', label: 'Purchases', items: ALL_PERMISSIONS.filter((p) => p.group === 'PURCHASES') },
    { name: 'ASSIGNMENTS', label: 'Assignments', items: ALL_PERMISSIONS.filter((p) => p.group === 'ASSIGNMENTS') },
    { name: 'MAINTENANCE', label: 'Maintenance', items: ALL_PERMISSIONS.filter((p) => p.group === 'MAINTENANCE') },
    { name: 'DEPRECIATION', label: 'Depreciation', items: ALL_PERMISSIONS.filter((p) => p.group === 'DEPRECIATION') },
    { name: 'NOTIFICATIONS', label: 'Notifications', items: ALL_PERMISSIONS.filter((p) => p.group === 'NOTIFICATIONS') },
    { name: 'REPORTS', label: 'Reports', items: ALL_PERMISSIONS.filter((p) => p.group === 'REPORTS') }
  ];

  protected readonly filteredGroups = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.allGroups;

    return this.allGroups
      .map((g) => ({
        ...g,
        items: g.items.filter((item) => item.name.toLowerCase().includes(query) || item.code.toLowerCase().includes(query) || item.description.toLowerCase().includes(query))
      }))
      .filter((g) => g.items.length > 0);
  });

  protected readonly selectedCount = computed(() => this.selectedPermissions().length);
  protected readonly totalCount = ALL_PERMISSIONS.length;

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen() && this.user()) {
      this.loadUserPermissions();
    }
  }

  private loadUserPermissions(): void {
    const u = this.user();
    if (!u) return;

    this.loading.set(true);
    this.userApisService.getUserPermissions(u.id).subscribe({
      next: (res) => {
        this.selectedPermissions.set(res.permissions || []);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        console.error('Failed to load user permissions', err);
        // Fallback to user object permissions if available
        this.selectedPermissions.set((u as any).permissions || []);
        this.loading.set(false);
      }
    });
  }

  protected isSelected(code: string): boolean {
    return this.selectedPermissions().includes(code);
  }

  protected togglePermission(code: string): void {
    const current = this.selectedPermissions();
    if (current.includes(code)) {
      this.selectedPermissions.set(current.filter((c) => c !== code));
    } else {
      this.selectedPermissions.set([...current, code]);
    }
  }

  protected isGroupAllSelected(group: PermissionGroup): boolean {
    if (group.items.length === 0) return false;
    return group.items.every((item) => this.isSelected(item.code));
  }

  protected isGroupSomeSelected(group: PermissionGroup): boolean {
    if (group.items.length === 0) return false;
    const count = group.items.filter((item) => this.isSelected(item.code)).length;
    return count > 0 && count < group.items.length;
  }

  protected toggleGroup(group: PermissionGroup): void {
    const allSelected = this.isGroupAllSelected(group);
    const codesInGroup = group.items.map((i) => i.code);

    if (allSelected) {
      // Unselect all in group
      this.selectedPermissions.set(this.selectedPermissions().filter((c) => !codesInGroup.includes(c)));
    } else {
      // Select all in group
      const next = new Set([...this.selectedPermissions(), ...codesInGroup]);
      this.selectedPermissions.set(Array.from(next));
    }
  }

  protected selectAllGlobal(): void {
    this.selectedPermissions.set(ALL_PERMISSIONS.map((p) => p.code));
  }

  protected clearAllGlobal(): void {
    this.selectedPermissions.set([]);
  }

  protected onCancel(): void {
    this.close.emit();
  }

  protected onSave(): void {
    const u = this.user();
    if (!u) return;

    this.saving.set(true);
    const perms = this.selectedPermissions();

    this.userApisService.updateUserPermissions(u.id, perms).subscribe({
      next: () => {
        this.saving.set(false);
        this.toastService.presentToast(`Permissions updated for ${u.fullName || u.email}.`, 2000, 'success');
        this.saved.emit(perms);
        this.close.emit();
      },
      error: (err: unknown) => {
        console.error('Failed to update user permissions', err);
        this.saving.set(false);
        this.toastService.presentToast('Failed to save permissions. Please try again.', 2500, 'error');
      }
    });
  }

  protected getRoleDisplayName(role: string | undefined): string {
    if (!role) return 'User';
    const r = role.toUpperCase().replace(/\s+/g, '_');
    if (r === 'SYSTEM_ADMIN' || r === 'SUPER_ADMIN' || r === 'ADMIN') return 'System Administrator';
    if (r === 'OPERATIONS_MANAGER' || r === 'MANAGER') return 'Operations Manager';
    if (r === 'EXTERNAL_TECHNICIAN' || r === 'TECHNICIAN') return 'External Technician';
    return role;
  }

  protected getRoleBadgeClass(role: string | undefined): string {
    if (!role) return 'bg-surface-container-high text-on-surface-variant border border-outline-variant';
    const r = role.toUpperCase().replace(/\s+/g, '_');
    if (r === 'SYSTEM_ADMIN' || r === 'SUPER_ADMIN' || r === 'ADMIN') {
      return 'bg-primary/10 text-primary border border-primary/20 font-semibold';
    }
    if (r === 'OPERATIONS_MANAGER' || r === 'MANAGER') {
      return 'bg-secondary-container/40 text-primary border border-secondary-container font-medium';
    }
    if (r === 'EXTERNAL_TECHNICIAN' || r === 'TECHNICIAN') {
      return 'bg-tertiary-fixed/30 text-on-tertiary-fixed-variant border border-tertiary-fixed/50 font-medium';
    }
    return 'bg-surface-container-high text-on-surface-variant border border-outline-variant';
  }
}
