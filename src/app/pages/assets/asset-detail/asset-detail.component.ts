import { Component, computed, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AssetApisService } from '../services/asset-apis.service';
import { AssetService } from '../services/asset.service';
import { Asset, AssetUnit } from '../../../core/interfaces/asset.interface';
import { AssetCategory } from '../../../core/interfaces/asset-category.interface';
import { StatusBadgeComponent } from '../../../core/components/status-badge/status-badge.component';
import { TabNavComponent, Tab } from '../../../core/components/tab-nav/tab-nav.component';
import { SupplierDetailModalComponent } from '../../../core/components/supplier-detail-modal/supplier-detail-modal.component';
import { AssetDepreciationTabComponent } from '../components/asset-depreciation-tab/asset-depreciation-tab.component';
import { EditDepreciationModalComponent } from '../components/edit-depreciation-modal/edit-depreciation-modal.component';
import { ToastService } from '../../../core/services/toast.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { AuthApisService } from '../../../core/services/api/auth-apis.service';
import { AppCurrencyPipe } from '../../../core/pipes/currency.pipe';
import { getCategoryIcon } from '../../../core/utils/asset-icon.util';
import { MaintenanceService } from '../../maintenance/services/maintenance.service';
import { MaintenanceRequest } from '../../../core/interfaces/maintenance.interface';
import { AuditLogsApiService } from '../../audit-logs/services/audit-logs-api.service';
import { AuditLog } from '../../../core/interfaces/audit-log.interface';

export type DetailTab = 'overview' | 'units' | 'maintenance' | 'timeline' | 'depreciation';

export type TimelineEventType =
  | 'PURCHASED' | 'ASSIGNED' | 'RETURNED'
  | 'MAINTENANCE_CREATED' | 'MAINTENANCE_COMPLETED'
  | 'SCRAPPED';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: string;
  employee?: string;
  notes?: string;
  newValue?: string;
  icon: string;
  iconColor: string;
  label: string;
}

@Component({
  selector: 'app-asset-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusBadgeComponent,
    TabNavComponent,
    SupplierDetailModalComponent,
    AssetDepreciationTabComponent,
    EditDepreciationModalComponent,
    AppCurrencyPipe,
  ],
  templateUrl: './asset-detail.component.html'
})
export class AssetDetailComponent implements OnInit {
  private readonly route              = inject(ActivatedRoute);
  private readonly router             = inject(Router);
  private readonly assetApisService   = inject(AssetApisService);
  private readonly assetService       = inject(AssetService);
  protected readonly maintenanceService = inject(MaintenanceService);
  private readonly auditLogsApiService = inject(AuditLogsApiService);
  private readonly toastService       = inject(ToastService);
  private readonly sanitizer          = inject(DomSanitizer);

  // ─── PDF Viewer Modal State ────────────────────────────────────────────────
  protected readonly pdfBlobUrl: WritableSignal<string | null> = signal<string | null>(null);
  protected readonly pdfFileName: WritableSignal<string> = signal<string>('Asset_Details.pdf');
  protected readonly pdfViewerTitle: WritableSignal<string> = signal<string>('Asset Details Report');

  protected goBack(): void {
    window.history.back();
  }
  protected readonly currencyService  = inject(CurrencyService);
  private readonly authService        = inject(AuthApisService);

  protected readonly asset        = signal<Asset | null>(null);
  protected readonly auditLogs    = signal<AuditLog[]>([]);
  protected readonly loading      = signal<boolean>(false);
  protected readonly activeTab    = signal<DetailTab>('overview');
  protected readonly unitsLoading = signal<boolean>(false);

  // ─── Supplier modal ───────────────────────────────────────────────────────
  protected readonly isSupplierModalOpen  = signal<boolean>(false);
  protected readonly selectedSupplierName = signal<string | null>(null);

  // ─── Depreciation modal ───────────────────────────────────────────────────
  protected readonly isEditDepreciationModalOpen = signal<boolean>(false);

  // ─── Role Permissions ─────────────────────────────────────────────────────
  protected readonly userRole = computed<string>(() => {
    return (
      this.authService.currentUser()?.role ||
      localStorage.getItem('role') ||
      ''
    ).toUpperCase().replace(/\s+/g, '_');
  });

  protected readonly canEditDepreciation = computed<boolean>(() => {
    const role = this.userRole();
    return [
      'SYSTEM_ADMIN',
      'SUPER_ADMIN',
      'ADMIN',
      'OPERATIONS_MANAGER',
      'MANAGER',
    ].includes(role);
  });

