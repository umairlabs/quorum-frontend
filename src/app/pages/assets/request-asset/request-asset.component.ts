import {
  Component,
  computed,
  inject,
  OnInit,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AssetService } from '../services/asset.service';
import { AssetApisService } from '../services/asset-apis.service';
import { Asset, AssetUnit } from '../../../core/interfaces/asset.interface';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { FormSectionComponent } from '../../../core/components/form-section/form-section.component';

interface PriorityOption {
  value: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  label: string;
  hint: string;
  icon: string;
}

@Component({
  selector: 'app-request-asset',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, FormSectionComponent],
  templateUrl: './request-asset.component.html',
})
export class RequestAssetComponent implements OnInit {
  private readonly router:           Router          = inject(Router);
  private readonly assetService:     AssetService    = inject(AssetService);
  private readonly assetApisService: AssetApisService = inject(AssetApisService);
  private readonly toastService:     ToastService    = inject(ToastService);

  // Asset search state
  protected readonly showAssetDropdown: WritableSignal<boolean>       = signal(false);
  protected readonly assetSearchQuery:  WritableSignal<string>        = signal('');
  protected readonly selectedAsset:     WritableSignal<Asset | null>  = signal(null);

  // Unit search state (enhanced custom dropdown)
  protected readonly showUnitDropdown:  WritableSignal<boolean>       = signal(false);
  protected readonly unitSearchQuery:   WritableSignal<string>        = signal('');
  protected readonly selectedUnit:      WritableSignal<AssetUnit | null> = signal(null);
  protected readonly availableUnits:    WritableSignal<AssetUnit[]>   = signal([]);
  protected readonly unitsLoading:      WritableSignal<boolean>       = signal(false);

  // Form state
  protected readonly saving:          WritableSignal<boolean>                       = signal(false);
  protected readonly submitAttempted: WritableSignal<boolean>                       = signal(false);
  protected readonly requestedAsset:  WritableSignal<string>                        = signal('');
  protected readonly model:           WritableSignal<string>                        = signal('');
  protected readonly color:           WritableSignal<string>                        = signal('');
  protected readonly reason:          WritableSignal<string>                        = signal('');
  protected readonly priority:        WritableSignal<'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'> = signal('NORMAL');
  private categoryName:               WritableSignal<string>                        = signal('General');

  protected readonly priorityOptions: PriorityOption[] = [
    { value: 'LOW',      label: 'Low',      hint: 'Minor, no urgency',       icon: 'arrow_downward' },
    { value: 'NORMAL',   label: 'Normal',   hint: 'Standard request',        icon: 'remove'         },
    { value: 'HIGH',     label: 'High',     hint: 'Significant impact',      icon: 'arrow_upward'   },
    { value: 'CRITICAL', label: 'Critical', hint: 'Immediate action needed', icon: 'priority_high'  },
  ];

  // Only purchased assets that are not scrapped/retired and have available stock
  protected readonly availableAssets: Signal<Asset[]> = computed(() => {
    const all = this.assetService.assets();
    return all.filter(a => {
      const isParent = !a.id.includes('-unit-');
      const isNotScrapped = (a.status as string) !== 'SCRAPPED' && (a.status as string) !== 'RETIRED';
      const hasUnits = Array.isArray(a.units) && a.units.some(u => u.status === 'AVAILABLE');
      const hasAvailableUnits = a.availableQuantity !== undefined ? a.availableQuantity > 0 : hasUnits;
      const isSelfAvailable = a.status === 'AVAILABLE';
      return isParent && isNotScrapped && (hasAvailableUnits || hasUnits || isSelfAvailable);
    });
  });

  // Filtered available assets for autocomplete dropdown
  protected readonly filteredAvailableAssets: Signal<Asset[]> = computed(() => {
    const query = this.assetSearchQuery().toLowerCase().trim();
    const assets = this.availableAssets();

    if (!query) return assets;

    return assets.filter(a => {
      const name   = (a.name || '').toLowerCase();
      const serial = (a.serialNumber || '').toLowerCase();
      const brand  = (a.brand || '').toLowerCase();
      const model  = (a.model || '').toLowerCase();
      const cat    = typeof a.category === 'string'
        ? a.category.toLowerCase()
        : ((a.category as any)?.name || '').toLowerCase();

      return name.includes(query) || serial.includes(query) || brand.includes(query) || model.includes(query) || cat.includes(query);
    });
  });

  // Filtered available units for unit custom dropdown
  protected readonly filteredAvailableUnits: Signal<AssetUnit[]> = computed(() => {
    const query = this.unitSearchQuery().toLowerCase().trim();
    const units = this.availableUnits();

    if (!query) return units;

    return units.filter(u => {
      const uNum = `${u.unitNumber}`.toLowerCase();
      const uText = `unit #${u.unitNumber}`.toLowerCase();
      const sn   = (u.serialNumber || '').toLowerCase();
      const loc  = (u.location || '').toLowerCase();
      return sn.includes(query) || uNum.includes(query) || uText.includes(query) || loc.includes(query);
    });
  });

  public ngOnInit(): void {
    this.assetService.loadAssetsFromApi();
  }

  // Asset search handlers
  protected onFocusAssetSearch(): void {
    this.showAssetDropdown.set(true);
  }

