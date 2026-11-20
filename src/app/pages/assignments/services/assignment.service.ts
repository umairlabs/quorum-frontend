import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Assignment, AssignmentCreatePayload, AssignmentStatus, AssignmentTransferPayload } from '../../../core/interfaces/assignment.interface';
import { AssignmentApisService } from './assignment-apis.service';
import { getCategoryIcon, getAssetIconFromObject } from '../../../core/utils/asset-icon.util';
import { PaginatedResponse } from '../../../core/interfaces/api-response.interface';
import { NotificationService } from '../../notifications/services/notification.service';

@Injectable({
  providedIn: 'root'
})
export class AssignmentService {
  private readonly assignmentApisService = inject(AssignmentApisService);
  private readonly notificationService = inject(NotificationService);

  // State Signals
  public readonly assignmentsList: WritableSignal<Assignment[]> = signal<Assignment[]>([]);
  public readonly isLoading: WritableSignal<boolean> = signal<boolean>(false);
  public readonly error: WritableSignal<string | null> = signal<string | null>(null);

  // Filters
  public readonly searchQuery: WritableSignal<string> = signal<string>('');
  public readonly statusFilter: WritableSignal<string> = signal<string>('All');
  public readonly selectedDepartment: WritableSignal<string> = signal<string>('');
  public readonly selectedLocation: WritableSignal<string> = signal<string>('');
  public readonly currentPage: WritableSignal<number> = signal<number>(1);
  public readonly pageSize: WritableSignal<number> = signal<number>(10);

  public normalizeAssignment(raw: any): Assignment {
    const displayId = raw.displayId ?? raw.display_id ?? undefined;
    const rawAssetId = raw.assetId ?? (raw.unit?.asset ? raw.unit.asset.display_id || raw.unit.asset.formatted_asset_id || ('AST-' + String(raw.unit.asset.id).substring(0, 6).toUpperCase()) : '');
    const serialNumber = raw.serialNumber ?? raw.serial_number ?? raw.unit?.serial_number ?? raw.unit_serial_snapshot ?? 'Not assigned yet';
    const empName = raw.employeeName ?? raw.employee_name ?? 'Assigned Employee';
    const initials = raw.employeeInitials ?? (empName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'AU');

    let status: AssignmentStatus = 'Assigned';
    if (raw.status === 'RETURNED' || raw.status === 'Returned') {
      status = 'Returned';
    } else if (raw.status === 'ACTIVE' || raw.status === 'Active' || raw.status === 'Assigned') {
      status = 'Assigned';
    }

    return {
      id: String(raw.id),
      displayId,
      unitId: raw.unitId ?? raw.unit_id ?? raw.unit?.id,
      assetId: rawAssetId,
      assetName: raw.assetName ?? raw.asset_name ?? raw.unit?.asset?.name ?? raw.asset_name_snapshot ?? 'Asset',
      brand: raw.brand ?? raw.unit?.asset?.brand ?? '',
      model: raw.model ?? raw.unit?.asset?.model ?? '',
      serialNumber,
      assetIcon: raw.iconKey
        ? raw.iconKey
        : getAssetIconFromObject({
            iconKey: raw.iconKey,
            name: raw.unit?.asset?.name ?? raw.assetName ?? raw.asset_name_snapshot ?? '',
            category: raw.unit?.asset?.category?.name ?? '',
            brand: raw.unit?.asset?.brand ?? raw.brand ?? '',
            model: raw.unit?.asset?.model ?? raw.model ?? '',
          }),
      employeeId: String(raw.employeeId ?? raw.employee_id ?? raw.user?.employeeId ?? raw.user?.employee_id ?? ''),
      employeeName: empName,
      employeeInitials: initials,
      department: raw.department ?? raw.user?.department ?? 'General',
      location: raw.location ?? raw.unit?.location ?? raw.user?.location ?? 'HQ',
      assignedDate: raw.assignedDate ?? raw.assigned_date ?? new Date().toISOString().split('T')[0],
      expectedReturnDate: raw.expectedReturnDate ?? raw.expected_return_date,
      returnedDate: raw.returnedDate ?? raw.returned_date,
      status,
      notes: raw.notes ?? ''
    };
  }

  public loadAssignmentsFromApi(params?: Record<string, unknown>): Observable<PaginatedResponse<Assignment> | Assignment[]> {
    this.isLoading.set(true);
    this.error.set(null);

    const queryParams: Record<string, unknown> = {
      page_size: 9999,
      ...params
    };

    if (this.searchQuery().trim()) {
      queryParams['search'] = this.searchQuery().trim();
    }
    if (this.statusFilter() && this.statusFilter() !== 'All') {
      queryParams['status'] = this.statusFilter();
    }
    if (this.selectedDepartment()) {
      queryParams['department'] = this.selectedDepartment();
    }

    return this.assignmentApisService.getAssignments(queryParams).pipe(
      tap({
        next: (res) => {
          const rawItems: any[] = Array.isArray(res)
            ? res
            : (res as PaginatedResponse<Assignment>).results ?? [];
          const normalized = rawItems.map(item => this.normalizeAssignment(item));
          this.assignmentsList.set(normalized);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Failed to fetch assignments from API:', err);
          this.error.set('Failed to load assignments from server.');
          this.isLoading.set(false);
        }
      })
    );
  }

