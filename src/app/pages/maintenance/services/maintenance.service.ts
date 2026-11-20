import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  MaintenanceRequest,
  MaintenanceStatus,
  MaintenanceStats,
  CreateMaintenanceRequest,
  UpdateMaintenanceStatusPayload,
  MaintenanceWorkUpdatePayload,
} from '../../../core/interfaces/maintenance.interface';
import { MaintenanceApisService } from './maintenance-apis.service';
import { NotificationService } from '../../notifications/services/notification.service';
import { getAssetIcon } from '../../../core/utils/asset-icon.util';

@Injectable({
  providedIn: 'root',
})
export class MaintenanceService {
  private readonly dataService: MaintenanceApisService = inject(MaintenanceApisService);
  private readonly notificationService: NotificationService = inject(NotificationService);

  // ─── State ────────────────────────────────────────────────────────────────
  public readonly requests: WritableSignal<MaintenanceRequest[]> = signal<MaintenanceRequest[]>([]);
  public readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  public readonly errorMessage: WritableSignal<string | null> = signal<string | null>(null);
  public readonly stats: WritableSignal<MaintenanceStats> = signal<MaintenanceStats>({
    total: 0, pending: 0, inProgress: 0, completed: 0,
  });

  // ─── Filters ──────────────────────────────────────────────────────────────
  public readonly searchQuery: WritableSignal<string> = signal<string>('');
  public readonly selectedStatus: WritableSignal<string> = signal<string>('');
  public readonly selectedPriority: WritableSignal<string> = signal<string>('');
  public readonly selectedType: WritableSignal<string> = signal<string>('');
  public readonly currentPage: WritableSignal<number> = signal<number>(1);
  public readonly pageSize: WritableSignal<number> = signal<number>(5);

  // ─── Computed ─────────────────────────────────────────────────────────────
  public readonly filteredRequests: Signal<MaintenanceRequest[]> = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.selectedStatus().toUpperCase();
    const priority = this.selectedPriority().toUpperCase();
    const type = this.selectedType().toUpperCase();

