import { inject, Injectable, signal, WritableSignal, computed, Signal } from '@angular/core';
import { AuditLogsApiService } from './audit-logs-api.service';
import { AuditLog, AuditLogStats } from '../../../core/interfaces/audit-log.interface';
import { PaginatedResponse } from '../../../core/interfaces/api-response.interface';

@Injectable({
  providedIn: 'root'
})
export class AuditLogsService {
  private readonly apiService: AuditLogsApiService = inject(AuditLogsApiService);

  public readonly logs: WritableSignal<AuditLog[]> = signal<AuditLog[]>([]);
  public readonly stats: WritableSignal<AuditLogStats> = signal<AuditLogStats>({
    total: 0,
    assets: 0,
    assignments: 0,
    maintenance: 0
  });

  public readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  public readonly errorMessage: WritableSignal<string | null> = signal<string | null>(null);

  // Filters
  public readonly searchQuery: WritableSignal<string> = signal<string>('');
  public readonly selectedAction: WritableSignal<string> = signal<string>('ALL');
  public readonly selectedModule: WritableSignal<string> = signal<string>('ALL');
  public readonly currentPage: WritableSignal<number> = signal<number>(1);
  public readonly pageSize: WritableSignal<number> = signal<number>(15);
  public readonly totalCount: WritableSignal<number> = signal<number>(0);

  // Computeds
  public readonly totalPages: Signal<number> = computed<number>(() =>
    Math.ceil(this.totalCount() / this.pageSize()) || 1
  );

  public readonly paginatedLogs: Signal<AuditLog[]> = computed<AuditLog[]>(() => {
    return this.logs();
  });

  public loadInitialData(): void {
    this.loadStats();
    this.loadAuditLogs();
  }

  public loadStats(): void {
    this.apiService.getAuditLogStats().subscribe({
      next: (res: AuditLogStats) => {
        if (res) {
          this.stats.set(res);
        }
      },
      error: (err: unknown) => {
        console.warn('[AuditLogsService] Stats fetch failed:', err);
      }
    });
  }

  public loadAuditLogs(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const params: Record<string, unknown> = {
      page: this.currentPage(),
      page_size: this.pageSize(),
    };

    const query = this.searchQuery().trim();
    if (query) {
      params['search'] = query;
    }

    const action = this.selectedAction();
    if (action && action !== 'ALL') {
      params['action'] = action;
    }

    const module = this.selectedModule();
    if (module && module !== 'ALL') {
      params['module'] = module;
    }

    this.apiService.getAuditLogs(params).subscribe({
      next: (res: PaginatedResponse<AuditLog> | AuditLog[]) => {
        let items: AuditLog[] = [];
        let count = 0;

        if (Array.isArray(res)) {
          items = res;
          count = res.length;
        } else if (res && Array.isArray(res.results)) {
          items = res.results;
          count = res.count ?? res.results.length;
        }

        const normalizedLogs: AuditLog[] = items.map((log: any) => {
          const displayId = log.displayId ?? log.display_id ?? undefined;
          const rawId = String(log.id ?? '');
          const auditId = displayId ?? log.auditId ?? log.audit_id ?? (rawId ? 'AUD-' + rawId.replace(/-/g, '').slice(0, 6).toUpperCase() : '');
          return {
            ...log,
            displayId,
            auditId: log.auditId || auditId,
          };
        });

        this.logs.set(normalizedLogs);
        this.totalCount.set(count);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        console.error('[AuditLogsService] Load audit logs error:', err);
        this.errorMessage.set('Unable to load audit logs. Please try again.');
        this.loading.set(false);
      }
    });
  }

  public setSearchQuery(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
    this.loadAuditLogs();
  }

  public setActionFilter(action: string): void {
    this.selectedAction.set(action);
    this.currentPage.set(1);
    this.loadAuditLogs();
  }

  public setModuleFilter(module: string): void {
    this.selectedModule.set(module);
    this.currentPage.set(1);
    this.loadAuditLogs();
  }

  public setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadAuditLogs();
    }
  }

  public clearFilters(): void {
    this.searchQuery.set('');
    this.selectedAction.set('ALL');
    this.selectedModule.set('ALL');
    this.currentPage.set(1);
    this.loadAuditLogs();
  }
}