  // Filtered & Paginated signals
  public readonly assignments: Signal<Assignment[]> = computed(() => this.assignmentsList());

  public readonly filteredAssignments: Signal<Assignment[]> = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const department = this.selectedDepartment().toLowerCase().trim();
    const status = this.statusFilter();
    const location = this.selectedLocation().toLowerCase().trim();

    return this.assignments().filter((a) => {
      const matchesQuery =
        !query ||
        a.assetName.toLowerCase().includes(query) ||
        a.serialNumber.toLowerCase().includes(query) ||
        (a.assetId || '').toLowerCase().includes(query) ||
        a.employeeName.toLowerCase().includes(query) ||
        a.employeeId.toLowerCase().includes(query) ||
        (a.brand || '').toLowerCase().includes(query) ||
        (a.model || '').toLowerCase().includes(query);

      const matchesDepartment = !department || a.department.toLowerCase().includes(department);
      const matchesLocation = !location || (a.location || '').toLowerCase().includes(location);

      let matchesStatus = true;
      if (status === 'Active' || status === 'Assigned') {
        matchesStatus = a.status === 'Assigned';
      } else if (status === 'Returned') {
        matchesStatus = a.status === 'Returned';
      }

      return matchesQuery && matchesDepartment && matchesLocation && matchesStatus;
    });
  });

  public readonly totalFilteredCount: Signal<number> = computed(() => this.filteredAssignments().length);

  public readonly totalPages: Signal<number> = computed(() =>
    Math.ceil(this.totalFilteredCount() / this.pageSize()) || 1
  );

  public readonly paginatedAssignments: Signal<Assignment[]> = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredAssignments().slice(start, start + this.pageSize());
  });

  // ─── Stats ───────────────────────────────────────────────────────────────
  public readonly totalActiveAssignments: Signal<number> = computed(() =>
    this.assignments().filter(a => a.status === 'Assigned').length
  );

  public readonly pendingReturns: Signal<number> = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.assignments().filter(a =>
      a.status === 'Assigned' && !!a.expectedReturnDate && a.expectedReturnDate <= today
    ).length;
  });

  public readonly returnedThisMonth: Signal<number> = computed(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `${year}-${month}`;
    return this.assignments().filter(a =>
      a.status === 'Returned' && (a.returnedDate ?? '').startsWith(prefix)
    ).length;
  });

  // Filter Modifiers
  public setSearchQuery(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  public setStatusFilter(status: string): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
  }

  public setDepartmentFilter(department: string): void {
    this.selectedDepartment.set(department);
    this.currentPage.set(1);
  }

  public setLocationFilter(location: string): void {
    this.selectedLocation.set(location);
    this.currentPage.set(1);
  }

  public setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  // API Actions
  public createAssignment(unitId: string, payload: AssignmentCreatePayload): Observable<Assignment> {
    const body = {
      unitId,
      assetId: payload.assetId ?? unitId, // ✅ ab payload se assetId aayega, unitId ke barabar force nahi hoga
      employeeId: payload.employeeId,
      employeeName: payload.employeeName,
      department: payload.department,
      location: payload.location,
      assignedDate: payload.assignedDate,
      expectedReturnDate: payload.expectedReturnDate,
      notes: payload.notes
    };

    return this.assignmentApisService.createAssignment(body).pipe(
      tap(() => {
        this.loadAssignmentsFromApi().subscribe();
        this.notificationService.checkNow(true);
      })
    );
  }

  public updateAssignment(id: string, payload: Partial<Assignment>): Observable<Assignment> {
    return this.assignmentApisService.updateAssignment(id, payload).pipe(
      tap(() => this.loadAssignmentsFromApi().subscribe())
    );
  }

  public transferAssignment(id: string, payload: AssignmentTransferPayload): Observable<Assignment> {
    return this.assignmentApisService.transferAssignment(id, payload).pipe(
      tap(() => {
        this.loadAssignmentsFromApi().subscribe();
        this.notificationService.checkNow(true);
      })
    );
  }

  public returnAssignment(id: string): Observable<Assignment> {
    return this.assignmentApisService.returnAssignment(id).pipe(
      tap(() => {
        this.loadAssignmentsFromApi().subscribe();
        this.notificationService.checkNow(true);
      })
    );
  }

  public deleteAssignment(id: string): Observable<void> {
    return this.assignmentApisService.deleteAssignment(id).pipe(
      tap(() => this.loadAssignmentsFromApi().subscribe())
    );
  }

  public getAssignmentById(id: string): Assignment | undefined {
    return this.assignments().find((a) => a.id === id);
  }
}