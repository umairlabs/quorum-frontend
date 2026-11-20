import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  WritableSignal,
  Signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AssetService } from '../../assets/services/asset.service';
import { AssetApisService } from '../../assets/services/asset-apis.service';
import { DepreciationService } from '../../assets/services/depreciation.service';
import { AuthApisService } from '../../../core/services/api/auth-apis.service';
import { Asset } from '../../../core/interfaces/asset.interface';
import { AssetDepreciation } from '../../../core/interfaces/depreciation.interface';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { SearchInputComponent } from '../../../core/components/search-input/search-input.component';
import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { EditDepreciationModalComponent } from '../../assets/components/edit-depreciation-modal/edit-depreciation-modal.component';
import { AppCurrencyPipe } from '../../../core/pipes/currency.pipe';
import { getCategoryIcon } from '../../../core/utils/asset-icon.util';
import { ModalComponent } from '../../../core/components/modal/modal.component';

export interface AssetDepreciationRow {
  asset: Asset;
  depreciation: AssetDepreciation;
  percentDepreciated: number;
}

@Component({
  selector: 'app-depreciation-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    SearchInputComponent,
    EmptyStateComponent,
    EditDepreciationModalComponent,
    AppCurrencyPipe,
    ModalComponent,
  ],
  templateUrl: './depreciation-list.component.html',
})
export class DepreciationListComponent implements OnInit {
  private readonly router = inject(Router);
  protected readonly assetService = inject(AssetService);
  private readonly assetApisService = inject(AssetApisService);
  private readonly depreciationService = inject(DepreciationService);
  private readonly authService = inject(AuthApisService);

  // ─── Filters & Pagination ──────────────────────────────────────────────────
  protected readonly searchQuery: WritableSignal<string> = signal<string>('');
  protected readonly selectedStatus: WritableSignal<string> = signal<string>('ALL');
  protected readonly selectedCategory: WritableSignal<string> = signal<string>('ALL');
  protected readonly currentPage: WritableSignal<number> = signal<number>(1);
  protected readonly pageSize: WritableSignal<number> = signal<number>(10);

  // ─── Modal state ───────────────────────────────────────────────────────────
  protected readonly isEditModalOpen: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly selectedAssetForEdit: WritableSignal<Asset | null> = signal<Asset | null>(null);
  protected readonly isScheduleModalOpen: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly selectedRowForSchedule: WritableSignal<AssetDepreciationRow | null> = signal<AssetDepreciationRow | null>(null);

  // ─── Permissions ───────────────────────────────────────────────────────────
  protected readonly userRole = computed<string>(() => {
    return (
      this.authService.currentUser()?.role ||
      localStorage.getItem('role') ||
      ''
    ).toUpperCase().replace(/\s+/g, '_');
  });

