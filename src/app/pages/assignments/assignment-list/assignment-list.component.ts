import { Component, HostListener, inject, signal, WritableSignal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AssignmentService } from '../services/assignment.service';
import { AssignmentApisService } from '../services/assignment-apis.service';
import { AuthApisService } from '../../../core/services/api/auth-apis.service';
import { Assignment } from '../../../core/interfaces/assignment.interface';
import { StatusBadgeComponent } from '../../../core/components/status-badge/status-badge.component';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { SearchInputComponent } from '../../../core/components/search-input/search-input.component';
import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { ConfirmDialogComponent } from '../../../core/components/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../core/services/toast.service';
import { PaginatedResponse } from '../../../core/interfaces/api-response.interface';

import { SelectComponent } from '../../../core/components/select/select.component';

@Component({
  selector: 'app-assignment-list',
  standalone: true,
  imports: [
    CommonModule,
    StatusBadgeComponent,
    PageHeaderComponent,
    SearchInputComponent,
    EmptyStateComponent,
    ConfirmDialogComponent,
    SelectComponent,
  ],
  templateUrl: './assignment-list.component.html'
})
export class AssignmentListComponent implements OnInit {
  private readonly router               = inject(Router);
  private readonly toastService         = inject(ToastService);
  private readonly authApisService      = inject(AuthApisService);
  private readonly assignmentApisService = inject(AssignmentApisService);
  protected readonly assignmentService  = inject(AssignmentService);

  protected readonly activeMenuId: WritableSignal<string | null>       = signal<string | null>(null);
  protected readonly pendingDeleteAssignment: WritableSignal<Assignment | null> = signal<Assignment | null>(null);
  protected readonly pendingReturnAssignment: WritableSignal<Assignment | null> = signal<Assignment | null>(null);
  protected readonly isExporting: WritableSignal<boolean> = signal<boolean>(false);

  // Role permissions
  protected readonly userRole = computed(() => {
    const raw = this.authApisService.currentUser()?.role || localStorage.getItem('role') || 'EMPLOYEE';
    return raw.toUpperCase().replace(/\s+/g, '_');
  });

  protected readonly canManageAssignments = computed(() => {
    const role = this.userRole();
    return ['SYSTEM_ADMIN', 'ADMIN', 'OPERATIONS_MANAGER', 'MANAGER'].includes(role);
  });

  public ngOnInit(): void {
    this.assignmentService.loadAssignmentsFromApi().subscribe();
  }

  @HostListener('document:click')
  protected onDocumentClick(): void {
    this.activeMenuId.set(null);
  }

  protected toggleMenu(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.activeMenuId.set(this.activeMenuId() === id ? null : id);
  }

  protected closeMenu(): void {
    this.activeMenuId.set(null);
  }

  protected clearFilters(): void {
    this.assignmentService.setSearchQuery('');
    this.assignmentService.setStatusFilter('All');
    this.assignmentService.setDepartmentFilter('');
    this.assignmentService.setLocationFilter('');
  }

  protected onViewAssignment(assignment: Assignment): void {
    this.router.navigate(['/assignments', assignment.id]);
  }

  protected onNewAssignment(): void {
    this.router.navigate(['/assignments/create']);
  }

  protected onTransferAssignment(assignment: Assignment): void {
    this.closeMenu();
    this.router.navigate(['/assignments', assignment.id, 'edit']);
  }

  protected onReturnAssignment(assignment: Assignment): void {
    this.closeMenu();
    this.pendingReturnAssignment.set(assignment);
  }

  protected onConfirmReturn(): void {
    const assignment = this.pendingReturnAssignment();
    if (assignment) {
      this.assignmentService.returnAssignment(assignment.id).subscribe({
        next: () => {
          this.toastService.presentToast(`Asset "${assignment.assetName}" returned successfully.`, 2000, 'success');
          this.pendingReturnAssignment.set(null);
        },
        error: (err) => {
          this.toastService.presentToast(`Failed to return asset.`, 2000, 'error');
          this.pendingReturnAssignment.set(null);
        }
      });
    }
  }

  protected onCancelReturn(): void {
    this.pendingReturnAssignment.set(null);
  }

