import { Component, computed, inject, signal, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BreadcrumbService } from '../../../core/services/breadcrumb.service';
import { LayoutService } from '../../../core/services/layout.service';
import { NotificationService } from '../../../pages/notifications/services/notification.service';
import { AuthApisService } from '../../../core/services/api/auth-apis.service';
import { AssetService } from '../../../pages/assets/services/asset.service';
import { UserService } from '../../../pages/users/services/user.service';
import { ConfirmDialogComponent } from '../../../core/components/confirm-dialog/confirm-dialog.component';

export interface SearchResult {
  label: string;
  sublabel?: string;
  icon: string;
  iconClass: string;
  route: string;
  queryParams?: Record<string, string>;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ConfirmDialogComponent],
  templateUrl: './header.component.html'
})
export class HeaderComponent {
  protected readonly breadcrumbService = inject(BreadcrumbService);
  protected readonly layoutService     = inject(LayoutService);
  protected readonly notificationService = inject(NotificationService);
  private readonly authService         = inject(AuthApisService);
  private readonly assetService        = inject(AssetService);
  private readonly userService         = inject(UserService);
  private readonly router              = inject(Router);

  protected readonly currentUser       = this.authService.currentUser;
  protected readonly isLogoutModalOpen = signal<boolean>(false);

  // ── Search ────────────────────────────────────────────────────────────────
  protected readonly searchQuery   = signal<string>('');
  protected readonly showDropdown  = signal<boolean>(false);
  protected readonly selectedIndex = signal<number>(-1);

  private get role(): string {
    return (this.authService.currentUser()?.role || localStorage.getItem('role') || '').toUpperCase().replace(/\s+/g, '_');
  }

  private get isEmployee(): boolean { return this.role === 'EMPLOYEE'; }
  private get isManagerOrAdmin(): boolean {
    return ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(this.role);
  }
  private get isTech(): boolean {
    return ['EXTERNAL_TECHNICIAN', 'TECH', 'TECHNICIAN'].includes(this.role);
  }

