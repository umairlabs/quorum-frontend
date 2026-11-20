import { inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AssetService } from '../../pages/assets/services/asset.service';

export interface BreadcrumbItem {
  label: string;
  url?: string;
  isLast?: boolean;
  action?: () => void;
}

export interface BreadcrumbState {
  showBackArrow: boolean;
  backUrl?: string;
  items: BreadcrumbItem[];
}

@Injectable({
  providedIn: 'root'
})
export class BreadcrumbService {
  private readonly router = inject(Router);
  private readonly assetService = inject(AssetService);

  public readonly breadcrumbs = signal<BreadcrumbState>({
    showBackArrow: false,
    items: [
      { label: 'AssetFlow' },
      { label: 'Dashboard', url: '/dashboard', isLast: true }
    ]
  });

  /** Temporarily override the breadcrumb (e.g. for overlay forms that don't change the route) */
  public setOverride(state: BreadcrumbState): void {
    this.breadcrumbs.set(state);
  }

  /** Restore breadcrumb from the current URL */
  public clearOverride(): void {
    this.updateBreadcrumbs(this.router.url);
  }
  private getSupplierById(id: string): any {
    const service = inject(AssetService);
    // Since we need purchase service to find supplier, we can dynamically retrieve it
    try {
      const injector = (this as any).injector;
      // Alternatively, we can let the detail components call setOverride, which they do!
      // But we still need the fallback routing in updateBreadcrumbs to work fine.
    } catch {}
    return null;
  }