  protected readonly canManageMaintenance = computed<boolean>(() => {
    const role = this.userRole();
    return [
      'SYSTEM_ADMIN',
      'SUPER_ADMIN',
      'ADMIN',
      'OPERATIONS_MANAGER',
      'MANAGER',
    ].includes(role);
  });

  protected readonly canViewFinancials = computed<boolean>(() => {
    const role = this.userRole();
    if (role === 'EMPLOYEE' || role === 'EXTERNAL_TECHNICIAN' || role === 'TECHNICIAN') {
      return false;
    }
    return true;
  });

  protected readonly detailTabs: Tab[] = [
    { key: 'overview',     label: 'Overview'      },
    { key: 'units',        label: 'Units'         },
    { key: 'maintenance',  label: 'Maintenance'   },
    { key: 'timeline',     label: 'Timeline'      },
    { key: 'depreciation', label: 'Depreciation'  },
  ];

  public ngOnInit(): void {
    this.maintenanceService.loadRequestsFromApi();
    this.route.queryParamMap.subscribe(queryParams => {
      const tab = queryParams.get('tab');
      if (tab && ['overview', 'units', 'maintenance', 'timeline', 'depreciation'].includes(tab)) {
        this.activeTab.set(tab as DetailTab);
      }
    });
    this.route.paramMap.subscribe(params => {
      const encodedId = params.get('id');
      if (encodedId) {
        const id = decodeURIComponent(encodedId);
        this.loadAsset(id);
      }
    });
  }

  private loadAsset(id: string): void {
    this.loading.set(true);
    const cleanId = this.assetService.extractBaseAssetId(id);

    this.auditLogsApiService.getAuditLogs({ asset_id: cleanId }).subscribe({
      next: (res) => {
        const items = Array.isArray(res) ? res : (res && Array.isArray(res.results) ? res.results : []);
        this.auditLogs.set(items);
      },
      error: () => {}
    });

    // Always fetch fresh from API — includes nested `units` on the detail response
    this.assetApisService.getAssetById(cleanId).subscribe({
      next: (raw) => {
        const normalized = this.assetService.normalizeAsset(raw);
        this.asset.set(normalized);
        this.loading.set(false);
      },
      error: () => {
        this.toastService.presentToast('Failed to load asset details.', 2000, 'error');
        this.loading.set(false);
        this.router.navigate(['/assets']);
      }
    });
  }

  // ─── Units from API response ──────────────────────────────────────────────
  // `units` comes from the GET /api/assets/<id>/ nested field — not
  // derived client-side by name-matching. If absent on detail response,
  // falls back to fetching separately.
  protected get units(): AssetUnit[] {
    return this.asset()?.units ?? [];
  }

  protected get totalUnits():       number { return this.units.length; }
  protected get availableUnits():   number { return this.units.filter(u => u.status === 'AVAILABLE').length; }
  protected get assignedUnits():    number { return this.units.filter(u => u.status === 'ASSIGNED').length; }
  protected get maintenanceUnits(): number { return this.units.filter(u => u.status === 'MAINTENANCE').length; }

  // ─── Payment Information Helpers ───────────────────────────────────────────
  protected getEffectiveTotalAmount(cur: Asset): number {
    if (typeof cur.totalAmount === 'number') return cur.totalAmount;
    return (cur.purchaseCost || 0) * (this.totalUnits || 1);
  }

  protected getEffectivePaidAmount(cur: Asset): number {
    if (typeof cur.paidAmount === 'number') return cur.paidAmount;
    return cur.purchaseCost || 0;
  }

  protected getEffectiveRemainingAmount(cur: Asset): number {
    if (typeof cur.remainingAmount === 'number') return cur.remainingAmount;
    const total = this.getEffectiveTotalAmount(cur);
    const paid = this.getEffectivePaidAmount(cur);
    return Math.max(0, total - paid);
  }

  protected getEffectivePaymentStatus(cur: Asset): string {
    if (cur.paymentStatus) {
      const ps = cur.paymentStatus.toUpperCase();
      if (ps === 'PAID' || ps === 'FULLY PAID') return 'Fully Paid';
      if (ps === 'PARTIAL' || ps === 'PARTIALLY PAID') return 'Partially Paid';
      if (ps === 'UNPAID') return 'Unpaid';
      return cur.paymentStatus;
    }
    const rem = this.getEffectiveRemainingAmount(cur);
    const paid = this.getEffectivePaidAmount(cur);
    if (rem === 0) return 'Fully Paid';
    if (paid > 0) return 'Partially Paid';
    return 'Unpaid';
  }