  protected readonly searchResults: Signal<SearchResult[]> = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q || q.length < 2) return [];

    const results: SearchResult[] = [];

    // ── Assets / Units ───────────────────────────────────────────────────
    if (!this.isTech) {
      const assets = this.assetService.assets();
      for (const a of assets) {
        const name   = (a.name || '').toLowerCase();
        const serial = (a.serialNumber || '').toLowerCase();
        const brand  = (a.brand || '').toLowerCase();
        const model  = (a.model || '').toLowerCase();
        const cat    = typeof a.category === 'string'
          ? a.category.toLowerCase()
          : ((a.category as any)?.name || '').toLowerCase();

        if (name.includes(q) || serial.includes(q) || brand.includes(q) || model.includes(q) || cat.includes(q)) {
          if (this.isEmployee) {
            results.push({
              label: a.name,
              sublabel: serial ? `SN: ${a.serialNumber}` : cat,
              icon: 'inventory_2',
              iconClass: 'text-blue-600 bg-blue-50',
              route: '/assets',
              queryParams: { tab: 'my-assigned' }
            });
          } else {
            const baseId = a.id.includes('-unit-') ? a.id.split('-unit-')[0] : a.id;
            results.push({
              label: a.name,
              sublabel: serial ? `SN: ${a.serialNumber}` : cat,
              icon: 'inventory_2',
              iconClass: 'text-blue-600 bg-blue-50',
              route: `/assets/${baseId}`
            });
          }
          if (results.length >= 8) break;
        }
      }
    }

    // ── Users / Employees (manager/admin only) ───────────────────────────
    if (this.isManagerOrAdmin) {
      const users = this.userService.users();
      for (const u of users) {
        const name  = (u.fullName || `${u.firstName} ${u.lastName}`).toLowerCase();
        const email = u.email.toLowerCase();
        const dept  = (u.department || '').toLowerCase();
        const empId = (u.employeeId || '').toLowerCase();

        if (name.includes(q) || email.includes(q) || dept.includes(q) || empId.includes(q)) {
          results.push({
            label: u.fullName || `${u.firstName} ${u.lastName}`.trim(),
            sublabel: u.department || u.email,
            icon: 'person',
            iconClass: 'text-purple-600 bg-purple-50',
            route: '/users'
          });
          if (results.length >= 12) break;
        }
      }
    }

    // ── Page shortcuts (always) ──────────────────────────────────────────
    const pages: { keywords: string[]; label: string; route: string; icon: string; iconClass: string; roles?: string[] }[] = [
      { keywords: ['dashboard'], label: 'Dashboard', route: '/dashboard', icon: 'dashboard', iconClass: 'text-gray-600 bg-gray-100', roles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
      { keywords: ['asset', 'assets', 'inventory'], label: 'Assets', route: '/assets', icon: 'inventory_2', iconClass: 'text-blue-600 bg-blue-50' },
      { keywords: ['purchase', 'purchases', 'ledger'], label: 'Purchases', route: '/purchases', icon: 'shopping_cart', iconClass: 'text-orange-600 bg-orange-50', roles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
      { keywords: ['assignment', 'assignments'], label: 'Assignments', route: '/assignments', icon: 'assignment_ind', iconClass: 'text-indigo-600 bg-indigo-50', roles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
      { keywords: ['maintenance', 'repair', 'ticket'], label: 'Maintenance', route: '/maintenance', icon: 'build', iconClass: 'text-amber-600 bg-amber-50' },
      { keywords: ['notification', 'notifications'], label: 'Notifications', route: '/notifications', icon: 'notifications', iconClass: 'text-pink-600 bg-pink-50' },
      { keywords: ['settings', 'setting'], label: 'Settings', route: '/settings', icon: 'settings', iconClass: 'text-gray-600 bg-gray-100', roles: ['SYSTEM_ADMIN', 'SUPER_ADMIN', 'ADMIN'] },
      { keywords: ['employee', 'employees', 'users'], label: 'Employees', route: '/users', icon: 'group', iconClass: 'text-purple-600 bg-purple-50', roles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
    ];

    for (const page of pages) {
      if (page.roles && !page.roles.includes(this.role)) continue;
      if (page.keywords.some(k => k.includes(q) || q.includes(k))) {
        if (!results.find(r => r.route === page.route && !r.queryParams)) {
          results.push({ label: page.label, icon: page.icon, iconClass: page.iconClass, route: page.route });
        }
      }
    }

    return results.slice(0, 10);
  });

  protected onSearchFocus(): void {
    this.showDropdown.set(true);
  }

  protected onSearchBlur(): void {
    setTimeout(() => this.showDropdown.set(false), 200);
  }

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.selectedIndex.set(-1);
    this.showDropdown.set(true);

    // Load data if not loaded
    if (value.length >= 2) {
      this.assetService.loadAssetsFromApi();
      if (this.isManagerOrAdmin) this.userService.loadUsersFromApi();
    }
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    const results = this.searchResults();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex.set(Math.min(this.selectedIndex() + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex.set(Math.max(this.selectedIndex() - 1, -1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const idx = this.selectedIndex();
      const result = idx >= 0 ? results[idx] : results[0];
      if (result) this.navigateTo(result);
    } else if (event.key === 'Escape') {
      this.showDropdown.set(false);
      this.searchQuery.set('');
    }
  }

  protected navigateTo(result: SearchResult): void {
    this.showDropdown.set(false);
    this.searchQuery.set('');
    if (result.queryParams) {
      this.router.navigate([result.route], { queryParams: result.queryParams });
    } else {
      this.router.navigate([result.route]);
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  protected goBack(): void {
    const backUrl = this.breadcrumbService.breadcrumbs().backUrl;
    if (backUrl) this.router.navigate([backUrl]);
    else window.history.back();
  }

  protected openNotifications(): void { this.router.navigate(['/notifications']); }
  protected openAiAssistant():   void { this.router.navigate(['/ai-assistant']); }

  protected onLogout(): void       { this.isLogoutModalOpen.set(true); }
  protected onConfirmLogout(): void {
    this.isLogoutModalOpen.set(false);
    this.authService.onLogout();
  }
  protected onCancelLogout(): void { this.isLogoutModalOpen.set(false); }
}
