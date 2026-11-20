import { Component, inject, OnInit, signal, WritableSignal, computed, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationApisService } from '../../notifications/services/notification-apis.service';
import { NotificationService } from '../../notifications/services/notification.service';
import { AuthApisService } from '../../../core/services/api/auth-apis.service';
import { ToastService } from '../../../core/services/toast.service';
import { BreadcrumbService } from '../../../core/services/breadcrumb.service';
import { DEFAULT_NOTIFICATION_PREFERENCES, NotificationPreferences } from '../../../core/interfaces/notification.interface';

interface PreferenceItem {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
}

interface PreferenceCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  items: PreferenceItem[];
  visibleForRoles?: string[]; // undefined = all permitted roles
}

function normalizeRole(role: string | null | undefined): string {
  return (role || '').toUpperCase().replace(/\s+/g, '_');
}

@Component({
  selector: 'app-notification-preferences',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-preferences.component.html',
  styleUrls: ['./notification-preferences.component.scss']
})
export class NotificationPreferencesComponent implements OnInit {
  private readonly notificationApi: NotificationApisService = inject(NotificationApisService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly authService: AuthApisService = inject(AuthApisService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly breadcrumbService: BreadcrumbService = inject(BreadcrumbService);

  protected readonly preferences: WritableSignal<NotificationPreferences> = signal<NotificationPreferences>({
    ...DEFAULT_NOTIFICATION_PREFERENCES
  });
  protected readonly isLoading: WritableSignal<boolean> = signal<boolean>(true);
  protected readonly isSaving: WritableSignal<boolean> = signal<boolean>(false);

  protected goBack(): void {
    const backUrl = this.breadcrumbService.breadcrumbs().backUrl;
    if (backUrl) {
      window.location.href = backUrl;
    } else {
      window.history.back();
    }
  }

  protected readonly userRole: Signal<string> = computed(() => {
    return normalizeRole(
      this.authService.currentUser()?.role || localStorage.getItem('role')
    );
  });

  protected readonly isTechnician: Signal<boolean> = computed(() => {
    return this.userRole() === 'EXTERNAL_TECHNICIAN' || this.userRole() === 'TECHNICIAN';
  });

  protected readonly isEmployee: Signal<boolean> = computed(() => {
    return this.userRole() === 'EMPLOYEE';
  });

  protected readonly isAdmin: Signal<boolean> = computed(() => {
    const r = this.userRole();
    return r === 'SYSTEM_ADMIN' || r === 'SUPER_ADMIN' || r === 'ADMIN';
  });

  protected readonly categories: Signal<PreferenceCategory[]> = computed(() => {
    const isTech = this.isTechnician();
    const isAdmin = this.isAdmin();

    const list: PreferenceCategory[] = [];

    // 1. Maintenance Category
    const maintenanceItems: PreferenceItem[] = [
      {
        key: 'maintenanceNewTicket',
        label: 'New Maintenance Ticket',
        description: 'Receive notifications when new maintenance tickets are created.'
      },
      {
        key: 'maintenanceAssignedToTech',
        label: 'Maintenance Ticket Assigned',
        description: 'Receive alerts when a maintenance ticket is assigned to a technician.'
      },
      {
        key: 'maintenanceStatusChanged',
        label: 'Status Changes',
        description: 'Receive updates when ticket status changes (In Progress, Completed, etc.).'
      },
      {
        key: 'maintenanceHighPriority',
        label: 'High Priority Alerts',
        description: 'Receive high priority maintenance ticket alerts.'
      },
      {
        key: 'maintenanceCriticalAlert',
        label: 'Critical Maintenance Alerts',
        description: 'Receive immediate critical maintenance ticket alerts.'
      },
      {
        key: 'maintenanceCompleted',
        label: 'Maintenance Completed',
        description: 'Receive notifications when repair work is marked as completed.'
      },
      {
        key: 'maintenanceUpdated',
        label: 'Ticket Updates',
        description: 'Receive notifications on general maintenance ticket updates.'
      }
    ];

    list.push({
      id: 'maintenance',
      title: 'Maintenance Notifications',
      description: 'Control alerts for maintenance tickets, repair status, and critical work assignments.',
      icon: 'build',
      items: maintenanceItems
    });

    // 2. Assets Category (Hidden for Technicians except Asset Maintenance Activity)
    if (isTech) {
      list.push({
        id: 'asset-maintenance',
        title: 'Asset Maintenance Notifications',
        description: 'Control alerts regarding asset repair and maintenance activities.',
        icon: 'inventory_2',
        items: [
          {
            key: 'assetMaintenanceActivity',
            label: 'Asset Maintenance Activity',
            description: 'Receive alerts on maintenance activities linked to physical asset units.'
          }
        ]
      });
    } else {
      list.push({
        id: 'assets',
        title: 'Asset Notifications',
        description: 'Control alerts regarding physical stock, status changes, and asset lifecycles.',
        icon: 'inventory_2',
        items: [
          {
            key: 'assetAssigned',
            label: 'Asset Assigned',
            description: 'Receive notifications when an asset is assigned.'
          },
          {
            key: 'assetTransferred',
            label: 'Asset Transferred',
            description: 'Receive notifications when an asset is transferred.'
          },
          {
            key: 'assetReturned',
            label: 'Asset Returned',
            description: 'Receive notifications when an asset is returned to inventory.'
          },
          {
            key: 'assetRetired',
            label: 'Asset Retired',
            description: 'Receive notifications when an asset is retired.'
          },
          {
            key: 'assetScrapped',
            label: 'Asset Scrapped',
            description: 'Receive notifications when an asset is scrapped.'
          },
          {
            key: 'assetMaintenanceActivity',
            label: 'Asset Maintenance Activity',
            description: 'Receive alerts on maintenance activities linked to assets.'
          }
        ]
      });
    }

    // 3. Assignment Notifications (Excluded for Technicians)
    if (!isTech) {
      list.push({
        id: 'assignments',
        title: 'Assignment Notifications',
        description: 'Control notifications for new assignments, transfers, and asset returns.',
        icon: 'assignment_ind',
        items: [
          {
            key: 'assignmentNew',
            label: 'New Asset Assignment',
            description: 'Receive notifications for new asset assignments.'
          },
          {
            key: 'assignmentTransfer',
            label: 'Asset Transfer',
            description: 'Receive notifications for asset transfer activities.'
          },
          {
            key: 'assignmentReturn',
            label: 'Asset Return',
            description: 'Receive notifications when assigned assets are returned.'
          }
        ]
      });
    }

    // 4. Warranty Notifications (Excluded for Technicians and Employees)
    if (!isTech && !this.isEmployee()) {
      list.push({
        id: 'warranty',
        title: 'Warranty Notifications',
        description: 'Control notifications for expiring and expired asset warranties.',
        icon: 'verified',
        items: [
          {
            key: 'warrantyExpiringSoon',
            label: 'Warranty Expiring Soon',
            description: 'Receive alerts when asset warranties are nearing expiration.'
          },
          {
            key: 'warrantyExpired',
            label: 'Warranty Expired',
            description: 'Receive alerts when asset warranties have expired.'
          }
        ]
      });
    }

    // 5. System Notifications (Admin only)
    if (isAdmin) {
      list.push({
        id: 'system',
        title: 'System Notifications',
        description: 'Control system-wide operational alerts and administrative notifications.',
        icon: 'dns',
        items: [
          {
            key: 'systemImportantAlerts',
            label: 'Important System Alerts',
            description: 'Receive critical system-level operational alerts.'
          },
          {
            key: 'systemRequiredActions',
            label: 'Required System Actions',
            description: 'Receive alerts for required system maintenance actions.'
          }
        ]
      });
    }

    return list;
  });

  ngOnInit(): void {
    this.breadcrumbService.setOverride({
      showBackArrow: false,
      items: [
        { label: 'AssetFlow' },
        { label: 'Settings', url: '/settings' },
        { label: 'Notification Preferences', isLast: true }
      ]
    });

    this.loadPreferences();
  }

  private loadPreferences(): void {
    this.isLoading.set(true);
    this.notificationApi.getPreferences().subscribe({
      next: (prefs: NotificationPreferences) => {
        if (prefs) {
          this.preferences.set({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...prefs });
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('[NotificationPreferences] Failed to load preferences:', err);
        this.isLoading.set(false);
      }
    });
  }

  protected enableAll(): void {
    this.updateAllPreferences(true);
  }

  protected disableAll(): void {
    this.updateAllPreferences(false);
  }

  private updateAllPreferences(enabled: boolean): void {
    const current: NotificationPreferences = this.preferences();
    const updated: NotificationPreferences = {
      ...current,
      maintenanceNewTicket: enabled,
      maintenanceAssignedToTech: enabled,
      maintenanceStatusChanged: enabled,
      maintenanceHighPriority: enabled,
      maintenanceCriticalAlert: enabled,
      maintenanceCompleted: enabled,
      maintenanceUpdated: enabled,
      assetAssigned: enabled,
      assetTransferred: enabled,
      assetReturned: enabled,
      assetRetired: enabled,
      assetScrapped: enabled,
      assetMaintenanceActivity: enabled,
      assignmentNew: enabled,
      assignmentTransfer: enabled,
      assignmentReturn: enabled,
      warrantyExpiringSoon: enabled,
      warrantyExpired: enabled,
      systemImportantAlerts: enabled,
      systemRequiredActions: enabled,
    };

    // Optimistic UI update
    this.preferences.set(updated);
    this.isSaving.set(true);

    const payload: Partial<NotificationPreferences> = {
      maintenanceNewTicket: enabled,
      maintenanceAssignedToTech: enabled,
      maintenanceStatusChanged: enabled,
      maintenanceHighPriority: enabled,
      maintenanceCriticalAlert: enabled,
      maintenanceCompleted: enabled,
      maintenanceUpdated: enabled,
      assetAssigned: enabled,
      assetTransferred: enabled,
      assetReturned: enabled,
      assetRetired: enabled,
      assetScrapped: enabled,
      assetMaintenanceActivity: enabled,
      assignmentNew: enabled,
      assignmentTransfer: enabled,
      assignmentReturn: enabled,
      warrantyExpiringSoon: enabled,
      warrantyExpired: enabled,
      systemImportantAlerts: enabled,
      systemRequiredActions: enabled,
    };

    this.notificationApi.updatePreferences(payload).subscribe({
      next: (res: NotificationPreferences) => {
        if (res) {
          this.preferences.set({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...res });
        }
        this.isSaving.set(false);
        this.notificationService.loadInitialData();
        const msg = enabled ? 'All notification alerts enabled.' : 'All notification alerts disabled.';
        this.toastService.presentToast(msg, 2000, 'success');
      },
      error: (err) => {
        console.error('[NotificationPreferences] Master update failed:', err);
        this.preferences.set(current);
        this.isSaving.set(false);
        this.toastService.presentToast('Failed to update all preferences.', 2500, 'error');
      }
    });
  }

  protected togglePreference(key: keyof NotificationPreferences): void {
    const current: NotificationPreferences = this.preferences();
    const newValue: boolean = !current[key];

    // Optimistic UI update
    const updated: NotificationPreferences = { ...current, [key]: newValue };
    this.preferences.set(updated);
    this.isSaving.set(true);

    const payload: Partial<NotificationPreferences> = { [key]: newValue };
    this.notificationApi.updatePreferences(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notificationService.loadInitialData();
        this.toastService.presentToast('Notification preference updated.', 1500, 'success');
      },
      error: (err) => {
        console.error('[NotificationPreferences] Update failed:', err);
        // Rollback
        this.preferences.set(current);
        this.isSaving.set(false);
        this.toastService.presentToast('Failed to save preference setting.', 2500, 'error');
      }
    });
  }
}
