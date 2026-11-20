import {
  Component,
  computed,
  inject,
  input,
  InputSignal,
  OnChanges,
  OnDestroy,
  output,
  OutputEmitterRef,
  signal,
  Signal,
  SimpleChanges,
  WritableSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MaintenanceRequest,
  MaintenanceStatus,
  MaintenancePriority,
  MaintenanceType,
} from '../../../../core/interfaces/maintenance.interface';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MaintenanceService } from '../../services/maintenance.service';
import { AuthApisService } from '../../../../core/services/api/auth-apis.service';
import { ToastService } from '../../../../core/services/toast.service';
import { BreadcrumbService } from '../../../../core/services/breadcrumb.service';
import { StatusBadgeComponent } from '../../../../core/components/status-badge/status-badge.component';

interface WorkflowStep {
  key: MaintenanceStatus;
  label: string;
}

@Component({
  selector: 'app-maintenance-detail-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent],
  templateUrl: './maintenance-detail-drawer.component.html',
})
export class MaintenanceDetailDrawerComponent implements OnChanges, OnDestroy {
  private readonly maintenanceService: MaintenanceService = inject(MaintenanceService);
  private readonly authService: AuthApisService = inject(AuthApisService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly breadcrumbService: BreadcrumbService = inject(BreadcrumbService);
  private readonly sanitizer: DomSanitizer = inject(DomSanitizer);

  // ─── Inputs / Outputs ─────────────────────────────────────────────────────
  public readonly request: InputSignal<MaintenanceRequest | null> = input<MaintenanceRequest | null>(null);
  public readonly isOpen: InputSignal<boolean> = input<boolean>(false);
  public readonly close: OutputEmitterRef<void> = output<void>();
  public readonly editRequest: OutputEmitterRef<MaintenanceRequest> = output<MaintenanceRequest>();
  public readonly statusUpdated: OutputEmitterRef<void> = output<void>();

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      if (changes['isOpen'].currentValue === true) {
        const req = this.request();
        this.breadcrumbService.setOverride({
          showBackArrow: false,
          items: [
            { label: 'AssetFlow' },
            { label: 'Maintenance', action: () => this.onClose() },
            { label: 'Maintenance Details', isLast: true },
          ],
        });
      } else {
        this.breadcrumbService.clearOverride();
      }
    }
  }

  public ngOnDestroy(): void {
    if (this.isOpen()) this.breadcrumbService.clearOverride();
  }

  // ─── Status Modal State ───────────────────────────────────────────────────
  protected readonly isStatusModalOpen: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly updatingStatus: WritableSignal<boolean> = signal<boolean>(false);
  protected selectedNewStatus: string = '';
  protected statusNote: string = '';

  // ─── Workflow Steps (for stepper) ─────────────────────────────────────────
  protected readonly workflowSteps: WorkflowStep[] = [
    { key: 'PENDING',     label: 'Pending' },
    { key: 'TODO',        label: 'To Do' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'REVIEW',      label: 'Under Review' },
    { key: 'COMPLETED',   label: 'Completed' },
    { key: 'VERIFIED',    label: 'Verified' },
  ];

  private readonly statusOrder: MaintenanceStatus[] = [
    'PENDING', 'TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'VERIFIED'
  ];

  protected readonly allowedNextStatuses: Signal<MaintenanceStatus[]> = computed(() => {
    const req = this.request();
    if (!req) return [];
    return this.maintenanceService.getAllowedNextStatuses(req.status);
  });

  // ─── RBAC ─────────────────────────────────────────────────────────────────
  protected canEdit(): boolean {
    const role = this.authService.currentUser()?.role;
    if (!role) return true;
    return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'MANAGER';
  }

  protected canUpdateStatus(): boolean {
    const req = this.request();
    if (!req) return false;
    const role = this.authService.currentUser()?.role;
    if (!role) return this.allowedNextStatuses().length > 0;
    return (role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'MANAGER') && this.allowedNextStatuses().length > 0;
  }

  // ─── Stepper Helpers ──────────────────────────────────────────────────────
  protected isStepCompleted(stepKey: MaintenanceStatus): boolean {
    const req = this.request();
    if (!req) return false;
    if (req.status === 'CANCELLED') return false;
    const currentIndex = this.statusOrder.indexOf(req.status);
    const stepIndex = this.statusOrder.indexOf(stepKey);
    return stepIndex < currentIndex;
  }

  protected isStepActive(stepKey: MaintenanceStatus): boolean {
    const req = this.request();
    if (!req) return false;
    return req.status === stepKey;
  }

  protected getStepClass(stepKey: MaintenanceStatus): string {
    if (this.isStepActive(stepKey)) {
      return 'border-primary bg-primary text-on-primary';
    }
    if (this.isStepCompleted(stepKey)) {
      return 'border-primary bg-primary text-on-primary';
    }
    return 'border-outline-variant bg-surface-container text-on-surface-variant';
  }

  // ─── Template Helpers ─────────────────────────────────────────────────────
  protected getPriorityDotClass(priority: MaintenancePriority): string {
    switch (priority) {
      case 'LOW':      return 'bg-on-surface-variant';
      case 'MEDIUM':   return 'bg-on-tertiary-fixed-variant';
      case 'HIGH':     return 'bg-secondary';
      case 'CRITICAL': return 'bg-error';
      default:         return 'bg-on-surface-variant';
    }
  }

  protected getMaintenanceTypeLabel(type: MaintenanceType): string {
    const labels: Record<MaintenanceType, string> = {
      PREVENTIVE:  'Preventive',
      CORRECTIVE:  'Corrective',
      EMERGENCY:   'Emergency',
      INSPECTION:  'Inspection',
      UPGRADE:     'Upgrade',
    };
    return labels[type] ?? type;
  }

  protected getStatusLabel(status: MaintenanceStatus): string {
    const labels: Record<MaintenanceStatus, string> = {
      PENDING:        'Pending',
      TODO:           'To Do',
      IN_PROGRESS:    'In Progress',
      REVIEW:         'Under Review',
      COMPLETED:      'Completed',
      RESOLVED:       'Resolved',
      VERIFIED:       'Verified',
      CANCELLED:      'Cancelled',
      UNREPAIRABLE:   'Not Repairable',
      NOT_REPAIRABLE: 'Not Repairable',
    };
    return labels[status] ?? status;
  }

  // ─── PDF Viewer Modal State ────────────────────────────────────────────────
  protected readonly pdfBlobUrl: WritableSignal<string | null> = signal<string | null>(null);
  protected readonly pdfFileName: WritableSignal<string> = signal<string>('Maintenance_Details.pdf');
  protected readonly pdfViewerTitle: WritableSignal<string> = signal<string>('Maintenance Details');

  // ─── Actions ──────────────────────────────────────────────────────────────
  protected onExportPdf(): void {
    const req = this.request();
    if (!req) return;

    if (this.pdfBlobUrl()) {
      URL.revokeObjectURL(this.pdfBlobUrl()!);
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Maintenance Report - ${req.requestId}</title>
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
    .desc-box { background: #f1f5f9; border-left: 4px solid #0284c7; border-radius: 6px; padding: 16px; font-size: 14px; line-height: 1.6; color: #334155; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
    th { background: #f8fafc; font-weight: 600; color: #475569; }
    .footer { margin-top: 36px; padding-top: 18px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <div class="header-title">MAINTENANCE REPORT</div>
        <div class="header-sub">Request ID: <strong>${req.requestId}</strong></div>
      </div>
      <div style="text-align: right;">
        <span class="badge">${req.status || 'PENDING'}</span>
        <div class="header-sub" style="margin-top: 8px;">Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Request Information</div>
      <div class="grid">
        <div>
          <div class="field-label">Asset Name</div>
          <div class="field-value">${req.assetName || '—'}</div>
        </div>
        <div>
          <div class="field-label">Serial Number</div>
          <div class="field-value mono">${req.serialNumber || '—'}</div>
        </div>
        <div>
          <div class="field-label">Priority</div>
          <div class="field-value">${req.priority || 'NORMAL'}</div>
        </div>
        <div>
          <div class="field-label">Maintenance Type</div>
          <div class="field-value">${this.getMaintenanceTypeLabel(req.maintenanceType)}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Issue Description</div>
      <div class="desc-box">
        <div style="font-weight: 600; margin-bottom: 6px; color: #0f172a;">${req.componentOrIssueType || 'General Issue'}</div>
        <div>${req.issueDescription || 'No detailed description provided.'}</div>
      </div>
    </div>

    ${req.assetMaintenanceHistory && req.assetMaintenanceHistory.length > 0 ? `
    <div class="section">
      <div class="section-title">Asset Maintenance History</div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Issue</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${req.assetMaintenanceHistory.map(h => `
            <tr>
              <td>${new Date(h.date).toLocaleDateString()}</td>
              <td>${h.issue}</td>
              <td>${h.action}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <div class="footer">
      <div>AssetFlow Enterprise Asset Management</div>
      <div>Confidential Document</div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    this.pdfBlobUrl.set(url);
    this.pdfFileName.set(`${req.requestId}_Maintenance_Report.html`);
    this.pdfViewerTitle.set(`Maintenance Report - ${req.requestId}`);
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

  protected onClose(): void {
    this.breadcrumbService.clearOverride();
    this.close.emit();
  }

  protected onEditRequest(): void {
    const req = this.request();
    if (req) this.editRequest.emit(req);
  }

  protected onUpdateStatus(): void {
    this.selectedNewStatus = '';
    this.statusNote = '';
    this.breadcrumbService.setOverride({
      showBackArrow: false,
      items: [
        { label: 'AssetFlow' },
        { label: 'Maintenance', action: () => { this.closeStatusModal(); this.onClose(); } },
        { label: 'Maintenance Details', action: () => this.closeStatusModal() },
        { label: 'Update Status', isLast: true },
      ],
    });
    this.isStatusModalOpen.set(true);
  }

  protected closeStatusModal(): void {
    this.isStatusModalOpen.set(false);
    this.selectedNewStatus = '';
    this.statusNote = '';
    // Restore detail-view breadcrumb
    const req = this.request();
    this.breadcrumbService.setOverride({
      showBackArrow: false,
      items: [
        { label: 'AssetFlow' },
        { label: 'Maintenance', action: () => this.onClose() },
        { label: 'Maintenance Details', isLast: true },
      ],
    });
  }

  protected confirmStatusUpdate(): void {
    const req = this.request();
    if (!req || !this.selectedNewStatus) return;

    this.updatingStatus.set(true);

    this.maintenanceService
      .updateStatus(req.id, {
        status: this.selectedNewStatus as MaintenanceStatus,
        note: this.statusNote || undefined,
      })
      .subscribe({
        next: () => {
          this.toastService.presentToast(
            `Status updated to "${this.getStatusLabel(this.selectedNewStatus as MaintenanceStatus)}" successfully.`,
            2500,
            'success'
          );
          this.updatingStatus.set(false);
          this.closeStatusModal();
          this.statusUpdated.emit();
        },
        error: () => {
          this.toastService.presentToast('Failed to update status. Please try again.', 2500, 'error');
          this.updatingStatus.set(false);
        },
      });
  }
}