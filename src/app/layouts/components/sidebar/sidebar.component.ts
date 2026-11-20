import { Component, inject, Signal, computed, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LayoutService } from '../../../core/services/layout.service';
import { AuthApisService } from '../../../core/services/api/auth-apis.service';
import { ConfirmDialogComponent } from '../../../core/components/confirm-dialog/confirm-dialog.component';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[]; // undefined = visible to all roles
}

function normalizeRole(role: string | null | undefined): string {
  return (role || '').toUpperCase().replace(/\s+/g, '_');
}

function isTechRole(role: string | null | undefined): boolean {
  const r = normalizeRole(role);
  return r === 'TECH' || r === 'TECHNICIAN' || r === 'EXTERNAL_TECHNICIAN';
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ConfirmDialogComponent],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  protected readonly layoutService = inject(LayoutService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthApisService);

  protected readonly isLogoutModalOpen = signal<boolean>(false);

  private readonly allNavItems: NavItem[] = [
    { label: 'Dashboard',    icon: 'dashboard',       route: '/dashboard'    },
    { label: 'Assets',       icon: 'inventory_2',     route: '/assets'       },
    { label: 'Purchases',    icon: 'shopping_cart',   route: '/purchases',   roles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
    { label: 'Assignments',  icon: 'assignment_ind',  route: '/assignments', roles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
    { label: 'Maintenance',  icon: 'build',           route: '/maintenance'  },
    { label: 'Audit Logs',   icon: 'history_edu',     route: '/audit-logs',   roles: ['SYSTEM_ADMIN', 'SUPER_ADMIN', 'ADMIN'] },
    { label: 'Depreciation', icon: 'trending_down',   route: '/depreciation', roles: ['SYSTEM_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'OPERATIONS_MANAGER', 'MANAGER'] },
    { label: 'Notifications',icon: 'notifications',   route: '/notifications'},
    { label: 'Employees',    icon: 'group',           route: '/users',       roles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
    { label: 'Settings',     icon: 'settings',        route: '/settings',    roles: ['SYSTEM_ADMIN', 'SUPER_ADMIN', 'ADMIN'] },
  ];

  protected readonly navItems: Signal<NavItem[]> = computed(() => {
    const role = normalizeRole(
      this.authService.currentUser()?.role || localStorage.getItem('role')
    );

    if (isTechRole(role)) {
      return this.allNavItems.filter((item) =>
        ['/dashboard', '/maintenance', '/notifications'].includes(item.route)
      );
    }

    if (role === 'EMPLOYEE') {
      return this.allNavItems
        .filter((item) => ['/assets', '/maintenance', '/notifications'].includes(item.route))
        .map((item) => (item.route === '/assets' ? { ...item, label: 'My Assets' } : item));
    }

    return this.allNavItems.filter((item) => !item.roles || item.roles.includes(role));
  });

  protected readonly currentUser = this.authService.currentUser;

  protected readonly userDisplayName: Signal<string> = computed(() => {
    const user = this.authService.currentUser();
    if (!user) {
      const saved = localStorage.getItem('user');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const name = parsed.fullName || `${parsed.firstName || ''} ${parsed.lastName || ''}`.trim();
          return name || parsed.email || 'Enterprise Asset Management';
        } catch {
          return 'Enterprise Asset Management';
        }
      }
      return 'Enterprise Asset Management';
    }
    const name = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return name || user.email || 'Enterprise Asset Management';
  });

  protected onNavItemClick(item: NavItem): void {
    this.layoutService.closeMobileMenu();
    this.layoutService.notifyNavItemClick(item.route);

    if (this.router.url === item.route || this.router.url.startsWith(item.route + '/')) {
      this.router.navigateByUrl(item.route);
    }
  }

  protected onLogout(): void {
    this.isLogoutModalOpen.set(true);
  }

  protected onConfirmLogout(): void {
    this.isLogoutModalOpen.set(false);
    this.layoutService.closeMobileMenu();
    this.authService.onLogout();
  }

  protected onCancelLogout(): void {
    this.isLogoutModalOpen.set(false);
  }
}