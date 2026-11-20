import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from '../services/notification.service';
import { CompanySettingsApisService } from '../../settings/services/company-settings-apis.service';
import { BreadcrumbService } from '../../../core/services/breadcrumb.service';
import {
  NotificationFilter,
  NotificationItem,
  NotificationType,
} from '../../../core/interfaces/notification.interface';
import { CompanySettings, COMPANY_SETTINGS_DEFAULTS } from '../../../core/interfaces/company-settings.interface';
import { AuthApisService } from '../../../core/services/api/auth-apis.service';
import { ConfirmDialogComponent } from '../../../core/components/confirm-dialog/confirm-dialog.component';

interface FilterTab {
  id: NotificationFilter;
  label: string;
  count?: number;
}

// Sub-type constants — must match what the backend writes in Notification.sub_type
const ASSET_REQUEST_SUB_TYPES = new Set([
  'ASSET_REQUEST_SUBMITTED',
  'ASSET_REQUEST_NEW',
  'ASSET_REQUEST_APPROVED',
  'ASSET_REQUEST_REJECTED',
  'ASSET_REQUEST_ASSIGNED',
  'ASSET_RECEIPT_CONFIRMED',
]);

@Component({
  selector: 'app-notifications-list',
  standalone: true,
  imports: [CommonModule, ConfirmDialogComponent],
  templateUrl: './notifications-list.component.html',
  styleUrls: ['./notifications-list.component.scss']
})
export class NotificationsListComponent implements OnInit {
  protected readonly notificationService: NotificationService = inject(NotificationService);
  private readonly companySettingsApi: CompanySettingsApisService = inject(CompanySettingsApisService);
  private readonly breadcrumbService: BreadcrumbService = inject(BreadcrumbService);
  private readonly router: Router = inject(Router);
  private readonly authService: AuthApisService = inject(AuthApisService);

  protected companySettings: WritableSignal<CompanySettings> = signal<CompanySettings>({ ...COMPANY_SETTINGS_DEFAULTS });
  protected readonly isDeleteAllModalOpen = signal<boolean>(false);
  protected readonly pendingDeleteItem = signal<NotificationItem | null>(null);

  // ------------------------------------------------------------------
  // Role helpers
  // ------------------------------------------------------------------

  private getCurrentRole(): string {
    return (
      this.authService.currentUser()?.role ||
      localStorage.getItem('role') ||
      ''
    ).toUpperCase().replace(/\s+/g, '_');
  }

  private isEmployee(): boolean {
    return this.getCurrentRole() === 'EMPLOYEE';
  }

  private isManagerOrAdmin(): boolean {
    const r = this.getCurrentRole();
    return (
      r === 'OPERATIONS_MANAGER' ||
      r === 'SYSTEM_ADMIN' ||
      r === 'SUPER_ADMIN' ||
      r === 'ADMIN' ||
      r === 'MANAGER'
    );
  }

  private isTechnician(): boolean {
    const r = this.getCurrentRole();
    return r === 'TECH' || r === 'TECHNICIAN' || r === 'EXTERNAL_TECHNICIAN';
  }

  // ------------------------------------------------------------------
  // Filter tabs — Requests tab sits between Read and Maintenance
  // ------------------------------------------------------------------

  protected get filterTabs(): FilterTab[] {
    const allTabs: FilterTab[] = [
      { id: 'ALL',         label: 'All' },
      { id: 'UNREAD',      label: 'Unread' },
      { id: 'READ',        label: 'Read' },
      { id: 'REQUESTS',    label: 'Requests' },
      { id: 'MAINTENANCE', label: 'Maintenance' },
      { id: 'ASSETS',      label: 'Assets' },
      { id: 'ASSIGNMENTS', label: 'Assignments' },
      { id: 'WARRANTY',    label: 'Warranty' },
      { id: 'SYSTEM',      label: 'System' },
    ];

    if (this.isEmployee() || this.isTechnician()) {
      return allTabs.filter(t => t.id !== 'WARRANTY' && t.id !== 'SYSTEM');
    }
    return allTabs;
  }

  // ------------------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------------------

  ngOnInit(): void {
    this.breadcrumbService.setOverride({
      showBackArrow: false,
      items: [
        { label: 'AssetFlow' },
        { label: 'Notifications', isLast: true }
      ]
    });
    this.loadCompanySettings();
    this.notificationService.loadInitialData();
  }

  protected goBack(): void {
    const backUrl = this.breadcrumbService.breadcrumbs().backUrl;
    if (backUrl) {
      this.router.navigate([backUrl]);
    } else {
      window.history.back();
    }
  }

  private loadCompanySettings(): void {
    this.companySettingsApi.getCompanySettings().subscribe({
      next: (settings: CompanySettings) => {
        if (settings) {
          this.companySettings.set(settings);
        }
      },
      error: () => {
        this.companySettings.set({ ...COMPANY_SETTINGS_DEFAULTS });
      }
    });
  }

