import { Component, DestroyRef, HostListener, inject, OnInit, signal, WritableSignal, computed, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserApisService } from '../../users/services/user-apis.service';
import { User, UserFormInput, UserRole } from '../../../core/interfaces/user.interface';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { SearchInputComponent } from '../../../core/components/search-input/search-input.component';
import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { ConfirmDialogComponent } from '../../../core/components/confirm-dialog/confirm-dialog.component';
import { UserFormModalComponent } from '../../users/components/user-form-modal/user-form-modal.component';
import { ModalComponent } from '../../../core/components/modal/modal.component';
import { UserPermissionsModalComponent } from '../components/user-permissions-modal/user-permissions-modal.component';
import { ToastService } from '../../../core/services/toast.service';

const ADMIN_ROLES: string[] = ['OPERATIONS_MANAGER', 'EXTERNAL_TECHNICIAN'];

@Component({
  selector: 'app-manage-users',
  standalone: true,
  imports: [
    CommonModule,
    PageHeaderComponent,
    SearchInputComponent,
    EmptyStateComponent,
    ConfirmDialogComponent,
    UserFormModalComponent,
    ModalComponent,
    UserPermissionsModalComponent
  ],
  templateUrl: './manage-users.component.html'
})
export class ManageUsersComponent implements OnInit {
  private readonly userApisService = inject(UserApisService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly users: WritableSignal<User[]> = signal<User[]>([]);
  protected readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly searchQuery: WritableSignal<string> = signal<string>('');

  protected readonly activeMenuUserId: WritableSignal<string | null> = signal<string | null>(null);

  protected readonly isFormModalOpen: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly formModalMode: WritableSignal<'create' | 'edit'> = signal<'create' | 'edit'>('create');
  protected readonly selectedUserForForm: WritableSignal<User | null> = signal<User | null>(null);

  protected readonly pendingDeleteUser: WritableSignal<User | null> = signal<User | null>(null);

  // View detail
  protected readonly selectedUserForView: WritableSignal<User | null> = signal<User | null>(null);
  protected readonly isViewModalOpen: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly showViewPassword: WritableSignal<boolean> = signal<boolean>(false);

  // Permission management
  protected readonly selectedUserForPermissions: WritableSignal<User | null> = signal<User | null>(null);
  protected readonly isPermissionsModalOpen: WritableSignal<boolean> = signal<boolean>(false);

  // Local password store (email -> password)
  private readonly passwordStore = new Map<string, string>();
  private pendingPlainPassword: { email: string; password: string } | null = null;

  protected readonly filteredUsers: Signal<User[]> = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();

    return this.users().filter((user) => {
      const name = (user.fullName || `${user.firstName} ${user.lastName}`).toLowerCase();
      const email = user.email.toLowerCase();

      return !query || name.includes(query) || email.includes(query);
    });
  });

  protected readonly totalFilteredCount: Signal<number> = computed(() => this.filteredUsers().length);

  public ngOnInit(): void {
    this.loadUsers();
  }

  private normalizeUser(raw: any): User {
    const fName = raw.firstName || raw.first_name || '';
    const lName = raw.lastName || raw.last_name || '';
    const fullName = raw.fullName || raw.full_name || `${fName} ${lName}`.trim() || raw.email;
    const initials =
      raw.avatarInitials ||
      raw.avatar_initials ||
      fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ||
      'U';
    const isActive = raw.isActive !== undefined ? Boolean(raw.isActive) : Boolean(raw.is_active);
    const roleRaw = (raw.role || '').toString().toUpperCase().replace(/\s+/g, '_');

    return {
      ...raw,
      id: String(raw.id),
      email: raw.email || '',
      firstName: fName,
      lastName: lName,
      fullName,
      role: roleRaw,
      isActive,
      department: raw.department || '',
      location: raw.location || '',
      avatarInitials: initials,
      createdAt: raw.createdAt || raw.created_at || ''
    };
  }

  private loadUsers(): void {
    this.loading.set(true);
    this.userApisService.getUsers({ page_size: 100, scope: 'admin' }).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res?.results ?? []);
        const normalizedList = data
          .map((u: any) => this.normalizeUser(u))
          .filter((u: User) => ADMIN_ROLES.includes((u.role || '').toString().toUpperCase()));

        // If a new user was just created, save password by email
        if (this.pendingPlainPassword) {
          this.passwordStore.set(this.pendingPlainPassword.email, this.pendingPlainPassword.password);
          this.pendingPlainPassword = null;
        }

        // Attach stored passwords to users
        const withPasswords = normalizedList.map((u: User) => ({
          ...u,
          plainPassword: this.passwordStore.get(u.email) || undefined
        }));

        this.users.set(withPasswords);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        console.error('Failed to load users.', err);
        this.toastService.presentToast('Failed to load users.', 2500, 'error');
        this.loading.set(false);
      }
    });
  }

  @HostListener('document:click')
  protected onDocumentClick(): void {
    this.closeActionMenu();
  }

  protected toggleActionMenu(event: MouseEvent, userId: string): void {
    event.stopPropagation();
    this.activeMenuUserId.set(this.activeMenuUserId() === userId ? null : userId);
  }

  protected closeActionMenu(): void {
    this.activeMenuUserId.set(null);
  }

  protected clearFilters(): void {
    this.searchQuery.set('');
  }

  protected onAddUser(): void {
    this.formModalMode.set('create');
    this.selectedUserForForm.set(null);
    this.isFormModalOpen.set(true);
  }

  protected onEditUser(user: User): void {
    this.formModalMode.set('edit');
    this.selectedUserForForm.set(user);
    this.isFormModalOpen.set(true);
    this.closeActionMenu();
  }

  protected onViewUser(user: User): void {
    this.selectedUserForView.set(user);
    this.showViewPassword.set(false);
    this.isViewModalOpen.set(true);
  }

  protected onViewModalClose(): void {
    this.isViewModalOpen.set(false);
    this.selectedUserForView.set(null);
  }

  protected onFormClose(): void {
    this.isFormModalOpen.set(false);
  }

  protected onFormSave(formInput: UserFormInput): void {
    const parts = formInput.fullName.trim().split(' ');
    const fName = parts[0] || '';
    const lName = parts.slice(1).join(' ') || '';

    const payload: Record<string, any> = {
      email: formInput.email.trim(),
      first_name: fName,
      last_name: lName,
      role: (formInput.role || 'operations_manager').toString().toLowerCase(),
      department: formInput.department || '',
      location: formInput.location || ''
    };

    if (this.formModalMode() === 'create') {
      payload['password'] = formInput.password;

      this.userApisService.createUser(payload).subscribe({
        next: () => {
          this.isFormModalOpen.set(false);
          this.toastService.presentToast(`User ${formInput.fullName} created successfully!`, 2000, 'success');
          // Store password locally keyed by email
          this.pendingPlainPassword = { email: formInput.email.trim(), password: formInput.password || '' };
          this.loadUsers();
        },
        error: (err: unknown) => {
          console.error('Failed to create user.', err);
          this.toastService.presentToast('Failed to create user. Please check the details and try again.', 2500, 'error');
        }
      });
    } else {
      const current = this.selectedUserForForm();
      if (!current) return;

      payload['is_active'] = formInput.status === 'ACTIVE' || formInput.status === true;

      this.userApisService.updateUser(current.id, payload).subscribe({
        next: () => {
          this.isFormModalOpen.set(false);
          this.toastService.presentToast(`User ${formInput.fullName} updated successfully!`, 2000, 'success');
          this.loadUsers();
        },
        error: (err: unknown) => {
          console.error('Failed to update user.', err);
          this.toastService.presentToast('Failed to update user. Please try again.', 2500, 'error');
        }
      });
    }
  }

  protected onToggleStatus(user: User): void {
    this.closeActionMenu();
    const payload = {
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      role: (user.role || 'operations_manager').toString().toLowerCase(),
      is_active: !user.isActive
    };

    this.userApisService.toggleUserStatus(user.id, payload).subscribe({
      next: () => {
        const nextState = !user.isActive ? 'activated' : 'deactivated';
        this.toastService.presentToast(`User ${user.fullName || user.email} ${nextState}.`, 2000, 'success');
        this.loadUsers();
      },
      error: (err: unknown) => {
        console.error('Failed to toggle user status.', err);
        this.toastService.presentToast('Failed to update user status.', 2500, 'error');
      }
    });
  }

  protected onDeleteUser(user: User): void {
    this.pendingDeleteUser.set(user);
    this.closeActionMenu();
  }

  protected onConfirmDeleteUser(): void {
    const user = this.pendingDeleteUser();
    if (!user) return;

    this.userApisService.deleteUser(user.id).subscribe({
      next: () => {
        this.toastService.presentToast(`User ${user.fullName || user.email} deleted successfully.`, 2000, 'success');
        this.pendingDeleteUser.set(null);
        this.loadUsers();
      },
      error: (err: unknown) => {
        console.error('Failed to delete user.', err);
        this.toastService.presentToast('Failed to delete user.', 2000, 'error');
        this.pendingDeleteUser.set(null);
      }
    });
  }

  protected onCancelDeleteUser(): void {
    this.pendingDeleteUser.set(null);
  }

  protected getRoleDisplayName(role: UserRole | string | undefined): string {
    if (!role) return 'Operations Manager';
    const r = role.toUpperCase().replace(/\s+/g, '_');
    if (r === 'SYSTEM_ADMIN' || r === 'SUPER_ADMIN' || r === 'ADMIN') {
      return 'System Administrator';
    }
    if (r === 'OPERATIONS_MANAGER' || r === 'MANAGER') {
      return 'Operations Manager';
    }
    if (r === 'EXTERNAL_TECHNICIAN' || r === 'TECHNICIAN') {
      return 'External Technician';
    }
    return role;
  }

  protected getRoleBadgeClass(role: UserRole | string | undefined): string {
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

  protected onManagePermissions(user: User): void {
    this.selectedUserForPermissions.set(user);
    this.isPermissionsModalOpen.set(true);
    this.closeActionMenu();
  }

  protected onPermissionsModalClose(): void {
    this.isPermissionsModalOpen.set(false);
    this.selectedUserForPermissions.set(null);
  }

  protected onPermissionsSaved(perms: string[]): void {
    this.loadUsers();
  }
}