import { Component, computed, HostListener, inject, OnInit, Signal, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MaintenanceService } from '../services/maintenance.service';
import { AuthApisService } from '../../../core/services/api/auth-apis.service';
import { PermissionService } from '../../../core/services/permission.service';
import { ToastService } from '../../../core/services/toast.service';
import { MaintenanceRequest, MaintenancePriority, MaintenanceStatus } from '../../../core/interfaces/maintenance.interface';
import { UserRole } from '../../../core/interfaces/user.interface';
import { StatusBadgeComponent } from '../../../core/components/status-badge/status-badge.component';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { SearchInputComponent } from '../../../core/components/search-input/search-input.component';
import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { ConfirmDialogComponent } from '../../../core/components/confirm-dialog/confirm-dialog.component';
import { MaintenanceStatsComponent } from '../components/maintenance-stats/maintenance-stats.component';
import { MaintenanceDetailDrawerComponent } from '../components/maintenance-detail-drawer/maintenance-detail-drawer.component';
import { MaintenanceFormComponent } from '../components/maintenance-form/maintenance-form.component';
import { DataTableComponent, TableColumn, PaginationConfig } from '../../../core/components/data-table/data-table.component';
import { SelectComponent } from '../../../core/components/select/select.component';

@Component({
  selector: 'app-maintenance-list',
  standalone: true,
  imports: [
    CommonModule,
    StatusBadgeComponent,
    PageHeaderComponent,
    SearchInputComponent,
    EmptyStateComponent,
    ConfirmDialogComponent,
    MaintenanceDetailDrawerComponent,
    MaintenanceFormComponent,
    MaintenanceStatsComponent,
    DataTableComponent,
    SelectComponent,
  ],
  templateUrl: './maintenance-list.component.html'
})
export class MaintenanceListComponent implements OnInit {
  protected readonly maintenanceService: MaintenanceService = inject(MaintenanceService);
  private readonly authService: AuthApisService = inject(AuthApisService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);

  // ─── Drawer / Form State ──────────────────────────────────────────────────
  protected readonly selectedRequest: WritableSignal<MaintenanceRequest | null> = signal<MaintenanceRequest | null>(null);
  protected readonly isDrawerOpen: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly isFormOpen: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly editingRequest: WritableSignal<MaintenanceRequest | null> = signal<MaintenanceRequest | null>(null);
  protected readonly pendingDeleteRequest: WritableSignal<MaintenanceRequest | null> = signal<MaintenanceRequest | null>(null);
  // FIX: Assets page se "Send to Maintenance" ke zariye aane wala asset id
  protected readonly preselectedAssetId: WritableSignal<string | null> = signal<string | null>(null);
  // FIX: status-change dropdown menu ke liye state
  protected readonly activeMenuRequestId: WritableSignal<string | null> = signal<string | null>(null);

  private readonly permissionService = inject(PermissionService);

  // ─── Permission Getters ───────────────────────────────────────────────────
  private normalizeRole(): string {
    const userRole = this.authService.currentUser()?.role;
    const storageRole = localStorage.getItem('role');
    return (userRole || storageRole || '').toUpperCase().replace(/\s+/g, '_');
  }

  protected isTechnicianRole(): boolean {
    const r = this.normalizeRole();
    return r === 'TECH' || r === 'TECHNICIAN' || r === 'EXTERNAL_TECHNICIAN';
  }

  protected isManagerOrAdmin(): boolean {
    const role = this.normalizeRole();
    return [
      'SYSTEM_ADMIN',
      'SUPER_ADMIN',
      'ADMIN',
      'OPERATIONS_MANAGER',
      'MANAGER'
    ].includes(role);
  }

  protected canCreate(): boolean {
    const role = this.normalizeRole();
    return this.isManagerOrAdmin() || role === 'EMPLOYEE';
  }

  protected canEdit(): boolean {
    return this.isManagerOrAdmin();
  }

  protected canDelete(): boolean {
    return this.isManagerOrAdmin();
  }

  protected isClosedTicket(request: MaintenanceRequest): boolean {
    const closedStatuses: MaintenanceStatus[] = ['RESOLVED', 'COMPLETED', 'VERIFIED', 'NOT_REPAIRABLE', 'UNREPAIRABLE', 'CANCELLED'];
    return closedStatuses.includes(request.status);
  }

  protected onUpdateWork(request: MaintenanceRequest): void {
    this.router.navigate(['/maintenance', request.id, 'update-work']);
  }

