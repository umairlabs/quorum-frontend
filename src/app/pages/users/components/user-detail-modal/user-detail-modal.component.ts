import { Component, effect, inject, input, output, signal, WritableSignal, computed, Signal, InputSignal, OutputEmitterRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User, UserRole } from '../../../../core/interfaces/user.interface';
import { Assignment } from '../../../../core/interfaces/assignment.interface';
import { AssignmentApisService } from '../../../assignments/services/assignment-apis.service';
import { AssignmentService } from '../../../assignments/services/assignment.service';
import { PaginatedResponse } from '../../../../core/interfaces/api-response.interface';
import { ModalComponent } from '../../../../core/components/modal/modal.component';
import { StatusBadgeComponent } from '../../../../core/components/status-badge/status-badge.component';

@Component({
  selector: 'app-user-detail-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent, StatusBadgeComponent],
  templateUrl: './user-detail-modal.component.html'
})
export class UserDetailModalComponent {
  private readonly assignmentApis: AssignmentApisService = inject(AssignmentApisService);
  private readonly assignmentService: AssignmentService = inject(AssignmentService);

  public readonly isOpen: InputSignal<boolean> = input<boolean>(false);
  public readonly user: InputSignal<User | null> = input<User | null>(null);

  public readonly close: OutputEmitterRef<void> = output<void>();
  public readonly edit: OutputEmitterRef<User> = output<User>();

  protected readonly assignedAssets: WritableSignal<Assignment[]> = signal<Assignment[]>([]);
  protected readonly isLoadingAssets: WritableSignal<boolean> = signal<boolean>(false);

  protected readonly activeAssignmentsCount: Signal<number> = computed(() => {
    return this.assignedAssets().filter((a: Assignment) => a.status === 'Assigned' || a.status === 'Overdue').length;
  });

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const u = this.user();
      if (open && u) {
        this.fetchUserAssignments(u);
      } else {
        this.assignedAssets.set([]);
      }
    });
  }

  private fetchUserAssignments(user: User): void {
    this.isLoadingAssets.set(true);

    this.assignmentApis.getAssignments({ page_size: 1000 }).subscribe({
      next: (res: PaginatedResponse<Assignment> | Assignment[]) => {
        let rawItems: any[] = [];
        if (Array.isArray(res)) {
          rawItems = res;
        } else if (res && Array.isArray((res as PaginatedResponse<Assignment>).results)) {
          rawItems = (res as PaginatedResponse<Assignment>).results;
        }

        const normalizedList: Assignment[] = rawItems.map(item => this.assignmentService.normalizeAssignment(item));

        const userEmpId = (user.employeeId || '').toLowerCase().trim();
        const userId = String(user.id || '').toLowerCase().trim();
        const userName = (user.fullName || `${user.firstName || ''} ${user.lastName || ''}`).toLowerCase().trim();
        const userFirst = (user.firstName || '').toLowerCase().trim();
        const userEmailName = (user.email || '').split('@')[0].toLowerCase().trim();

        const matched = normalizedList.filter((a: Assignment) => {
          const aEmpId = (a.employeeId || '').toLowerCase().trim();
          const aName = (a.employeeName || '').toLowerCase().trim();

          const matchesEmpId = Boolean(userEmpId && aEmpId && (aEmpId === userEmpId || aEmpId.includes(userEmpId) || userEmpId.includes(aEmpId)));
          const matchesUserId = Boolean(userId && aEmpId && aEmpId === userId);
          const matchesName = Boolean(userName && aName && (aName === userName || aName.includes(userName) || userName.includes(aName)));
          const matchesFirst = Boolean(userFirst && aName && aName.includes(userFirst));
          const matchesEmail = Boolean(userEmailName && aName && (aName.includes(userEmailName) || userEmailName.includes(aName)));

          return matchesEmpId || matchesUserId || matchesName || matchesFirst || matchesEmail;
        });

        this.assignedAssets.set(matched);
        this.isLoadingAssets.set(false);
      },
      error: (err: unknown) => {
        console.error('[UserDetailModalComponent] Failed to load assignments:', err);
        this.assignedAssets.set([]);
        this.isLoadingAssets.set(false);
      }
    });
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

  protected getDisplayEmployeeId(user: User): string {
    if (user.employeeId && user.employeeId !== '—') return user.employeeId;
    const rawId = String(user.id || '');
    if (!rawId) return '—';
    if (!isNaN(Number(rawId))) {
      return `EMP-${String(rawId).padStart(3, '0')}`;
    }
    const clean = rawId.length > 8 ? rawId.slice(0, 6).toUpperCase() : rawId.toUpperCase();
    return clean.startsWith('EMP-') ? clean : `EMP-${clean}`;
  }

  protected onClose(): void {
    this.close.emit();
  }

  protected onEdit(): void {
    const u = this.user();
    if (u) {
      this.edit.emit(u);
    }
  }
}