  protected onDelete(assignment: Assignment): void {
    this.closeMenu();
    this.pendingDeleteAssignment.set(assignment);
  }

  protected onConfirmDelete(): void {
    const assignment = this.pendingDeleteAssignment();
    if (assignment) {
      this.assignmentService.deleteAssignment(assignment.id).subscribe({
        next: () => {
          this.toastService.presentToast(`Assignment deleted.`, 2000, 'success');
          this.pendingDeleteAssignment.set(null);
        },
        error: () => {
          this.toastService.presentToast(`Failed to delete assignment.`, 2000, 'error');
          this.pendingDeleteAssignment.set(null);
        }
      });
    }
  }

  protected onCancelDelete(): void {
    this.pendingDeleteAssignment.set(null);
  }

  protected readonly statusOptions = [
    { label: 'Status: All', value: 'All' },
    { label: 'Active', value: 'Active' },
    { label: 'Returned', value: 'Returned' },
  ];

  protected readonly departmentOptions = [
    { label: 'Department: All', value: '' },
    { label: 'Engineering', value: 'Engineering' },
    { label: 'Design', value: 'Design' },
    { label: 'Sales', value: 'Sales' },
    { label: 'Operations', value: 'Operations' },
    { label: 'Finance', value: 'Finance' },
    { label: 'Marketing', value: 'Marketing' },
    { label: 'Product', value: 'Product' },
    { label: 'IT', value: 'IT' },
  ];

  protected onStatusSelect(val: string | number): void {
    this.assignmentService.setStatusFilter(String(val || 'All'));
  }

  protected onDepartmentSelect(val: string | number): void {
    this.assignmentService.setDepartmentFilter(String(val || ''));
  }

  protected onStatusFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.assignmentService.setStatusFilter(val);
  }

  protected onDepartmentChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.assignmentService.setDepartmentFilter(val);
  }

  protected onLocationChange(event: Event): void {
    this.assignmentService.setLocationFilter((event.target as HTMLSelectElement).value);
  }

  protected onExportData(): void {
    if (this.isExporting()) return;
    this.isExporting.set(true);
    this.toastService.presentToast('Preparing export...', 1500, 'success');

    this.assignmentApisService.getAssignments({ page_size: 9999 }).subscribe({
      next: (response) => {
        const allRaw: any[] = Array.isArray(response)
          ? response
          : (response as PaginatedResponse<Assignment>).results ?? [];
        const combined = allRaw.map(r => this.assignmentService.normalizeAssignment(r));

        this.buildAndDownloadCsv(combined);
        this.isExporting.set(false);
        this.toastService.presentToast(
          `Exported ${combined.length} assignment(s) successfully.`, 2000, 'success'
        );
      },
      error: (err: unknown) => {
        console.warn('[Export] Backend fetch failed, exporting loaded list.', err);
        const local = this.assignmentService.assignments();
        this.buildAndDownloadCsv(local);
        this.isExporting.set(false);
      }
    });
  }

  private buildAndDownloadCsv(assignments: Assignment[]): void {
    const header = [
      'Asset ID', 'Asset Name', 'Brand', 'Model', 'Serial Number', 'Employee Name', 'Employee ID',
      'Department', 'Location', 'Assigned Date', 'Expected Return', 'Returned Date', 'Status', 'Notes'
    ];

    const rows = assignments.map(a => [
      a.assetId || '',
      a.assetName,
      a.brand || '',
      a.model || '',
      a.serialNumber,
      a.employeeName,
      a.employeeId,
      a.department,
      a.location ?? 'HQ',
      a.assignedDate,
      a.expectedReturnDate ?? '',
      a.returnedDate ?? '',
      a.status,
      a.notes ?? ''
    ]);

    const csv  = [header, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `assignment-history-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  protected getDateDisplay(assignment: Assignment): string {
    if (assignment.status === 'Returned' && assignment.returnedDate) {
      return `${assignment.assignedDate} → ${assignment.returnedDate}`;
    }
    if (assignment.expectedReturnDate) {
      return `${assignment.assignedDate} → ${assignment.expectedReturnDate}`;
    }
    return assignment.assignedDate;
  }
}