  protected onBlurAssetSearch(): void {
    setTimeout(() => this.showAssetDropdown.set(false), 200);
  }

  protected onAssetInputChange(value: string): void {
    this.assetSearchQuery.set(value);
    this.showAssetDropdown.set(true);

    if (!value.trim()) {
      this.clearSelectedAsset();
    }
  }

  protected selectAsset(asset: Asset): void {
    this.selectedAsset.set(asset);
    this.assetSearchQuery.set(asset.name);
    this.showAssetDropdown.set(false);

    const cat = typeof asset.category === 'string' ? asset.category : (asset.category as any)?.name || 'General';
    this.categoryName.set(cat);
    this.requestedAsset.set(asset.name);
    this.model.set(asset.model || '');
    this.color.set(asset.color || '');

    // Reset unit selection
    this.selectedUnit.set(null);
    this.unitSearchQuery.set('');
    this.availableUnits.set([]);
    this.unitsLoading.set(true);

    const baseId = this.assetService.extractBaseAssetId(asset.id);
    const allAssets = this.assetService.assets();

    // Collect available units from memory/cache as fallback
    let cachedUnits: AssetUnit[] = [];
    if (asset.units && Array.isArray(asset.units)) {
      cachedUnits = asset.units.filter(u => u.status === 'AVAILABLE');
    }
    if (cachedUnits.length === 0) {
      cachedUnits = allAssets
        .filter(a => (a.id.startsWith(`${baseId}-unit-`) || a.id === asset.id || a.name === asset.name) && a.status === 'AVAILABLE')
        .map((a, idx) => ({
          id: a.unitId || a.id.replace(`${baseId}-unit-`, '') || a.id,
          assetId: baseId,
          unitNumber: idx + 1,
          serialNumber: a.serialNumber || `SN-${a.id}`,
          status: 'AVAILABLE',
          location: a.location,
          assignedTo: undefined,
          assignedUser: undefined,
          createdAt: a.createdAt || '',
          updatedAt: a.updatedAt || '',
        }));
    }

    this.assetService.getAvailableUnits(baseId).subscribe({
      next: (units) => {
        this.unitsLoading.set(false);
        const apiUnits = Array.isArray(units) ? units : ((units as any)?.results ?? []);
        const finalUnits = apiUnits.length > 0 ? apiUnits : cachedUnits;
        this.availableUnits.set(finalUnits);
        if (finalUnits.length > 0) {
          this.selectUnit(finalUnits[0]);
        }
      },
      error: () => {
        this.unitsLoading.set(false);
        this.availableUnits.set(cachedUnits);
        if (cachedUnits.length > 0) {
          this.selectUnit(cachedUnits[0]);
        }
      }
    });
  }

  protected clearSelectedAsset(): void {
    this.selectedAsset.set(null);
    this.assetSearchQuery.set('');
    this.categoryName.set('General');
    this.requestedAsset.set('');
    this.model.set('');
    this.color.set('');
    this.selectedUnit.set(null);
    this.unitSearchQuery.set('');
    this.availableUnits.set([]);
  }

  // Unit search handlers
  protected onFocusUnitSearch(): void {
    this.showUnitDropdown.set(true);
  }

  protected onBlurUnitSearch(): void {
    setTimeout(() => this.showUnitDropdown.set(false), 200);
  }

  protected onUnitInputChange(value: string): void {
    this.unitSearchQuery.set(value);
    this.showUnitDropdown.set(true);
    if (!value.trim()) {
      this.clearSelectedUnit();
    }
  }

  protected selectUnit(unit: AssetUnit): void {
    this.selectedUnit.set(unit);
    this.unitSearchQuery.set(unit.displayId || unit.serialNumber || unit.id);
    this.showUnitDropdown.set(false);

    const asset = this.selectedAsset();
    if (asset?.model) {
      this.model.set(asset.model);
    }
  }

  protected clearSelectedUnit(): void {
    this.selectedUnit.set(null);
    this.unitSearchQuery.set('');
  }

  protected getCategoryName(asset: Asset): string {
    return typeof asset.category === 'string' ? asset.category : (asset.category as any)?.name || '';
  }

  protected onSubmit(): void {
    this.submitAttempted.set(true);
    if (!this.selectedAsset() || !this.requestedAsset().trim() || !this.reason().trim()) return;

    const payload = {
      categoryName:   this.categoryName(),
      requestedAsset: this.requestedAsset().trim(),
      model:          this.model().trim() || undefined,
      color:          this.color().trim() || undefined,
      reason:         this.reason().trim(),
      priority:       this.priority(),
      unitId:         this.selectedUnit()?.id || undefined,
    };

    this.saving.set(true);
    this.assetApisService.createAssetRequest(payload).subscribe({
      next: () => {
        this.toastService.presentToast('Asset request submitted successfully.', 2000, 'success');
        this.saving.set(false);
        this.router.navigate(['/assets']);
      },
      error: (err: any) => {
        console.error('Failed to submit asset request:', err);
        this.toastService.presentToast('Failed to submit asset request.', 2000, 'error');
        this.saving.set(false);
      },
    });
  }

  protected onCancel(): void {
    this.router.navigate(['/assets']);
  }
}

