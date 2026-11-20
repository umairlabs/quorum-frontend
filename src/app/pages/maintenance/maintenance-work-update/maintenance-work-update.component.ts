import { Component, computed, inject, OnInit, Signal, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MaintenanceService } from '../services/maintenance.service';
import { AuthApisService } from '../../../core/services/api/auth-apis.service';
import { ToastService } from '../../../core/services/toast.service';
import { BreadcrumbService } from '../../../core/services/breadcrumb.service';
import { MaintenanceRequest, MaintenanceStatus, MaintenanceWorkUpdatePayload } from '../../../core/interfaces/maintenance.interface';
import { StatusBadgeComponent } from '../../../core/components/status-badge/status-badge.component';

@Component({
  selector: 'app-maintenance-work-update',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusBadgeComponent,
  ],
  templateUrl: './maintenance-work-update.component.html',
  styleUrls: ['./maintenance-work-update.component.scss'],
})
export class MaintenanceWorkUpdateComponent implements OnInit {
  private readonly maintenanceService: MaintenanceService = inject(MaintenanceService);
  private readonly authService: AuthApisService = inject(AuthApisService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly breadcrumbService: BreadcrumbService = inject(BreadcrumbService);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);

  // ─── Signals ──────────────────────────────────────────────────────────────
  protected readonly ticketId: WritableSignal<string | null> = signal<string | null>(null);
  protected readonly request: WritableSignal<MaintenanceRequest | null> = signal<MaintenanceRequest | null>(null);
  protected readonly loading: WritableSignal<boolean> = signal<boolean>(true);
  protected readonly submitting: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly errorMessage: WritableSignal<string | null> = signal<string | null>(null);
  protected readonly validationError: WritableSignal<string | null> = signal<string | null>(null);

  // Form Signals
  protected readonly selectedWorkStatus: WritableSignal<'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'RESOLVED' | 'NOT_REPAIRABLE'> = signal<'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'RESOLVED' | 'NOT_REPAIRABLE'>('IN_PROGRESS');
  protected readonly workDone: WritableSignal<string> = signal<string>('');

  // ─── Computed Properties ──────────────────────────────────────────────────
  protected readonly isClosed: Signal<boolean> = computed<boolean>(() => {
    const req = this.request();
    if (!req) return false;
    const closedStatuses: MaintenanceStatus[] = ['RESOLVED', 'COMPLETED', 'VERIFIED', 'NOT_REPAIRABLE', 'UNREPAIRABLE', 'CANCELLED'];
    return closedStatuses.includes(req.status);
  });

  protected readonly statusOptions = [
    {
      value: 'TODO' as const,
      title: 'To Do',
      subtitle: 'Scheduled for diagnostic or repair.',
      icon: 'checklist',
      badgeClass: 'bg-surface-container-high text-on-surface-variant border-outline-variant',
    },
    {
      value: 'IN_PROGRESS' as const,
      title: 'In Progress',
      subtitle: 'Technician actively repairing device.',
      icon: 'sync',
      badgeClass: 'bg-secondary-container/20 text-secondary border-secondary-container/50',
    },
    {
      value: 'REVIEW' as const,
      title: 'Under Review',
      subtitle: 'Repair finished, undergoing QA/review.',
      icon: 'rate_review',
      badgeClass: 'bg-primary-container/20 text-primary border-primary/30',
    },
    {
      value: 'RESOLVED' as const,
      title: 'Resolved',
      subtitle: 'Asset fully repaired and functional.',
      icon: 'check_circle',
      badgeClass: 'bg-primary/10 text-primary border-primary/30',
    },
    {
      value: 'NOT_REPAIRABLE' as const,
      title: 'Not Repairable',
      subtitle: 'Cannot be repaired economically.',
      icon: 'warning',
      badgeClass: 'bg-error-container/20 text-error border-error/30',
    },
  ];

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  public ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.ticketId.set(id);

    this.breadcrumbService.setOverride({
      showBackArrow: true,
      items: [
        { label: 'AssetFlow' },
        { label: 'Maintenance', action: () => this.onCancel() },
        { label: 'Work Update', isLast: true },
      ],
    });