  protected getPaymentStatusBadgeClass(cur: Asset): string {
    const status = this.getEffectivePaymentStatus(cur);
    if (status === 'Fully Paid') {
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
    }
    if (status === 'Partially Paid') {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    }
    return 'bg-error-container text-error';
  }

  // ─── Maintenance ─────────────────────────────────────────────────────────
  protected get assetMaintenanceRequests(): MaintenanceRequest[] {
    const cur = this.asset();
    if (!cur) return [];
    return this.maintenanceService.getRequestsByAssetId(cur.id);
  }

  // ─── Timeline (derived from real API audit logs, with fallback) ──────────
  protected get timelineEvents(): TimelineEvent[] {
    const logs = this.auditLogs();
    if (logs.length > 0) {
      return logs.map(log => {
        let icon = 'history';
        let iconColor = 'text-primary bg-primary/10';

        const act = (log.action || '').toUpperCase();
        if (act.includes('CREATED') || act.includes('PURCHASED')) {
          icon = 'shopping_cart';
          iconColor = 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400';
        } else if (act.includes('ASSIGNED') || act.includes('TRANSFERRED') || act.includes('RETURNED')) {
          icon = 'assignment_ind';
          iconColor = 'text-sky-700 bg-sky-100 dark:bg-sky-950/40 dark:text-sky-400';
        } else if (act.includes('MAINTENANCE')) {
          icon = 'build';
          iconColor = 'text-amber-700 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400';
        } else if (act.includes('RETIRED') || act.includes('SCRAPPED')) {
          icon = 'delete';
          iconColor = 'text-rose-700 bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400';
        }

        const formattedLabel = (log.action || '')
          .replace(/_/g, ' ')
          .toLowerCase()
          .replace(/\b\w/g, l => l.toUpperCase());

        return {
          id: log.id,
          type: 'ASSIGNED' as TimelineEventType,
          date: log.timestamp,
          label: formattedLabel,
          employee: log.userName,
          notes: log.description,
          icon,
          iconColor
        };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    const cur = this.asset();
    if (!cur) return [];

    const events: TimelineEvent[] = [];

    if (cur.purchaseDate) {
      events.push({
        id:        `evt-purchase-${cur.id}`,
        type:      'PURCHASED',
        date:      cur.purchaseDate,
        label:     'Asset Created',
        newValue:  cur.purchaseCost ? this.currencyService.format(cur.purchaseCost) : undefined,
        icon:      'shopping_cart',
        iconColor: 'text-primary bg-primary/10',
      });
    }

    const history = cur.assignmentHistory ?? [];
    history.forEach((h, i) => {
      events.push({
        id:        `evt-assign-${i}`,
        type:      'ASSIGNED',
        date:      h.assignedDate,
        label:     'Asset Assigned',
        employee:  h.employeeName,
        icon:      'assignment_ind',
        iconColor: 'text-blue-700 bg-blue-100',
      });
      if (h.returnedDate) {
        events.push({
          id:        `evt-return-${i}`,
          type:      'RETURNED',
          date:      h.returnedDate,
          label:     'Returned to Inventory',
          employee:  h.employeeName,
          icon:      'assignment_return',
          iconColor: 'text-amber-700 bg-amber-100',
        });
      }
    });

    this.assetMaintenanceRequests.forEach(req => {
      events.push({
        id:        `evt-mnt-${req.id}`,
        type:      'MAINTENANCE_CREATED',
        date:      req.createdAt,
        label:     'Maintenance Ticket Created',
        notes:     `${req.requestId}: ${req.componentOrIssueType}`,
        icon:      'build',
        iconColor: 'text-amber-700 bg-amber-100',
      });
      if (req.status === 'COMPLETED' || req.status === 'VERIFIED') {
        events.push({
          id:        `evt-mnt-done-${req.id}`,
          type:      'MAINTENANCE_COMPLETED',
          date:      req.completedAt || req.updatedAt,
          label:     'Maintenance Completed',
          notes:     req.requestId,
          icon:      'build_circle',
          iconColor: 'text-green-700 bg-green-100',
        });
      }
    });

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  protected getCategoryIcon(category: AssetCategory | string | undefined): string {
    return getCategoryIcon(category);
  }

  protected getCategoryName(category: AssetCategory | string | undefined): string {
    if (!category) return 'Hardware';
    if (typeof category === 'string') return category;
    return (category as AssetCategory).name || 'Hardware';
  }

  // ─── Navigation ──────────────────────────────────────────────────────────
  protected onExportPdf(): void {
    const cur = this.asset();
    if (!cur) return;

    if (this.pdfBlobUrl()) {
      URL.revokeObjectURL(this.pdfBlobUrl()!);
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Asset Details - ${cur.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1c1e; background: #f8fafc; padding: 32px 20px; }
    .card { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; max-width: 800px; margin: 0 auto; padding: 36px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 20px; margin-bottom: 24px; }
    .header-title { font-size: 22px; font-weight: 700; color: #0f172a; }
    .header-sub { font-size: 13px; color: #64748b; margin-top: 4px; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: #e0f2fe; color: #0369a1; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 14px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .field-label { font-size: 12px; color: #64748b; margin-bottom: 2px; }
    .field-value { font-size: 14px; font-weight: 600; color: #0f172a; }
    .field-value.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #0284c7; }
    .footer { margin-top: 36px; padding-top: 18px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <div class="header-title">${cur.name}</div>
        <div class="header-sub">Category: <strong>${this.getCategoryName(cur.category)}</strong></div>
      </div>
      <div style="text-align: right;">
        <span class="badge">${cur.status || 'AVAILABLE'}</span>
        <div class="header-sub" style="margin-top: 8px;">Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Asset Specification</div>
      <div class="grid">
        <div>
          <div class="field-label">Serial Number</div>
          <div class="field-value mono">${cur.serialNumber || '—'}</div>
        </div>
        <div>
          <div class="field-label">Brand</div>
          <div class="field-value">${cur.brand || '—'}</div>
        </div>
        <div>
          <div class="field-label">Model</div>
          <div class="field-value">${cur.model || '—'}</div>
        </div>
        <div>
          <div class="field-label">Color</div>
          <div class="field-value">${cur.color || '—'}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Stock Summary</div>
      <div class="grid">
        <div>
          <div class="field-label">Available Units</div>
          <div class="field-value">${this.availableUnits}</div>
        </div>
        <div>
          <div class="field-label">Assigned Units</div>
          <div class="field-value">${this.assignedUnits}</div>
        </div>
        <div>
          <div class="field-label">Units in Maintenance</div>
          <div class="field-value">${this.maintenanceUnits}</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <div>AssetFlow Enterprise Asset Management</div>
      <div>Confidential Report</div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    this.pdfBlobUrl.set(url);
    this.pdfFileName.set(`${cur.serialNumber || cur.name}_Asset_Report.html`);
    this.pdfViewerTitle.set(`Asset Details - ${cur.name}`);
  }

  protected pdfBlobUrlSafe(): SafeResourceUrl | null {
    const url = this.pdfBlobUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  }

  protected closePdfViewer(): void {
    const url = this.pdfBlobUrl();
    if (url) URL.revokeObjectURL(url);
    this.pdfBlobUrl.set(null);
  }

  protected onEdit(): void {
    const cur = this.asset();
    if (cur) this.router.navigate(['/assets', cur.id, 'edit']);
  }

  protected setTab(tab: string): void {
    this.activeTab.set(tab as DetailTab);
  }

  protected onMaintenance(): void {
    const cur = this.asset();
    if (!cur) return;
    this.router.navigate(['/maintenance'], { queryParams: { assetId: cur.id, openForm: 'true' } });
  }

  protected onOpenSupplierModal(name?: string): void {
    if (!name) return;
    this.selectedSupplierName.set(name);
    this.isSupplierModalOpen.set(true);
  }

  // ─── Depreciation Handlers ───────────────────────────────────────────────
  protected onOpenEditDepreciation(): void {
    this.isEditDepreciationModalOpen.set(true);
  }

  protected onDepreciationSaved(updated: Asset): void {
    this.asset.set(updated);
    // Reload audit logs to ensure any audit entries appear in the timeline
    const cur = this.asset();
    if (cur) {
      const cleanId = this.assetService.extractBaseAssetId(cur.id);
      this.auditLogsApiService.getAuditLogs({ asset_id: cleanId }).subscribe({
        next: (res) => {
          const items = Array.isArray(res) ? res : (res && Array.isArray(res.results) ? res.results : []);
          this.auditLogs.set(items);
        },
        error: () => {}
      });
    }
  }
}
