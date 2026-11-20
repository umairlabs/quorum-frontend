import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PurchaseService } from '../../assets/services/purchase.service';
import { AssetService } from '../../assets/services/asset.service';
import { ToastService } from '../../../core/services/toast.service';
import { BreadcrumbService } from '../../../core/services/breadcrumb.service';
import { AppCurrencyPipe } from '../../../core/pipes/currency.pipe';
import { StatusBadgeComponent } from '../../../core/components/status-badge/status-badge.component';
import { Supplier } from '../../../core/interfaces/supplier.interface';
import { Purchase } from '../../../core/interfaces/purchase.interface';

@Component({
  selector: 'app-supplier-detail',
  standalone: true,
  imports: [CommonModule, AppCurrencyPipe, StatusBadgeComponent],
  templateUrl: './supplier-detail.component.html'
})
export class SupplierDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly purchaseService = inject(PurchaseService);
  private readonly assetService = inject(AssetService);
  private readonly toastService = inject(ToastService);
  private readonly breadcrumbService = inject(BreadcrumbService);

  protected readonly supplier = signal<Supplier | null>(null);
  protected readonly supplierPurchases = signal<Purchase[]>([]);
  protected readonly loading = signal<boolean>(true);

  public ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadSupplierDetail(id);
    }
  }

  private loadSupplierDetail(id: string): void {
    this.loading.set(true);
    this.purchaseService.getSupplierDetailById(id).subscribe({
      next: (s) => {
        this.supplier.set(s);
        // Set dynamic breadcrumbs
        this.breadcrumbService.setOverride({
          showBackArrow: false,
          items: [
            { label: 'AssetFlow' },
            { label: 'Purchases', url: '/purchases' },
            { label: 'Suppliers' },
            { label: s.company, url: `/purchases/suppliers/${s.id}`, isLast: true }
          ]
        });

        // Load associated purchases
        this.purchaseService.loadPurchasesFromApi(); // Ensure loaded
        const all = this.purchaseService.purchases();
        const filtered = all.filter(p => {
          const supId = typeof p.supplier === 'object' ? p.supplier.id : p.supplier;
          return supId === s.id;
        });
        this.supplierPurchases.set(filtered);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toastService.presentToast('Failed to load supplier profile details.', 3000, 'error');
        this.router.navigate(['/purchases']);
      }
    });
  }

  protected goBack(): void {
    this.router.navigate(['/purchases']);
  }

  protected getAssetName(asset: any): string {
    if (!asset) return '—';
    if (typeof asset === 'string') {
      const fullObj = this.assetService.getAssetById(asset);
      return fullObj?.name || 'Asset Product';
    }
    return asset.name || 'Asset Product';
  }
}
