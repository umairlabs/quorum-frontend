import {
  Component, input, output, signal, computed,
  InputSignal, OutputEmitterRef, WritableSignal, Signal, OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AIActionProposal, AIActionExecutionResult } from '../../services/ai-assistant-api.service';

export interface AddAssetFormData {
  name:          string;
  category_name: string;
  brand:         string;
  model:         string;
  color:         string;
  category_id:   string | null;
}

export interface PurchaseFormData {
  asset_name:    string;
  asset_id:      string;
  supplier_name: string;
  supplier_id:   string;
  quantity:      number;
  unit_price:    number;
  total_amount:  number;
}

@Component({
  selector: 'app-ai-action-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './action-card.component.html'
})
export class ActionCardComponent implements OnChanges {
  public readonly action:      InputSignal<AIActionProposal | null>       = input<AIActionProposal | null>(null);
  public readonly result:      InputSignal<AIActionExecutionResult | null> = input<AIActionExecutionResult | null>(null);
  public readonly isExecuting: InputSignal<boolean>                        = input<boolean>(false);

  public readonly confirm: OutputEmitterRef<Record<string, any> | undefined> = output<Record<string, any> | undefined>();
  public readonly cancel:  OutputEmitterRef<void>                             = output<void>();

  // ── Action type helpers ───────────────────────────────────────────────
  protected readonly isAddAssetAction:    Signal<boolean> = computed(() => this.action()?.type === 'ADD_ASSET');
  protected readonly isCreatePurchase:    Signal<boolean> = computed(() => this.action()?.type === 'CREATE_PURCHASE');
  protected readonly hasEditableForm:     Signal<boolean> = computed(() => this.isAddAssetAction() || this.isCreatePurchase());

  // ── Shared edit state ─────────────────────────────────────────────────
  protected readonly editMode:       WritableSignal<boolean> = signal(false);
  protected readonly submitAttempted: WritableSignal<boolean> = signal(false);

  // ── ADD_ASSET form ────────────────────────────────────────────────────
  protected addAssetData: AddAssetFormData = this.emptyAddAsset();

  protected get nameError():     string { return this.submitAttempted() && !this.addAssetData.name.trim()          ? 'Asset name is required.'  : ''; }
  protected get categoryError(): string { return this.submitAttempted() && !this.addAssetData.category_name.trim() ? 'Category is required.'     : ''; }
  protected get brandError():    string { return this.submitAttempted() && !this.addAssetData.brand.trim()         ? 'Brand is required.'        : ''; }
  protected get modelError():    string { return this.submitAttempted() && !this.addAssetData.model.trim()         ? 'Model is required.'        : ''; }

  protected get addAssetValid(): boolean {
    return !!(this.addAssetData.name.trim() && this.addAssetData.category_name.trim() &&
              this.addAssetData.brand.trim() && this.addAssetData.model.trim());
  }

  // ── CREATE_PURCHASE form ──────────────────────────────────────────────
  protected purchaseData: PurchaseFormData = this.emptyPurchase();

  protected get purchaseQtyError():   string { return this.submitAttempted() && this.purchaseData.quantity < 1        ? 'Quantity must be at least 1.'       : ''; }
  protected get purchasePriceError(): string { return this.submitAttempted() && this.purchaseData.unit_price <= 0     ? 'Unit price must be greater than 0.'  : ''; }
  protected get purchaseAssetError(): string { return this.submitAttempted() && !this.purchaseData.asset_name.trim()  ? 'Asset name is required.'             : ''; }

  protected get purchaseValid(): boolean {
    return !!(this.purchaseData.asset_name.trim() &&
              this.purchaseData.quantity >= 1 &&
              this.purchaseData.unit_price > 0);
  }