  protected readonly canManageDepreciation = computed<boolean>(() => {
    const role = this.userRole();
    return ['SYSTEM_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'OPERATIONS_MANAGER', 'MANAGER'].includes(role);
  });

  public ngOnInit(): void {
    this.loadAssets();
  }

  protected loadAssets(): void {
    this.assetApisService.getAssets().subscribe({
      next: (res) => {
        const raw = Array.isArray(res) ? res : (res?.results ?? []);
        const normalized = raw.map((a) => this.assetService.normalizeAsset(a));
        this.assetService.assets.set(normalized);
        this.assetService.saveToLocalStorage(normalized);
      },
      error: () => {},
    });
  }

  // ─── Computed Rows with Calculations ───────────────────────────────────────
  protected readonly allDepreciationRows: Signal<AssetDepreciationRow[]> = computed(() => {
    const assets = this.assetService.assets();
    return assets.map((asset) => {
      const dep = this.depreciationService.calculateDepreciation(asset) || {
        assetId: asset.id,
        purchasePrice: asset.purchasePrice || asset.purchaseCost || 0,
        purchaseDate: asset.purchaseDate || '',
        salvageValue: 0,
        usefulLifeYears: 0,
        depreciationMethod: 'STRAIGHT_LINE',
        annualDepreciation: 0,
        monthlyDepreciation: 0,
        accumulatedDepreciation: 0,
        currentBookValue: asset.purchasePrice || asset.purchaseCost || 0,
        depreciationStatus: 'NOT_STARTED',
        depreciationSchedule: [],
      };

      const depreciableBase = Math.max(0, dep.purchasePrice - dep.salvageValue);
      const ratio = depreciableBase > 0 ? (dep.accumulatedDepreciation / depreciableBase) * 100 : 0;
      const percentDepreciated = Math.min(100, Math.max(0, Math.round(ratio)));

      return {
        asset,
        depreciation: dep,
        percentDepreciated,
      };
    });
  });

  // ─── Aggregate Statistics ──────────────────────────────────────────────────
  protected readonly totalAssetsCount = computed<number>(() => {
    return this.allDepreciationRows().length;
  });

  protected readonly totalPurchaseValue = computed<number>(() => {
    return this.allDepreciationRows().reduce(
      (sum, r) => sum + (r.depreciation.purchasePrice || 0),
      0
    );
  });

  protected readonly totalAccumulatedDepreciation = computed<number>(() => {
    return this.allDepreciationRows().reduce(
      (sum, r) => sum + (r.depreciation.accumulatedDepreciation || 0),
      0
    );
  });

  protected readonly totalCurrentBookValue = computed<number>(() => {
    return this.allDepreciationRows().reduce(
      (sum, r) => sum + (r.depreciation.currentBookValue || 0),
      0
    );
  });

  // ─── Filtered Rows & Pagination ────────────────────────────────────────────
  protected readonly filteredRows = computed<AssetDepreciationRow[]>(() => {
    let rows = this.allDepreciationRows();
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.selectedStatus().toUpperCase();
    const cat = this.selectedCategory().toLowerCase();

    if (query) {
      rows = rows.filter((r) => {
        const a = r.asset;
        const name = (a.name || '').toLowerCase();
        const brand = (a.brand || '').toLowerCase();
        const model = (a.model || '').toLowerCase();
        const serial = (a.serialNumber || '').toLowerCase();
        const assetId = (a.assetId || a.id || '').toLowerCase();
        return (
          name.includes(query) ||
          brand.includes(query) ||
          model.includes(query) ||
          serial.includes(query) ||
          assetId.includes(query)
        );
      });
    }

    if (status && status !== 'ALL') {
      rows = rows.filter((r) => (r.depreciation.depreciationStatus || '').toUpperCase() === status);
    }

    if (cat && cat !== 'ALL' && cat !== 'all') {
      rows = rows.filter((r) => {
        const catName = typeof r.asset.category === 'string'
          ? r.asset.category.toLowerCase()
          : (r.asset.category?.name || '').toLowerCase();
        return catName === cat.toLowerCase();
      });
    }

    return rows;
  });

  protected readonly totalPages = computed<number>(() => {
    return Math.max(1, Math.ceil(this.filteredRows().length / this.pageSize()));
  });

  protected readonly paginatedRows = computed<AssetDepreciationRow[]>(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredRows().slice(start, start + this.pageSize());
  });

  // ─── Actions & Navigation ──────────────────────────────────────────────────
  protected onOpenSchedule(row: AssetDepreciationRow): void {
    this.selectedRowForSchedule.set(row);
    this.isScheduleModalOpen.set(true);
  }

  protected onViewAsset(asset: Asset): void {
    this.router.navigate(['/assets', asset.id], { queryParams: { tab: 'depreciation' } });
  }

  protected onEditDepreciation(asset: Asset): void {
    this.selectedAssetForEdit.set(asset);
    this.isEditModalOpen.set(true);
  }

  protected onDepreciationSaved(updated: Asset): void {
    const assets = this.assetService.assets();
    const index = assets.findIndex((a) => a.id === updated.id);
    if (index !== -1) {
      const next = [...assets];
      next[index] = updated;
      this.assetService.assets.set(next);
      this.assetService.saveToLocalStorage(next);
    }
    this.loadAssets();
  }

  protected onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  protected getCategoryIcon(category: any): string {
    return getCategoryIcon(category);
  }

  protected getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40';
      case 'FULLY_DEPRECIATED':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40';
      case 'NOT_STARTED':
      default:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/40';
    }
  }

  protected getStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'Active';
      case 'FULLY_DEPRECIATED':
        return 'Fully Depreciated';
      case 'NOT_STARTED':
        return 'Not Started';
      default:
        return 'Pending Setup';
    }
  }
}
