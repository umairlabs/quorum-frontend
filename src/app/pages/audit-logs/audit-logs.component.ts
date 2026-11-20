import { Component, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { LayoutService } from '../../core/services/layout.service';
import { AuditLogsService } from './services/audit-logs.service';
import { AuditLog } from '../../core/interfaces/audit-log.interface';
import { AuditDetailModalComponent } from './components/audit-detail-modal/audit-detail-modal.component';
import { PageHeaderComponent } from '../../core/components/page-header/page-header.component';
import { SelectComponent } from '../../core/components/select/select.component';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, AuditDetailModalComponent, PageHeaderComponent, SelectComponent],
  templateUrl: './audit-logs.component.html',
  styleUrls: ['./audit-logs.component.scss']
})
export class AuditLogsComponent implements OnInit, OnDestroy {
  protected readonly auditLogsService = inject(AuditLogsService);
  private readonly layoutService = inject(LayoutService);

  private navSubscription?: Subscription;

  // Detail Modal state
  protected readonly isDetailModalOpen: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly selectedLog: WritableSignal<AuditLog | null> = signal<AuditLog | null>(null);

  protected readonly actionOptions = [
    { label: 'All Actions', value: 'ALL' },
    { label: 'Asset Created', value: 'ASSET_CREATED' },
    { label: 'Asset Updated', value: 'ASSET_UPDATED' },
    { label: 'Asset Purchased', value: 'ASSET_PURCHASED' },
    { label: 'Asset Assigned', value: 'ASSET_ASSIGNED' },
    { label: 'Asset Transferred', value: 'ASSET_TRANSFERRED' },
    { label: 'Asset Returned', value: 'ASSET_RETURNED' },
    { label: 'Maintenance Created', value: 'MAINTENANCE_CREATED' },
    { label: 'Maintenance Started', value: 'MAINTENANCE_STARTED' },
    { label: 'Maintenance Resolved', value: 'MAINTENANCE_RESOLVED' },
    { label: 'Asset Retired', value: 'ASSET_RETIRED' },
    { label: 'Asset Scrapped', value: 'ASSET_SCRAPPED' },
  ];

  protected readonly moduleOptions = [
    { label: 'All Modules', value: 'ALL' },
    { label: 'Assets', value: 'ASSETS' },
    { label: 'Assignments', value: 'ASSIGNMENTS' },
    { label: 'Maintenance', value: 'MAINTENANCE' },
    { label: 'Purchases', value: 'PURCHASES' },
    { label: 'Users', value: 'USERS' },
    { label: 'Settings', value: 'SETTINGS' },
  ];

  protected onActionSelect(val: string | number): void {
    this.auditLogsService.setActionFilter(String(val));
  }

  protected onModuleSelect(val: string | number): void {
    this.auditLogsService.setModuleFilter(String(val));
  }

  public ngOnInit(): void {
    this.auditLogsService.loadInitialData();

    // Close modal automatically on navigation or sidebar click
    this.navSubscription = this.layoutService.navItemClicked$.subscribe(() => {
      this.onCloseDetailModal();
    });
  }

  public ngOnDestroy(): void {
    this.navSubscription?.unsubscribe();
  }

  protected onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.auditLogsService.setSearchQuery(val);
  }

  protected onActionChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.auditLogsService.setActionFilter(val);
  }

  protected onModuleChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.auditLogsService.setModuleFilter(val);
  }

  protected onPageChange(page: number): void {
    this.auditLogsService.setPage(page);
  }

  protected onClearFilters(): void {
    this.auditLogsService.clearFilters();
  }

  protected onViewDetail(log: AuditLog): void {
    this.selectedLog.set(log);
    this.isDetailModalOpen.set(true);
  }

  protected onCloseDetailModal(): void {
    this.isDetailModalOpen.set(false);
    this.selectedLog.set(null);
  }

  protected getActionBadgeClass(action: string | undefined): string {
    if (!action) return 'bg-slate-500/10 text-slate-700 border-slate-500/20';
    const a = action.toUpperCase();

    if (a.includes('CREATED') || a.includes('PURCHASED') || a.includes('RESOLVED')) {
      return 'bg-emerald-500/10 text-emerald-800 border-emerald-500/30';
    }
    if (a.includes('ASSIGNED') || a.includes('TRANSFERRED') || a.includes('RETURNED')) {
      return 'bg-sky-500/10 text-sky-800 border-sky-500/30';
    }
    if (a.includes('MAINTENANCE') || a.includes('STARTED') || a.includes('REVIEW')) {
      return 'bg-amber-500/10 text-amber-800 border-amber-500/30';
    }
    if (a.includes('RETIRED') || a.includes('SCRAPPED') || a.includes('DELETED')) {
      return 'bg-error-container/30 text-error border-error/40';
    }
    return 'bg-slate-500/10 text-slate-800 border-slate-500/30';
  }

  protected formatActionName(action: string | undefined): string {
    if (!action) return '—';
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  protected get pagesArray(): number[] {
    const total = this.auditLogsService.totalPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  }
}
