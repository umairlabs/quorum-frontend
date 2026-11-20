import {
  Component,
  inject,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryGroup } from '../../../../core/interfaces/asset.interface';
import { AssetCategory } from '../../../../core/interfaces/asset-category.interface';
import { AssetService } from '../../services/asset.service';
import { EmptyStateComponent } from '../../../../core/components/empty-state/empty-state.component';
import { getCategoryIcon } from '../../../../core/utils/asset-icon.util';

@Component({
  selector: 'app-inventory-asset',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent],
  templateUrl: './inventory-asset.component.html',
})
export class InventoryAssetComponent {
  protected readonly assetService = inject(AssetService);

  // ─── Inputs ─────────────────────────────────────────────────────────────
  public readonly groups:       InputSignal<InventoryGroup[]> = input.required<InventoryGroup[]>();
  public readonly currentPage:  InputSignal<number>           = input.required<number>();
  public readonly totalPages:   InputSignal<number>           = input.required<number>();

  // ─── Outputs ────────────────────────────────────────────────────────────
  public readonly viewGroup:    OutputEmitterRef<InventoryGroup> = output<InventoryGroup>();
  public readonly editGroup:    OutputEmitterRef<InventoryGroup> = output<InventoryGroup>();
  public readonly purchaseMore: OutputEmitterRef<InventoryGroup> = output<InventoryGroup>();
  public readonly deleteGroup:  OutputEmitterRef<InventoryGroup> = output<InventoryGroup>();
  public readonly clearFilters: OutputEmitterRef<void>           = output<void>();
  public readonly pageChange:   OutputEmitterRef<number>         = output<number>();

  // ─── Helpers ─────────────────────────────────────────────────────────────
  protected getCategoryIcon(category: AssetCategory | string | undefined): string {
    return getCategoryIcon(category);
  }

  protected getCategoryName(category: AssetCategory | string | undefined): string {
    if (!category) return 'Hardware';
    if (typeof category === 'string') return category;
    return (category as AssetCategory).name || 'Hardware';
  }

  // Disable delete if any purchased asset shares the same name — deleting
  // would orphan those purchase records. See appflow.md for domain rules.
  protected hasPurchasedStock(group: InventoryGroup): boolean {
    const name = group.name.toLowerCase().trim();
    return this.assetService.assets().some(
      a => !!(a.purchaseId || a.purchaseNumber) &&
           a.name.toLowerCase().trim() === name
    );
  }
}
