import {
  Component,
  computed,
  HostListener,
  inject,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
  signal,
  Signal,
  WritableSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Asset, PurchaseGroup } from '../../../../core/interfaces/asset.interface';
import { AssetCategory } from '../../../../core/interfaces/asset-category.interface';
import { AssetService } from '../../services/asset.service';
import { StatusBadgeComponent } from '../../../../core/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../../core/components/empty-state/empty-state.component';
import { AppCurrencyPipe } from '../../../../core/pipes/currency.pipe';
import { getCategoryIcon } from '../../../../core/utils/asset-icon.util';

@Component({
  selector: 'app-purchased-asset',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent, EmptyStateComponent, AppCurrencyPipe],
  templateUrl: './purchased-asset.component.html',
})
export class PurchasedAssetComponent {
  protected readonly assetService = inject(AssetService);

  // ─── Inputs ──────────────────────────────────────────────────────────────
  public readonly groups:      InputSignal<PurchaseGroup[]> = input.required<PurchaseGroup[]>();
  public readonly currentPage: InputSignal<number>          = input.required<number>();
  public readonly totalPages:  InputSignal<number>          = input.required<number>();

  // ─── Outputs ─────────────────────────────────────────────────────────────
  public readonly viewAsset:         OutputEmitterRef<Asset>  = output<Asset>();
  public readonly editAsset:         OutputEmitterRef<Asset>  = output<Asset>();
  public readonly assignAsset:       OutputEmitterRef<Asset>  = output<Asset>();
  public readonly returnAsset:       OutputEmitterRef<Asset>  = output<Asset>();
  public readonly sendToMaintenance: OutputEmitterRef<Asset>  = output<Asset>();
  public readonly deleteAsset:       OutputEmitterRef<Asset>  = output<Asset>();
  public readonly newPurchase:       OutputEmitterRef<void>         = output<void>();
  public readonly purchaseMore:      OutputEmitterRef<PurchaseGroup> = output<PurchaseGroup>();
  public readonly deleteGroup:       OutputEmitterRef<PurchaseGroup> = output<PurchaseGroup>();
  public readonly clearFilters:      OutputEmitterRef<void>          = output<void>();
  public readonly pageChange:        OutputEmitterRef<number>        = output<number>();

  // ─── Modal state ─────────────────────────────────────────────────────────
  protected readonly activeGroup:       WritableSignal<PurchaseGroup | null> = signal<PurchaseGroup | null>(null);
  protected readonly activeMenuAssetId: WritableSignal<string | null>        = signal<string | null>(null);

  // ─── Modal filters ────────────────────────────────────────────────────────
  protected readonly modalFilterSupplier: WritableSignal<string> = signal<string>('');
  protected readonly modalFilterStatus:   WritableSignal<string> = signal<string>('');

  // Filtered assets for the modal table — recomputes whenever filters or active group change
  protected readonly filteredModalAssets: Signal<Asset[]> = computed(() => {
    const group    = this.activeGroup();
    const supplier = this.modalFilterSupplier().trim().toLowerCase();
    const status   = this.modalFilterStatus().trim().toUpperCase();
    if (!group) return [];
    return group.assets.filter(a => {
      const matchesSupplier = !supplier || (a.supplier ?? '').toLowerCase() === supplier;
      const matchesStatus   = !status   || a.status === status;
      return matchesSupplier && matchesStatus;
    });
  });

  // ─── Close ⋮ dropdown on outside click ───────────────────────────────────
  @HostListener('document:click')
  protected onDocumentClick(): void {
    this.activeMenuAssetId.set(null);
  }

  // ─── Modal open / close ───────────────────────────────────────────────────
  protected openModal(group: PurchaseGroup): void {
    this.activeGroup.set(group);
    this.activeMenuAssetId.set(null);
    this.modalFilterSupplier.set('');
    this.modalFilterStatus.set('');
  }

  protected closeModal(): void {
    this.activeGroup.set(null);
    this.activeMenuAssetId.set(null);
    this.modalFilterSupplier.set('');
    this.modalFilterStatus.set('');
  }

  // ─── Dropdown toggle ─────────────────────────────────────────────────────
  protected toggleActionMenu(event: MouseEvent, assetId: string): void {
    event.stopPropagation();
    this.activeMenuAssetId.set(
      this.activeMenuAssetId() === assetId ? null : assetId
    );
  }

  // ─── Action emitters (close menu + modal as needed) ───────────────────────
  protected onView(asset: Asset): void {
    console.log('[purchased-asset] onView called with asset:', asset);
    console.log('[purchased-asset] asset.id:', asset.id);
    this.viewAsset.emit(asset);
    // Modal will close naturally when route changes
  }

  protected onEdit(asset: Asset): void {
    this.editAsset.emit(asset);
    // Modal will close naturally when route changes
  }

  protected onAssign(asset: Asset): void {
    this.activeMenuAssetId.set(null);
    this.closeModal();
    this.assignAsset.emit(asset);
  }

  protected onReturn(asset: Asset): void {
    this.activeMenuAssetId.set(null);
    this.closeModal();
    this.returnAsset.emit(asset);
  }

  protected onMaintenance(asset: Asset): void {
    this.activeMenuAssetId.set(null);
    this.closeModal();
    this.sendToMaintenance.emit(asset);
  }

  protected onDelete(asset: Asset): void {
    this.activeMenuAssetId.set(null);
    this.closeModal();
    this.deleteAsset.emit(asset);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  protected getCategoryIcon(category: AssetCategory | string | undefined): string {
    return getCategoryIcon(category);
  }

  protected getCategoryName(category: AssetCategory | string | undefined): string {
    if (!category) return 'Hardware';
    if (typeof category === 'string') return category;
    return (category as AssetCategory).name || 'Hardware';
  }

  // Returns display label for the supplier column in the group row.
  // Single supplier → show name. Multiple → "Multiple suppliers".
  protected getSupplierLabel(group: PurchaseGroup): string {
    if (!group.suppliers || group.suppliers.length === 0) return '—';
    if (group.suppliers.length === 1) return group.suppliers[0];
    return 'Multiple suppliers';
  }
}