    if (id) {
      this.loadTicketDetails(id);
    } else {
      this.errorMessage.set('No ticket ID was provided in the route URL.');
      this.loading.set(false);
    }
  }

  // ─── Data Fetching ────────────────────────────────────────────────────────
  private loadTicketDetails(id: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    // Try finding in service state or trigger load
    const existing = this.maintenanceService.getRequestById(id);
    if (existing) {
      this.populateTicket(existing);
      this.loading.set(false);
    } else {
      this.maintenanceService.loadRequestsFromApi();
      setTimeout(() => {
        const found = this.maintenanceService.getRequestById(id);
        if (found) {
          this.populateTicket(found);
        } else {
          this.errorMessage.set(`Maintenance ticket "${id}" could not be found.`);
        }
        this.loading.set(false);
      }, 400);
    }
  }

  private populateTicket(ticket: MaintenanceRequest): void {
    this.request.set(ticket);

    if (ticket.workDone || ticket.findings) {
      this.workDone.set(ticket.workDone || ticket.findings || '');
    }

    if (ticket.status === 'RESOLVED' || ticket.status === 'COMPLETED') {
      this.selectedWorkStatus.set('RESOLVED');
    } else if (ticket.status === 'NOT_REPAIRABLE' || ticket.status === 'UNREPAIRABLE') {
      this.selectedWorkStatus.set('NOT_REPAIRABLE');
    } else if (ticket.status === 'REVIEW') {
      this.selectedWorkStatus.set('REVIEW');
    } else if (ticket.status === 'TODO') {
      this.selectedWorkStatus.set('TODO');
    } else {
      this.selectedWorkStatus.set('IN_PROGRESS');
    }
  }

  // ─── Actions ──────────────────────────────────────────────────────────────
  protected selectStatus(status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'RESOLVED' | 'NOT_REPAIRABLE'): void {
    if (this.isClosed()) return;
    this.selectedWorkStatus.set(status);
    this.validationError.set(null);
  }

  protected onWorkDoneInput(event: Event): void {
    const val = (event.target as HTMLTextAreaElement).value;
    this.workDone.set(val);
    if (val.trim()) {
      this.validationError.set(null);
    }
  }

  protected onCancel(): void {
    this.breadcrumbService.clearOverride();
    this.router.navigate(['/maintenance']);
  }

  protected onSubmitUpdate(): void {
    if (this.isClosed()) {
      this.toastService.presentToast('This ticket is closed and read-only.', 2500, 'warning');
      return;
    }

    const currentStatus = this.selectedWorkStatus();
    const findings = this.workDone().trim();

    // Validation rules
    if (!currentStatus) {
      this.validationError.set('Please select a Work Status.');
      return;
    }

    if (!findings) {
      this.validationError.set('Work Done / Findings is required.');
      return;
    }

    if (currentStatus === 'RESOLVED' && findings.length < 10) {
      this.validationError.set('Please enter a detailed resolution description (at least 10 characters).');
      return;
    }

    if (currentStatus === 'NOT_REPAIRABLE' && findings.length < 10) {
      this.validationError.set('Please enter a clear explanation of why the asset cannot be repaired (at least 10 characters).');
      return;
    }

    this.validationError.set(null);
    this.submitting.set(true);

    const currentUser = this.authService.currentUser();
    const techName = currentUser?.fullName || `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`.trim() || 'Technician';

    const payload: MaintenanceWorkUpdatePayload = {
      status: currentStatus,
      workDone: findings,
      technicianId: currentUser?.id,
      technicianName: techName,
    };

    const reqId = this.request()?.id || this.ticketId() || '';

    this.maintenanceService.submitWorkUpdate(reqId, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        const labels: Record<string, string> = {
          TODO: 'To Do',
          IN_PROGRESS: 'In Progress',
          REVIEW: 'Under Review',
          RESOLVED: 'Resolved',
          NOT_REPAIRABLE: 'Not Repairable',
        };
        const label = labels[currentStatus] || currentStatus;
        this.toastService.presentToast(`Work update for ticket ${this.request()?.requestId || reqId} submitted successfully (${label}).`, 3000, 'success');
        this.breadcrumbService.clearOverride();
        this.router.navigate(['/maintenance']);
      },
      error: (err: any) => {
        this.submitting.set(false);
        const message = err?.error?.detail || err?.message || 'Failed to submit work update to the backend. Please try again.';
        this.errorMessage.set(message);
        this.toastService.presentToast(message, 3500, 'error');
      },
    });
  }
}