  // ─── Table Configuration ──────────────────────────────────────────────────
  protected readonly maintenanceColumns: TableColumn[] = [
    { key: 'requestId', label: 'Request ID', cssClass: 'font-label-md text-primary whitespace-nowrap' },
    { key: 'asset', label: 'Asset', cssClass: 'whitespace-nowrap' },
    { key: 'issue', label: 'Issue', cssClass: 'min-w-[150px]' },
    { key: 'priority', label: 'Priority', cssClass: 'whitespace-nowrap' },
    { key: 'status', label: 'Status', cssClass: 'whitespace-nowrap' },
    { key: 'createdAt', label: 'Created Date', cssClass: 'whitespace-nowrap' },
    { key: 'actions', label: 'Action', cssClass: 'text-center whitespace-nowrap', headerCssClass: 'text-center' },
  ];

  protected readonly paginationConfig: PaginationConfig = {
    currentPage: this.maintenanceService.currentPage,
    totalPages: this.maintenanceService.totalPages,
    totalCount: this.maintenanceService.totalFilteredCount,
    pageSize: this.maintenanceService.pageSize,
    onPreviousPage: () => this.maintenanceService.setPage(this.maintenanceService.currentPage() - 1),
    onNextPage: () => this.maintenanceService.setPage(this.maintenanceService.currentPage() + 1),
    onSetPage: (page: number) => this.maintenanceService.setPage(page),
  };

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  public ngOnInit(): void {
    this.maintenanceService.loadRequestsFromApi();

    // FIX: Assets page se "Send to Maintenance" click hone par
    // ?assetId=...&openForm=true query params check karein aur form kholein
    this.route.queryParams.subscribe((params) => {
      if (params['openForm'] === 'true' && params['assetId']) {
        this.preselectedAssetId.set(params['assetId']);
        this.editingRequest.set(null);
        this.isFormOpen.set(true);

        // URL se query params hata dein taake refresh/back par form dobara na khule
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true,
        });
      }
    });
  }

  @HostListener('document:click')
  protected onDocumentClick(): void {
    this.closeActionMenu();
  }

  @HostListener('document:keydown.escape')
  protected onEscapeKey(): void {
    if (this.isDrawerOpen()) this.closeDrawer();
    if (this.isFormOpen()) this.closeForm();
  }

  // ─── Filter Handlers ──────────────────────────────────────────────────────
  protected readonly statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'To Do', value: 'TODO' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Under Review', value: 'REVIEW' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Verified', value: 'VERIFIED' },
    { label: 'Not Repairable', value: 'UNREPAIRABLE' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  protected readonly priorityOptions = [
    { label: 'All Priorities', value: '' },
    { label: 'Low', value: 'LOW' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'High', value: 'HIGH' },
    { label: 'Critical', value: 'CRITICAL' },
  ];

  protected readonly typeOptions = [
    { label: 'All Types', value: '' },
    { label: 'Preventive', value: 'PREVENTIVE' },
    { label: 'Corrective', value: 'CORRECTIVE' },
    { label: 'Emergency', value: 'EMERGENCY' },
    { label: 'Inspection', value: 'INSPECTION' },
    { label: 'Upgrade', value: 'UPGRADE' },
  ];

  protected onStatusSelect(value: string | number): void {
    this.maintenanceService.setStatusFilter(String(value || ''));
  }

  protected onPrioritySelect(value: string | number): void {
    this.maintenanceService.setPriorityFilter(String(value || ''));
  }

  protected onTypeSelect(value: string | number): void {
    this.maintenanceService.setTypeFilter(String(value || ''));
  }

  protected onStatusChange(event: Event): void {
    this.maintenanceService.setStatusFilter((event.target as HTMLSelectElement).value);
  }

  protected onPriorityChange(event: Event): void {
    this.maintenanceService.setPriorityFilter((event.target as HTMLSelectElement).value);
  }

  protected onTypeChange(event: Event): void {
    this.maintenanceService.setTypeFilter((event.target as HTMLSelectElement).value);
  }

  protected hasActiveFilters(): boolean {
    return !!(
      this.maintenanceService.searchQuery() ||
      this.maintenanceService.selectedStatus() ||
      this.maintenanceService.selectedPriority() ||
      this.maintenanceService.selectedType()
    );
  }

  protected clearFilters(): void {
    this.maintenanceService.clearFilters();
  }

  // ─── Row Actions ──────────────────────────────────────────────────────────
  protected onViewRequest(request: MaintenanceRequest): void {
    this.selectedRequest.set(request);
    this.isDrawerOpen.set(true);
  }

  protected closeDrawer(): void {
    this.isDrawerOpen.set(false);
    setTimeout(() => this.selectedRequest.set(null), 300);
  }

  protected onStatusUpdated(): void {
    this.maintenanceService.loadRequestsFromApi();
    this.closeDrawer();
  }

  protected onNewRequest(): void {
    if (!this.canCreate()) {
      this.toastService.presentToast('You do not have permission to create maintenance requests.', 2500, 'warning');
      return;
    }
    this.preselectedAssetId.set(null);
    this.editingRequest.set(null);
    this.isFormOpen.set(true);
  }

  protected onEditRequest(request: MaintenanceRequest): void {
    if (!this.canEdit()) {
      this.toastService.presentToast('You do not have permission to edit maintenance requests.', 2500, 'warning');
      return;
    }
    this.preselectedAssetId.set(null);
    this.editingRequest.set(request);
    this.isDrawerOpen.set(false);
    this.isFormOpen.set(true);
  }

  protected closeForm(): void {
    this.isFormOpen.set(false);
    this.editingRequest.set(null);
    this.preselectedAssetId.set(null);
  }

  protected onFormSaved(): void {
    this.closeForm();
    this.maintenanceService.loadRequestsFromApi();
  }

  protected onDeleteRequest(request: MaintenanceRequest): void {
    this.pendingDeleteRequest.set(request);
  }

  protected onConfirmDelete(): void {
    const request = this.pendingDeleteRequest();
    if (!request) return;

    this.maintenanceService.deleteRequest(request.id).subscribe({
      next: () => {
        this.toastService.presentToast(`Request ${request.requestId} deleted successfully.`, 2000, 'success');
        this.pendingDeleteRequest.set(null);
      },
      error: () => {
        this.toastService.presentToast(`Failed to delete ${request.requestId}.`, 2000, 'error');
        this.pendingDeleteRequest.set(null);
      }
    });
  }

  protected onCancelDelete(): void {
    this.pendingDeleteRequest.set(null);
  }

  // ─── FIX: Status-change dropdown menu (In Progress → Completed / Not Repairable, etc.) ──
  protected toggleActionMenu(event: MouseEvent, requestId: string): void {
    event.stopPropagation();
    this.activeMenuRequestId.set(this.activeMenuRequestId() === requestId ? null : requestId);
  }

  protected closeActionMenu(): void {
    this.activeMenuRequestId.set(null);
  }

  protected getAllowedNextStatuses(request: MaintenanceRequest): MaintenanceStatus[] {
    return this.maintenanceService.getAllowedNextStatuses(request.status);
  }

  protected getStatusActionLabel(status: MaintenanceStatus): string {
    const labels: Partial<Record<MaintenanceStatus, string>> = {
      TODO:        'Mark To Do',
      IN_PROGRESS: 'Start Progress',
      REVIEW:      'Submit for Review',
      COMPLETED:   'Mark Completed',
      VERIFIED:    'Verify & Close',
      CANCELLED:   'Cancel Request',
    };
    return labels[status] ?? status;
  }

  protected getStatusActionIcon(status: MaintenanceStatus): string {
    const icons: Partial<Record<MaintenanceStatus, string>> = {
      TODO:        'checklist',
      IN_PROGRESS: 'play_circle',
      REVIEW:      'rate_review',
      COMPLETED:   'check_circle',
      VERIFIED:    'verified',
      CANCELLED:   'cancel',
    };
    return icons[status] ?? 'sync';
  }

  protected onQuickStatusChange(request: MaintenanceRequest, newStatus: MaintenanceStatus): void {
    if (!this.canEdit()) {
      this.toastService.presentToast('You do not have permission to change status.', 2500, 'warning');
      this.closeActionMenu();
      return;
    }

    this.maintenanceService.updateStatus(request.id, { status: newStatus }).subscribe({
      next: () => {
        this.toastService.presentToast(
          `Request ${request.requestId} marked as ${this.maintenanceService.getStatusLabel(newStatus)}.`,
          2000, 'success'
        );
        this.closeActionMenu();
      },
      error: () => {
        this.toastService.presentToast(`Failed to update status for ${request.requestId}.`, 2000, 'error');
        this.closeActionMenu();
      }
    });
  }

  // ─── Template Helpers ─────────────────────────────────────────────────────
  protected getMaintenanceRowClass(request: MaintenanceRequest): string {
    return request.status === 'CANCELLED' ? 'h-14 opacity-60' : 'h-14';
  }

  protected maintenanceTrackBy(request: MaintenanceRequest): string {
    return request.id;
  }

  protected getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  protected getPriorityDotClass(priority: MaintenancePriority): string {
    switch (priority) {
      case 'LOW': return 'bg-on-surface-variant';
      case 'MEDIUM': return 'bg-on-tertiary-fixed-variant';
      case 'HIGH': return 'bg-secondary';
      case 'CRITICAL': return 'bg-error';
      default: return 'bg-on-surface-variant';
    }
  }
}