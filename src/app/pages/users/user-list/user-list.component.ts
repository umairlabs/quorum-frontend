import { Component, DestroyRef, HostListener, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '../services/user.service';
import { User, UserFormInput, UserRole } from '../../../core/interfaces/user.interface';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { SearchInputComponent } from '../../../core/components/search-input/search-input.component';
import { StatusBadgeComponent } from '../../../core/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { ConfirmDialogComponent } from '../../../core/components/confirm-dialog/confirm-dialog.component';
import { EmployeeFormModalComponent, EmployeeFormInput } from '../components/employee-form-modal/employee-form-modal.component';
import { UserDetailModalComponent } from '../components/user-detail-modal/user-detail-modal.component';
import { ToastService } from '../../../core/services/toast.service';
import { LayoutService } from '../../../core/services/layout.service';
import { BreadcrumbService } from '../../../core/services/breadcrumb.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    PageHeaderComponent,
    SearchInputComponent,
    EmptyStateComponent,
    ConfirmDialogComponent,
    EmployeeFormModalComponent,
    UserDetailModalComponent
  ],
  templateUrl: './user-list.component.html'
})
export class UserListComponent implements OnInit {
  protected readonly userService = inject(UserService);
  private readonly toastService = inject(ToastService);
  private readonly layoutService = inject(LayoutService);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly activeMenuUserId: WritableSignal<string | null> = signal<string | null>(null);
  protected readonly isFormModalOpen: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly formModalMode: WritableSignal<'create' | 'edit'> = signal<'create' | 'edit'>('create');
  protected readonly selectedUserForForm: WritableSignal<User | null> = signal<User | null>(null);

  protected readonly isDetailModalOpen: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly selectedUserForDetail: WritableSignal<User | null> = signal<User | null>(null);

  protected readonly pendingDeleteUser: WritableSignal<User | null> = signal<User | null>(null);

  public ngOnInit(): void {
    this.userService.loadUsersFromApi();

    this.layoutService.navItemClicked$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.closeAllModals();
      });
  }

  private closeAllModals(): void {
    this.isFormModalOpen.set(false);
    this.isDetailModalOpen.set(false);
    this.pendingDeleteUser.set(null);
    this.closeActionMenu();
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
    this.userService.setSearchQuery('');
    this.userService.setRoleFilter('');
    this.userService.setStatusFilter('');
  }

  protected onAddEmployee(): void {
    this.formModalMode.set('create');
    this.selectedUserForForm.set(null);
    this.isFormModalOpen.set(true);
    this.breadcrumbService.setOverride({
      showBackArrow: false,
      items: [
        { label: 'AssetFlow' },
        { label: 'Employees', url: '/users' },
        { label: 'Add New Employee', isLast: true }
      ]
    });
  }

  protected onEditUser(user: User): void {
    this.formModalMode.set('edit');
    this.selectedUserForForm.set(user);
    this.isFormModalOpen.set(true);
    this.closeActionMenu();
    const name = user.fullName || `${user.firstName} ${user.lastName}`.trim();
    this.breadcrumbService.setOverride({
      showBackArrow: false,
      items: [
        { label: 'AssetFlow' },
        { label: 'Employees', url: '/users' },
        { label: `Edit — ${name}`, isLast: true }
      ]
    });
  }

  protected onViewUser(user: User): void {
    this.selectedUserForDetail.set(user);
    this.isDetailModalOpen.set(true);
    this.closeActionMenu();
    const name = user.fullName || `${user.firstName} ${user.lastName}`.trim();
    this.breadcrumbService.setOverride({
      showBackArrow: false,
      items: [
        { label: 'AssetFlow' },
        { label: 'Employees', url: '/users' },
        { label: name, isLast: true }
      ]
    });
  }

  protected onFormModalClose(): void {
    this.isFormModalOpen.set(false);
    this.breadcrumbService.clearOverride();
  }

  protected onFormModalSave(formInput: EmployeeFormInput): void {
    const current = this.selectedUserForForm();
    const isEdit = this.formModalMode() === 'edit';

    // Convert EmployeeFormInput to UserFormInput for backend compatibility
    const userFormInput: UserFormInput = {
      fullName: formInput.fullName,
      firstName: formInput.fullName.split(' ')[0] || '',
      lastName: formInput.fullName.split(' ').slice(1).join(' ') || '',
      email: formInput.email.trim(),
      phoneNumber: formInput.phoneNumber,
      department: formInput.department,
      joiningDate: formInput.joiningDate ? formInput.joiningDate.slice(0, 10) : undefined,
      role: isEdit && current?.role ? current.role : 'EMPLOYEE',
      status: isEdit && current !== null ? (current.isActive ? 'ACTIVE' : 'INACTIVE') : 'ACTIVE',
      password: formInput.password
    };

    if (!isEdit) {
      this.userService.createUser(userFormInput).subscribe({
        next: () => {
          this.isFormModalOpen.set(false);
          this.breadcrumbService.clearOverride();
          this.toastService.presentToast(`Employee ${formInput.fullName} added successfully!`, 2000, 'success');
        },
        error: (err: unknown) => {
          console.error('Failed to create employee.', err);
          this.toastService.presentToast('Failed to add employee. Please check the details and try again.', 2500, 'error');
        }
      });
    } else {
      if (!current) return;

      this.userService.updateUser(current.id, userFormInput).subscribe({
        next: () => {
          this.isFormModalOpen.set(false);
          this.breadcrumbService.clearOverride();
          this.toastService.presentToast(`Employee ${formInput.fullName} updated successfully!`, 2000, 'success');
        },
        error: (err: unknown) => {
          console.error('Failed to update employee.', err);
          this.toastService.presentToast('Failed to update employee. Please try again.', 2500, 'error');
        }
      });
    }
  }

  protected onDetailModalClose(): void {
    this.isDetailModalOpen.set(false);
    this.breadcrumbService.clearOverride();
  }

  protected onDetailModalEdit(user: User): void {
    this.isDetailModalOpen.set(false);
    this.onEditUser(user);
  }

  protected onToggleStatus(user: User): void {
    this.closeActionMenu();
    this.userService.toggleUserStatus(user.id).subscribe({
      next: () => {
        const nextState = !user.isActive ? 'activated' : 'deactivated';
        this.toastService.presentToast(`User ${user.fullName || user.email} ${nextState}.`, 2000, 'success');
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

    this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.toastService.presentToast(`User ${user.fullName || user.email} deleted successfully.`, 2000, 'success');
        this.pendingDeleteUser.set(null);
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

  protected onRoleChange(event: Event): void {
    this.userService.setRoleFilter((event.target as HTMLSelectElement).value);
  }

  protected onStatusChange(event: Event): void {
    this.userService.setStatusFilter((event.target as HTMLSelectElement).value);
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
}