  protected get computedTotal(): number {
    return +(this.purchaseData.quantity * this.purchaseData.unit_price).toFixed(2);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['action'] && this.action()) {
      this.resetForms();
    }
  }

  private emptyAddAsset(): AddAssetFormData {
    return { name: '', category_name: '', brand: '', model: '', color: '', category_id: null };
  }

  private emptyPurchase(): PurchaseFormData {
    return { asset_name: '', asset_id: '', supplier_name: '', supplier_id: '', quantity: 1, unit_price: 0, total_amount: 0 };
  }

  private resetForms(): void {
    const p = this.action()?.params ?? {};

    this.addAssetData = {
      name:          (p['name']          || p['assetName']    || '').toString(),
      category_name: (p['category_name'] || p['categoryName'] || p['category'] || '').toString(),
      brand:         (p['brand']         || '').toString(),
      model:         (p['model']         || '').toString(),
      color:         (p['color']         || '').toString(),
      category_id:   p['category_id']    ?? p['categoryId'] ?? null,
    };

    this.purchaseData = {
      asset_name:    (p['asset_name']    || p['assetName']    || '').toString(),
      asset_id:      (p['asset_id']      || p['assetId']      || '').toString(),
      supplier_name: (p['supplier_name'] || p['supplierName'] || '').toString(),
      supplier_id:   (p['supplier_id']   || p['supplierId']   || '').toString(),
      quantity:      Number(p['quantity'] || p['qty'] || 1),
      unit_price:    Number(p['unit_price'] || p['unitPrice'] || 0),
      total_amount:  Number(p['total_amount'] || p['totalAmount'] || 0),
    };

    this.editMode.set(false);
    this.submitAttempted.set(false);
  }

  protected onPurchaseQtyOrPriceChange(): void {
    this.purchaseData.total_amount = this.computedTotal;
  }

  // ── Handlers ──────────────────────────────────────────────────────────
  protected onConfirm(): void {
    if (this.isExecuting()) return;

    if (this.isAddAssetAction()) {
      this.submitAttempted.set(true);
      if (!this.addAssetValid) return;
      this.confirm.emit({
        name:          this.addAssetData.name.trim(),
        category_name: this.addAssetData.category_name.trim(),
        category_id:   this.addAssetData.category_id ?? null,
        brand:         this.addAssetData.brand.trim(),
        model:         this.addAssetData.model.trim(),
        color:         this.addAssetData.color.trim(),
      });

    } else if (this.isCreatePurchase()) {
      this.submitAttempted.set(true);
      if (!this.purchaseValid) return;
      this.confirm.emit({
        asset_id:      this.purchaseData.asset_id,
        asset_name:    this.purchaseData.asset_name.trim(),
        supplier_id:   this.purchaseData.supplier_id,
        supplier_name: this.purchaseData.supplier_name.trim(),
        quantity:      this.purchaseData.quantity,
        unit_price:    this.purchaseData.unit_price,
        total_amount:  this.computedTotal,
      });

    } else {
      this.confirm.emit(undefined);
    }
  }

  protected onCancel(): void {
    if (!this.isExecuting()) this.cancel.emit();
  }

  protected onEdit(): void {
    this.editMode.set(true);
  }

  protected onSaveEdit(): void {
    this.submitAttempted.set(true);
    const valid = this.isAddAssetAction() ? this.addAssetValid : this.purchaseValid;
    if (!valid) return;
    if (this.isCreatePurchase()) {
      this.purchaseData.total_amount = this.computedTotal;
    }
    this.editMode.set(false);
    this.submitAttempted.set(false);
  }

  protected onCancelEdit(): void {
    this.resetForms();
    this.editMode.set(false);
  }

  // ── Generic params display (non-form actions) ─────────────────────────
  protected formatParamKey(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  protected genericParams(): { key: string; value: any }[] {
    const p = this.action()?.params;
    if (!p) return [];
    const hidden = new Set(['category_id', 'asset_id', 'supplier_id',
                            'assetId', 'supplierId', 'total_amount', 'totalAmount']);
    return Object.entries(p)
      .filter(([k, v]) => !hidden.has(k) && v !== '' && v !== null && v !== undefined)
      .map(([k, v]) => ({ key: k, value: v }));
  }
}