  private getPurchasesList(): any[] {
    return [];
  }

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.updateBreadcrumbs(event.urlAfterRedirects || event.url);
      });

    this.updateBreadcrumbs(this.router.url);
  }

  private updateBreadcrumbs(url: string): void {
    const pathWithoutQuery = url.split('?')[0].split('#')[0];
    const segments = pathWithoutQuery.split('/').filter(Boolean);

    if (segments.length === 0 || segments[0] === 'dashboard') {
      this.breadcrumbs.set({
        showBackArrow: false,
        items: [
          { label: 'AssetFlow' },
          { label: 'Dashboard', url: '/dashboard', isLast: true }
        ]
      });
      return;
    }

    if (segments[0] === 'assets') {
      if (segments.length === 1) {
        this.breadcrumbs.set({
          showBackArrow: false,
          items: [
            { label: 'AssetFlow' },
            { label: 'Assets', url: '/assets', isLast: true }
          ]
        });
      } else if (segments[1] === 'create') {
        this.breadcrumbs.set({
          showBackArrow: false,
          items: [
            { label: 'AssetFlow' },
            { label: 'Assets', url: '/assets' },
            { label: 'Create Asset', url: '/assets/create', isLast: true }
          ]
        });
      } else if (segments[1] === 'inventory' && segments.length === 3) {
        this.breadcrumbs.set({
          showBackArrow: false,
          items: [
            { label: 'AssetFlow' },
            { label: 'Assets', url: '/assets' },
            { label: 'Inspect Asset', isLast: true }
          ]
        });
      } else if (segments.length === 3 && segments[2] === 'edit') {
        const assetId = segments[1];
        const asset = this.assetService.getAssetById(assetId);
        this.breadcrumbs.set({
          showBackArrow: false,
          items: [
            { label: 'AssetFlow' },
            { label: 'Assets', url: '/assets' },
            { label: asset ? asset.name : 'Edit Asset', url: `/assets/${assetId}` },
            { label: 'Edit Asset', url: `/assets/${assetId}/edit`, isLast: true }
          ]
        });
      } else {
        const assetId = segments[1];
        const asset = this.assetService.getAssetById(assetId);
        const label = asset ? `${asset.name} (${asset.serialNumber})` : assetId.toUpperCase();

        this.breadcrumbs.set({
          showBackArrow: false,
          backUrl: '/assets',
          items: [
            { label: 'AssetFlow' },
            { label: 'Assets', url: '/assets' },
            { label: label, url: `/assets/${assetId}`, isLast: true }
          ]
        });
      }
      return;
    }

    if (segments[0] === 'maintenance') {
      this.breadcrumbs.set({
        showBackArrow: false,
        items: [
          { label: 'AssetFlow' },
          { label: 'Maintenance', url: '/maintenance', isLast: true }
        ]
      });
      return;
    }

    if (segments[0] === 'assignments') {
      if (segments.length === 1) {
        this.breadcrumbs.set({
          showBackArrow: false,
          items: [
            { label: 'AssetFlow' },
            { label: 'Assignments', url: '/assignments', isLast: true }
          ]
        });
      } else if (segments[1] === 'create') {
        this.breadcrumbs.set({
          showBackArrow: false,
          items: [
            { label: 'AssetFlow' },
            { label: 'Assignments', url: '/assignments' },
            { label: 'New Assignment', url: '/assignments/create', isLast: true }
          ]
        });
      } else if (segments.length === 3 && segments[2] === 'edit') {
        this.breadcrumbs.set({
          showBackArrow: false,
          items: [
            { label: 'AssetFlow' },
            { label: 'Assignments', url: '/assignments' },
            { label: 'Edit Assignment', url: `/assignments/${segments[1]}/edit`, isLast: true }
          ]
        });
      } else {
        const assignmentId = segments[1];

        this.breadcrumbs.set({
          showBackArrow: false,
          backUrl: '/assignments',
          items: [
            { label: 'AssetFlow' },
            { label: 'Assignments', url: '/assignments' },
            { label: 'Assignment Details', url: `/assignments/${assignmentId}`, isLast: true }
          ]
        });
      }
      return;
    }

    if (segments[0] === 'settings') {
      if (segments.length === 1) {
        this.breadcrumbs.set({
          showBackArrow: false,
          items: [
            { label: 'AssetFlow' },
            { label: 'Settings', url: '/settings', isLast: true }
          ]
        });
      } else if (segments[1] === 'profile') {
        this.breadcrumbs.set({
          showBackArrow: false,
          items: [
            { label: 'AssetFlow' },
            { label: 'Settings', url: '/settings' },
            { label: 'Profile Settings', url: '/settings/profile', isLast: true }
          ]
        });
      } else if (segments[1] === 'company-information') {
        this.breadcrumbs.set({
          showBackArrow: false,
          items: [
            { label: 'AssetFlow' },
            { label: 'Settings', url: '/settings' },
            { label: 'Company Information', url: '/settings/company-information', isLast: true }
          ]
        });
      } else if (segments[1] === 'categories') {
        this.breadcrumbs.set({
          showBackArrow: false,
          items: [
            { label: 'AssetFlow' },
            { label: 'Settings', url: '/settings' },
            { label: 'Asset Categories', url: '/settings/categories', isLast: true }
          ]
        });
      } else if (segments[1] === 'manage-users') {
        this.breadcrumbs.set({
          showBackArrow: false,
          items: [
            { label: 'AssetFlow' },
            { label: 'Settings', url: '/settings' },
            { label: 'Manage Users', url: '/settings/manage-users', isLast: true }
          ]
        });
      } else {
        const subLabel = segments[1]
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (c: string) => c.toUpperCase());
        this.breadcrumbs.set({
          showBackArrow: false,
          items: [
            { label: 'AssetFlow' },
            { label: 'Settings', url: '/settings' },
            { label: subLabel, isLast: true }
          ]
        });
      }
      return;
    }

    if (segments[0] === 'users') {
      this.breadcrumbs.set({
        showBackArrow: false,
        items: [
          { label: 'AssetFlow' },
          { label: 'Employees', url: '/users', isLast: true }
        ]
      });
      return;
    }

    if (segments[0] === 'depreciation') {
      this.breadcrumbs.set({
        showBackArrow: false,
        items: [
          { label: 'AssetFlow' },
          { label: 'Depreciation', url: '/depreciation', isLast: true }
        ]
      });
      return;
    }

    if (segments[0] === 'audit-logs') {
      this.breadcrumbs.set({
        showBackArrow: false,
        items: [
          { label: 'AssetFlow' },
          { label: 'Audit Logs', url: '/audit-logs', isLast: true }
        ]
      });
      return;
    }

    if (segments[0] === 'purchases') {
      if (segments.length === 1) {
        this.breadcrumbs.set({
          showBackArrow: false,
          items: [
            { label: 'AssetFlow' },
            { label: 'Purchases', url: '/purchases', isLast: true }
          ]
        });
      } else if (segments[1] === 'suppliers' && segments.length === 3) {
        const supplierId = segments[2];
        const supplier = this.getSupplierById(supplierId);
        const name = supplier ? supplier.company : 'Supplier Details';
        this.breadcrumbs.set({
          showBackArrow: false,
          items: [
            { label: 'AssetFlow' },
            { label: 'Purchases', url: '/purchases' },
            { label: 'Suppliers' },
            { label: name, url: `/purchases/suppliers/${supplierId}`, isLast: true }
          ]
        });
      } else {
        const purchaseId = segments[1];
        const purchase = this.getPurchasesList().find((p: any) => p.id === purchaseId);
        const label = purchase ? purchase.purchaseNumber : purchaseId.toUpperCase();
        this.breadcrumbs.set({
          showBackArrow: false,
          items: [
            { label: 'AssetFlow' },
            { label: 'Purchases', url: '/purchases' },
            { label: label, url: `/purchases/${purchaseId}`, isLast: true }
          ]
        });
      }
      return;
    }

    // fallback — کوئی بھی unknown route
    const title = segments[0].charAt(0).toUpperCase() + segments[0].slice(1).replace(/-/g, ' ');
    this.breadcrumbs.set({
      showBackArrow: false,
      items: [
        { label: 'AssetFlow' },
        { label: title, url: `/${segments[0]}`, isLast: true }
      ]
    });
  }
}
