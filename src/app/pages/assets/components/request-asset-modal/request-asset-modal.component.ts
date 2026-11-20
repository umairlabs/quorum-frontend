import { Component, computed, inject, input, OnChanges, output, signal, Signal, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssetService } from '../../services/asset.service';
import { Asset } from '../../../../core/interfaces/asset.interface';
import { SelectComponent, SelectOption } from '../../../../core/components/select/select.component';

@Component({
  selector: 'app-request-asset-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectComponent],
  templateUrl: './request-asset-modal.component.html'
})
export class RequestAssetModalComponent implements OnChanges {
  private readonly assetService = inject(AssetService);

  public readonly isOpen = input<boolean>(false);

  public readonly submitRequest = output<{
    categoryName: string;
    requestedAsset: string;
    model?: string;
    color?: string;
    reason: string;
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  }>();

  public readonly cancel = output<void>();

  // Filter only assets that have available units or status AVAILABLE
  protected readonly availableAssets: Signal<Asset[]> = computed(() => {
    return this.assetService.assets().filter(a => {
      const availQty = a.availableQuantity ?? (a.units ? a.units.filter(u => (u.status as string) === 'AVAILABLE').length : 0);
      const isAvailStatus = (a.status as string) === 'AVAILABLE';
      const isNotScrapped = (a.status as string) !== 'SCRAPPED';
      return isNotScrapped && (availQty > 0 || isAvailStatus);
    });
  });

  protected readonly priorityOptions: SelectOption[] = [
    { label: 'Low', value: 'LOW' },
    { label: 'Normal', value: 'NORMAL' },
    { label: 'High', value: 'HIGH' },
    { label: 'Critical', value: 'CRITICAL' }
  ];

  protected readonly assetOptions = computed<SelectOption[]>(() => {
    return this.availableAssets().map(a => ({
      label: `${a.name}${a.brand ? ' (' + a.brand + ')' : ''} — ${this.getCategoryName(a)} [${this.getAvailableQty(a)} Available]`,
      value: a.id
    }));
  });

  protected selectedAssetId = signal<string>('');
  protected categoryName    = signal<string>('General');
  protected requestedAsset  = signal<string>('');
  protected model           = signal<string>('');
  protected color           = signal<string>('');
  protected reason          = signal<string>('');
  protected priority        = signal<'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'>('NORMAL');

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.assetService.loadAssetsFromApi();
    }
  }

  protected onAssetChange(assetId: string | number): void {
    const id = String(assetId);
    this.selectedAssetId.set(id);
    const asset = this.availableAssets().find(a => a.id === id);
    if (asset) {
      const cat = typeof asset.category === 'string' ? asset.category : (asset.category as any)?.name || 'General';
      this.categoryName.set(cat);
      this.requestedAsset.set(asset.name);
      this.model.set(asset.model || '');
      this.color.set(asset.color || '');
    } else {
      this.categoryName.set('General');
      this.requestedAsset.set('');
      this.model.set('');
      this.color.set('');
    }
  }

  protected onPriorityChange(val: string | number): void {
    this.priority.set(String(val) as 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL');
  }

  protected getCategoryName(asset: Asset): string {
    return typeof asset.category === 'string' ? asset.category : (asset.category as any)?.name || '';
  }

  protected getAvailableQty(asset: Asset): number {
    return asset.availableQuantity ?? (asset.units ? asset.units.filter(u => (u.status as string) === 'AVAILABLE').length : 1);
  }

  protected onSubmit(): void {
    if (!this.requestedAsset().trim() || !this.reason().trim()) return;

    this.submitRequest.emit({
      categoryName:   this.categoryName(),
      requestedAsset: this.requestedAsset().trim(),
      model:          this.model().trim() || undefined,
      color:          this.color().trim() || undefined,
      reason:         this.reason().trim(),
      priority:       this.priority()
    });

    this.resetForm();
  }

  protected onCancel(): void {
    this.resetForm();
    this.cancel.emit();
  }

  private resetForm(): void {
    this.selectedAssetId.set('');
    this.categoryName.set('General');
    this.requestedAsset.set('');
    this.model.set('');
    this.color.set('');
    this.reason.set('');
    this.priority.set('NORMAL');
  }
}