  // ------------------------------------------------------------------
  // Filter / read / delete actions
  // ------------------------------------------------------------------

  protected onSelectFilter(filter: NotificationFilter): void {
    this.notificationService.setFilter(filter);
  }

  protected onMarkAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  protected onToggleReadStatus(event: Event, item: NotificationItem): void {
    event.stopPropagation();
    if (item.isRead) {
      this.notificationService.markAsUnread(item.id);
    } else {
      this.notificationService.markAsRead(item.id);
    }
  }

  protected onDeleteNotification(event: Event, item: NotificationItem): void {
    event.stopPropagation();
    this.pendingDeleteItem.set(item);
  }

  protected confirmDeleteNotification(): void {
    const item = this.pendingDeleteItem();
    if (item) {
      this.notificationService.deleteNotification(item.id);
      this.pendingDeleteItem.set(null);
    }
  }

  protected cancelDeleteNotification(): void {
    this.pendingDeleteItem.set(null);
  }

  protected onDeleteAllNotifications(): void {
    this.isDeleteAllModalOpen.set(true);
  }

  protected confirmDeleteAllNotifications(): void {
    this.isDeleteAllModalOpen.set(false);
    this.notificationService.deleteAllNotifications();
  }

  protected cancelDeleteAllNotifications(): void {
    this.isDeleteAllModalOpen.set(false);
  }

  // ------------------------------------------------------------------
  // Notification click — role-aware, sub-type–aware routing
  // ------------------------------------------------------------------

  protected onNotificationClick(item: NotificationItem): void {
    // Only mark as read — do NOT navigate away from notifications page.
    // Navigation happens only via dedicated action buttons (if added later).
    if (!item.isRead) {
      this.notificationService.markAsRead(item.id);
    }
  }

  // ------------------------------------------------------------------
  // Icon / badge helpers — Requests uses a distinct icon
  // ------------------------------------------------------------------

  protected isAssetRequestNotification(item: NotificationItem): boolean {
    const sub = (item.subType || '').toUpperCase();
    return ASSET_REQUEST_SUB_TYPES.has(sub);
  }

  protected getIconForType(type: NotificationType, subType?: string): string {
    const sub = (subType || '').toUpperCase();
    if (ASSET_REQUEST_SUB_TYPES.has(sub)) {
      // Specific icons per request sub-type
      if (sub === 'ASSET_REQUEST_SUBMITTED' || sub === 'ASSET_REQUEST_NEW') return 'inbox';
      if (sub === 'ASSET_REQUEST_APPROVED')  return 'task_alt';
      if (sub === 'ASSET_REQUEST_REJECTED')  return 'cancel';
      if (sub === 'ASSET_REQUEST_ASSIGNED')  return 'assignment_turned_in';
      if (sub === 'ASSET_RECEIPT_CONFIRMED') return 'fact_check';
      return 'inbox';
    }
    switch (type) {
      case 'MAINTENANCE':  return 'build';
      case 'ASSETS':       return 'inventory_2';
      case 'ASSIGNMENTS':  return 'assignment_ind';
      case 'WARRANTY':     return 'verified';
      case 'SYSTEM':       return 'dns';
      default:             return 'notifications';
    }
  }

  protected getTypeBadgeClass(type: NotificationType, subType?: string): string {
    const sub = (subType || '').toUpperCase();
    if (ASSET_REQUEST_SUB_TYPES.has(sub)) {
      if (sub === 'ASSET_REQUEST_APPROVED' || sub === 'ASSET_RECEIPT_CONFIRMED') {
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      }
      if (sub === 'ASSET_REQUEST_REJECTED') {
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
      }
      // Submitted / New / Assigned
      return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
    }
    switch (type) {
      case 'MAINTENANCE':  return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'ASSETS':       return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'ASSIGNMENTS':  return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'WARRANTY':     return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'SYSTEM':       return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
      default:             return 'bg-primary/10 text-primary border-primary/20';
    }
  }

  // ------------------------------------------------------------------
  // Date formatting
  // ------------------------------------------------------------------

  protected formatTime(dateStr: string): string {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) {
      return 'Just now';
    }
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    }

    const fmt = this.companySettings().dateFormat || 'DD/MM/YYYY';
    const day   = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year  = date.getFullYear();

    let formattedDate = `${day}/${month}/${year}`;
    if (fmt === 'MM/DD/YYYY') {
      formattedDate = `${month}/${day}/${year}`;
    } else if (fmt === 'YYYY-MM-DD') {
      formattedDate = `${year}-${month}-${day}`;
    }

    const hours = String(date.getHours()).padStart(2, '0');
    const mins  = String(date.getMinutes()).padStart(2, '0');

    return `${formattedDate} ${hours}:${mins}`;
  }
}
