import {
  Component,
  computed,
  effect,
  inject,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
  signal,
  WritableSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Asset } from '../../../../core/interfaces/asset.interface';
import {
  DepreciationMethod,
  UpdateDepreciationPayload,
} from '../../../../core/interfaces/depreciation.interface';
import { DepreciationService } from '../../services/depreciation.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AppCurrencyPipe } from '../../../../core/pipes/currency.pipe';
import { ModalComponent } from '../../../../core/components/modal/modal.component';

@Component({
  selector: 'app-edit-depreciation-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AppCurrencyPipe, ModalComponent],
  templateUrl: './edit-depreciation-modal.component.html',
})
export class EditDepreciationModalComponent {
  private readonly depreciationService = inject(DepreciationService);
  private readonly toastService = inject(ToastService);

  // ─── Inputs & Outputs ───────────────────────────────────────────────────────
  public readonly isOpen: InputSignal<boolean> = input<boolean>(false);
  public readonly asset: InputSignal<Asset | null> = input<Asset | null>(null);

  public readonly close: OutputEmitterRef<void> = output<void>();
  public readonly saved: OutputEmitterRef<Asset> = output<Asset>();

  // ─── Form State ────────────────────────────────────────────────────────────
  protected readonly salvageValue: WritableSignal<number> = signal<number>(0);
  protected readonly usefulLifeYears: WritableSignal<number> = signal<number>(5);
  protected readonly depreciationMethod: WritableSignal<DepreciationMethod> = signal<DepreciationMethod>('STRAIGHT_LINE');

  protected readonly isSaving: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly errorMessage: WritableSignal<string | null> = signal<string | null>(null);

  constructor() {
    effect(() => {
      const cur = this.asset();
      if (cur && this.isOpen()) {
        const fin = cur.financials as any;
        const sVal =
          cur.salvageValue !== undefined
            ? cur.salvageValue
            : fin?.salvageValue !== undefined
            ? fin.salvageValue
            : 0;

        const uLife =
          cur.usefulLifeYears !== undefined && cur.usefulLifeYears > 0
            ? cur.usefulLifeYears
            : fin?.usefulLifeYears !== undefined && fin.usefulLifeYears > 0
            ? fin.usefulLifeYears
            : 5;

        const method = (cur.depreciationMethod || fin?.depreciationMethod || 'STRAIGHT_LINE') as DepreciationMethod;

        this.salvageValue.set(sVal);
        this.usefulLifeYears.set(uLife);
        this.depreciationMethod.set(method);
        this.errorMessage.set(null);
      }
    });
  }

  // ─── Computed Preview ──────────────────────────────────────────────────────
  protected readonly purchasePrice = computed<number>(() => {
    const cur = this.asset();
    if (!cur) return 0;
    const fin = cur.financials as any;
    return typeof cur.purchasePrice === 'number'
      ? cur.purchasePrice
      : typeof cur.purchaseCost === 'number'
      ? cur.purchaseCost
      : typeof fin?.purchaseValue === 'number'
      ? fin.purchaseValue
      : 0;
  });

  protected readonly previewDepreciableAmount = computed<number>(() => {
    const p = this.purchasePrice();
    const s = Number(this.salvageValue()) || 0;
    return Math.max(0, p - s);
  });

  protected readonly previewAnnualDepreciation = computed<number>(() => {
    const base = this.previewDepreciableAmount();
    const life = Number(this.usefulLifeYears()) || 0;
    if (life <= 0) return 0;
    return Math.round((base / life) * 100) / 100;
  });

  protected readonly previewMonthlyDepreciation = computed<number>(() => {
    const annual = this.previewAnnualDepreciation();
    return Math.round((annual / 12) * 100) / 100;
  });

  // ─── Actions ───────────────────────────────────────────────────────────────
  protected onClose(): void {
    if (this.isSaving()) return;
    this.close.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.onClose();
    }
  }

  protected onSave(): void {
    const cur = this.asset();
    if (!cur) return;

    const payload: UpdateDepreciationPayload = {
      salvageValue: Number(this.salvageValue()) || 0,
      usefulLifeYears: Number(this.usefulLifeYears()) || 0,
      depreciationMethod: this.depreciationMethod(),
    };

    const validation = this.depreciationService.validateDepreciationPayload(
      payload,
      this.purchasePrice()
    );

    if (!validation.isValid) {
      this.errorMessage.set(validation.error || 'Invalid depreciation configuration.');
      return;
    }

    this.errorMessage.set(null);
    this.isSaving.set(true);

    this.depreciationService.updateDepreciation(cur, payload).subscribe({
      next: (updated) => {
        this.isSaving.set(false);
        this.toastService.presentToast(
          'Depreciation configuration updated and recalculated successfully.',
          2500,
          'success'
        );
        this.saved.emit(updated);
        this.close.emit();
      },
      error: () => {
        this.isSaving.set(false);
        this.toastService.presentToast(
          'Failed to update depreciation configuration.',
          2500,
          'error'
        );
      },
    });
  }
}
