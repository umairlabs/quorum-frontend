import { Component, computed, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AssetService } from '../services/asset.service';
import { Asset } from '../../../core/interfaces/asset.interface';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { AppCurrencyPipe } from '../../../core/pipes/currency.pipe';
import { getCategoryIcon } from '../../../core/utils/asset-icon.util';

@Component({
  selector: 'app-purchase-search',
  standalone: true,
  imports: [
    CommonModule,
    PageHeaderComponent,
    EmptyStateComponent,
    AppCurrencyPipe
  ],
  templateUrl: './purchase-search.component.html'
})
export class PurchaseSearchComponent implements OnInit {
  private readonly router = inject(Router);
  protected readonly assetService = inject(AssetService);

  protected readonly searchQuery: WritableSignal<string> = signal<string>('');
  protected readonly searchResults: WritableSignal<Asset[]> = signal<Asset[]>([]);
  protected readonly isSearching: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly hasSearched: WritableSignal<boolean> = signal<boolean>(false);

  // Status counts use quantity fields since Asset has no per-unit status
  protected readonly availableCount = computed(() =>
    this.searchResults().filter(a => (a.availableQuantity ?? 0) > 0).length
  );
  protected readonly assignedCount = computed(() =>
    this.searchResults().filter(a => (a.assignedQuantity ?? 0) > 0).length
  );
  protected readonly maintenanceCount = computed(() =>
    this.searchResults().filter(a => (a.maintenanceQuantity ?? 0) > 0).length
  );

  public ngOnInit(): void {
    this.assetService.loadAssetsFromApi();
  }

  protected onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.hasSearched.set(true);

    if (query.trim().length === 0) {
      this.searchResults.set([]);
      this.hasSearched.set(false);
      return;
    }

    if (query.trim().length >= 1) {
      this.performSearch(query);
    }
  }

  private performSearch(query: string): void {
    this.isSearching.set(true);

    setTimeout(() => {
      const results = this.filterAssets(query);
      this.searchResults.set(results);
      this.isSearching.set(false);
    }, 150);
  }

  private filterAssets(query: string): Asset[] {
    const searchTerm = query.toLowerCase().trim();
    return this.assetService.assets().filter(asset => {
      const matchesId       = (asset.id   || '').toLowerCase().includes(searchTerm);
      const matchesName     = (asset.name || '').toLowerCase().includes(searchTerm);
      const categoryName    = typeof asset.category === 'string'
        ? asset.category.toLowerCase()
        : (asset.category as any)?.name?.toLowerCase() || '';
      const matchesCategory = categoryName.includes(searchTerm);
      return matchesId || matchesName || matchesCategory;
    });
  }

  protected onSelectAsset(asset: Asset): void {
    const cleanId = this.assetService.extractBaseAssetId(asset.id);
    this.router.navigate(['/assets/purchases/create'], {
      queryParams: { assetId: cleanId, assetName: asset.name }
    });
  }

  protected onEditAsset(asset: Asset, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/assets', asset.id, 'edit']);
  }

  protected onViewAsset(asset: Asset, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/assets', asset.id]);
  }

  protected onCancel(): void {
    this.router.navigate(['/assets']);
  }

  protected getCategoryIcon(category: any): string {
    return getCategoryIcon(category);
  }

  protected getCategoryName(category: any): string {
    if (!category) return 'Hardware';
    if (typeof category === 'string') return category;
    return category.name || 'Hardware';
  }

  protected getSearchPlaceholder(): string {
    return 'Search by Serial Number, Name, Brand, Model, Category, PO Number...';
  }

  protected getNoResultsMessage(): string {
    return `No assets match your search for "${this.searchQuery()}". Try searching with Serial Number, Name, Brand, or Category.`;
  }
}