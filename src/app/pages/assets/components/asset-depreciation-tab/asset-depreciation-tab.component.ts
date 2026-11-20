import {
  Component,
  computed,
  inject,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
  Signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Asset } from '../../../../core/interfaces/asset.interface';
import { AssetDepreciation } from '../../../../core/interfaces/depreciation.interface';
import { DepreciationService } from '../../services/depreciation.service';
import { AppCurrencyPipe } from '../../../../core/pipes/currency.pipe';

@Component({
  selector: 'app-asset-depreciation-tab',
  standalone: true,
  imports: [CommonModule, AppCurrencyPipe],
  templateUrl: './asset-depreciation-tab.component.html',
})
export class AssetDepreciationTabComponent {
  private readonly depreciationService = inject(DepreciationService);

  // ─── Inputs & Outputs ───────────────────────────────────────────────────────
  public readonly asset: InputSignal<Asset | null> = input<Asset | null>(null);
  public readonly canEdit: InputSignal<boolean> = input<boolean>(true);
  public readonly canViewFinancials: InputSignal<boolean> = input<boolean>(true);

  public readonly edit: OutputEmitterRef<void> = output<void>();

  // ─── Computed Depreciation ─────────────────────────────────────────────────
  public readonly depreciation: Signal<AssetDepreciation | null> = computed(() => {
    const cur = this.asset();
    if (!cur) return null;
    return this.depreciationService.calculateDepreciation(cur);
  });

  public readonly hasData: Signal<boolean> = computed(() => {
    const dep = this.depreciation();
    return !!(dep && dep.usefulLifeYears > 0 && dep.purchasePrice > 0);
  });

  public readonly percentDepreciated: Signal<number> = computed(() => {
    const dep = this.depreciation();
    if (!dep || dep.purchasePrice <= 0) return 0;
    const depreciableBase = Math.max(0, dep.purchasePrice - dep.salvageValue);
    if (depreciableBase <= 0) return 100;
    const ratio = (dep.accumulatedDepreciation / depreciableBase) * 100;
    return Math.min(100, Math.max(0, Math.round(ratio)));
  });

  public readonly statusBadgeClass: Signal<string> = computed(() => {
    const status = this.depreciation()?.depreciationStatus;
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40';
      case 'FULLY_DEPRECIATED':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40';
      case 'NOT_STARTED':
      default:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/40';
    }
  });

  public readonly statusLabel: Signal<string> = computed(() => {
    const status = this.depreciation()?.depreciationStatus;
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
  });

  protected onEdit(): void {
    this.edit.emit();
  }
}