    return this.requests().filter((r) => {
      const matchesQuery =
        !query ||
        r.requestId.toLowerCase().includes(query) ||
        r.serialNumber.toLowerCase().includes(query) ||
        r.assetName.toLowerCase().includes(query);

      const matchesStatus   = !status   || r.status        === status;
      const matchesPriority = !priority || r.priority      === priority;
      const matchesType     = !type     || r.maintenanceType === type;

      return matchesQuery && matchesStatus && matchesPriority && matchesType;
    });
  });

  public readonly totalFilteredCount: Signal<number> = computed(() => this.filteredRequests().length);

  public readonly totalPages: Signal<number> = computed(() =>
    Math.ceil(this.totalFilteredCount() / this.pageSize()) || 1
  );

  public readonly paginatedRequests: Signal<MaintenanceRequest[]> = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredRequests().slice(start, start + this.pageSize());
  });

  // Stats computed from loaded requests (no extra API call needed for employee view)
  public readonly computedStats: Signal<MaintenanceStats> = computed(() => {
    const all = this.requests();
    return {
      total:      all.length,
      pending:    all.filter((r) => r.status === 'PENDING').length,
      inProgress: all.filter((r) => r.status === 'IN_PROGRESS').length,
      completed:  all.filter((r) =>
        r.status === 'COMPLETED' || r.status === 'VERIFIED' || r.status === 'RESOLVED'
      ).length,
    };
  });

  public getStatusLabel(status: MaintenanceStatus): string {
    const labels: Record<MaintenanceStatus, string> = {
      PENDING:        'Request Pending',
      TODO:           'Work To Do',
      IN_PROGRESS:    'Work In Progress',
      REVIEW:         'Under Review',
      COMPLETED:      'Work Completed',
      RESOLVED:       'Work Resolved',
      VERIFIED:       'Quality Verified',
      CANCELLED:      'Request Cancelled',
      UNREPAIRABLE:   'Not Repairable',
      NOT_REPAIRABLE: 'Not Repairable',
    };
    return labels[status] ?? status;
  }

  // ─── Load ─────────────────────────────────────────────────────────────────
  public loadRequestsFromApi(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.dataService.getMaintenanceRequests({ page_size: 200 }).subscribe({
      next: (res: any) => {
        const apiData: MaintenanceRequest[] = Array.isArray(res) ? res : (res?.results ?? []);
        const enriched = apiData.map(r => {
          const raw = r as any;
          const displayId = raw.displayId ?? raw.display_id ?? undefined;
          const rawId = String(raw.id ?? '');
          const requestId = displayId ?? raw.requestId ?? raw.request_id ?? (rawId ? 'MNT-' + rawId.replace(/-/g, '').slice(0, 6).toUpperCase() : '');
          return {
            ...r,
            displayId,
            requestId: r.requestId || requestId,
            assetIcon: r.assetIcon || getAssetIcon(raw.iconKey || r.assetName || ''),
          };
        });
        this.requests.set(enriched);
        this.stats.set(this.computedStats());
        this.loading.set(false);
      },
      error: (err: unknown) => {
        console.error('Failed to load maintenance requests from API.', err);
        this.errorMessage.set('Maintenance requests could not be loaded. Please check the backend.');
        this.loading.set(false);
      },
    });
  }

  // ─── Filter Actions ───────────────────────────────────────────────────────
  public setSearchQuery(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  public setStatusFilter(status: string): void {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
  }

  public setPriorityFilter(priority: string): void {
    this.selectedPriority.set(priority);
    this.currentPage.set(1);
  }

  public setTypeFilter(type: string): void {
    this.selectedType.set(type);
    this.currentPage.set(1);
  }

  public setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  public clearFilters(): void {
    this.searchQuery.set('');
    this.selectedStatus.set('');
    this.selectedPriority.set('');
    this.selectedType.set('');
    this.currentPage.set(1);
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────
  public createRequest(payload: CreateMaintenanceRequest): Observable<MaintenanceRequest> {
    return this.dataService.createMaintenanceRequest(payload).pipe(
      tap((res) => {
        if (res && res.id) {
          this.requests.update(curr => [res, ...curr.filter(r => r.id !== res.id)]);
          this.stats.set(this.computedStats());
        }
        this.notificationService.checkNow(true);
      })
    );
  }

  public generateIssueWithAI(prompt: string): Observable<{ title: string; description: string; priority: string }> {
    return this.dataService.generateIssueWithAI(prompt);
  }

  public updateRequest(id: string, payload: Partial<CreateMaintenanceRequest>): Observable<MaintenanceRequest> {
    return this.dataService.updateMaintenanceRequest(id, payload).pipe(
      tap((res) => {
        if (res) {
          this.requests.update(curr => curr.map(r => r.id === id ? { ...r, ...res } : r));
        }
      })
    );
  }

  public updateStatus(id: string, payload: UpdateMaintenanceStatusPayload): Observable<MaintenanceRequest> {
    const req = this.getRequestById(id);

    return this.dataService.updateMaintenanceStatus(id, payload).pipe(
      tap((res) => {
        if (res) {
          this.requests.update(curr =>
            curr.map(r => (r.id === id || r.requestId === id) ? { ...r, ...res } : r)
          );
          this.stats.set(this.computedStats());
        }
        if (req?.assetId) { void req.assetId; }
        this.notificationService.checkNow(true);
      })
    );
  }

  public submitWorkUpdate(id: string, payload: MaintenanceWorkUpdatePayload): Observable<MaintenanceRequest> {
    const req = this.getRequestById(id);
    const nowStr = new Date().toISOString();

    return this.dataService.submitWorkUpdate(id, payload).pipe(
      tap((res) => {
        const updatedStatus = payload.status as MaintenanceStatus;
        const updatedReq: MaintenanceRequest = {
          ...(req ?? res),
          ...res,
          status:          updatedStatus,
          workDone:        payload.workDone,
          findings:        payload.workDone,
          technicianNotes: payload.technicianNotes,
          updatedAt:       nowStr,
        };

        if (updatedStatus === 'RESOLVED' || updatedStatus === 'COMPLETED') {
          updatedReq.resolvedAt  = nowStr;
          updatedReq.resolvedBy  = payload.technicianName;
          updatedReq.completedAt = nowStr;
        }

        const timeline = updatedReq.timeline ? [...updatedReq.timeline] : [];
        timeline.push({
          id:          'tl-' + Date.now(),
          status:      updatedStatus,
          label:       this.getStatusLabel(updatedStatus),
          timestamp:   nowStr,
          note:        payload.technicianNotes,
          workDone:    payload.workDone,
          completedBy: payload.technicianName || 'Technician',
        });
        updatedReq.timeline = timeline;

        this.requests.update(curr =>
          curr.map(r => (r.id === id || r.requestId === id) ? updatedReq : r)
        );
        this.stats.set(this.computedStats());
        this.notificationService.checkNow(true);
      })
    );
  }

  public deleteRequest(id: string): Observable<void> {
    return this.dataService.deleteMaintenanceRequest(id).pipe(
      tap(() => {
        this.requests.update(curr => curr.filter(r => r.id !== id));
        this.stats.set(this.computedStats());
      })
    );
  }

  public getRequestById(id: string): MaintenanceRequest | undefined {
    return this.requests().find((r) => r.id === id || r.requestId === id);
  }

  public getRequestsByAssetId(assetId: string): MaintenanceRequest[] {
    return this.requests().filter(r => r.assetId === assetId || r.serialNumber === assetId);
  }

  // ─── Workflow Helpers ─────────────────────────────────────────────────────
  public getAllowedNextStatuses(current: MaintenanceStatus): MaintenanceStatus[] {
    const transitions: Record<MaintenanceStatus, MaintenanceStatus[]> = {
      PENDING:        ['TODO', 'IN_PROGRESS', 'CANCELLED'],
      TODO:           ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS:    ['REVIEW', 'CANCELLED'],
      REVIEW:         ['COMPLETED', 'CANCELLED'],
      COMPLETED:      ['VERIFIED'],
      RESOLVED:       [],
      VERIFIED:       [],
      CANCELLED:      [],
      UNREPAIRABLE:   [],
      NOT_REPAIRABLE: [],
    };
    return transitions[current] ?? [];
  }
}
