import { Component, input, output, InputSignal, OutputEmitterRef, effect, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MobileWalletDetails } from '../../../../../core/interfaces/purchase.interface';

@Component({
  selector: 'app-mobile-wallet-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './mobile-wallet-modal.component.html'
})
export class MobileWalletModalComponent {
  public readonly isOpen: InputSignal<boolean> = input<boolean>(false);
  public readonly initialData: InputSignal<MobileWalletDetails | null> = input<MobileWalletDetails | null>(null);
  public readonly isReadOnly: InputSignal<boolean> = input<boolean>(false);

  public readonly save: OutputEmitterRef<MobileWalletDetails> = output<MobileWalletDetails>();
  public readonly cancel: OutputEmitterRef<void> = output<void>();

  protected readonly form: FormGroup;
  protected readonly formSubmitted: WritableSignal<boolean> = signal<boolean>(false);

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.group({
      provider: ['JazzCash', [Validators.required]],
      mobileNumber: ['', [Validators.required, Validators.pattern(/^03[0-9]{9}$/)]],
      accountHolderName: [''],
      transactionId: ['', [Validators.required]],
      paymentDate: [new Date().toISOString().split('T')[0], [Validators.required]]
    });

    effect(() => {
      const data = this.initialData();
      if (data) {
        this.form.patchValue({
          provider: data.provider || 'JazzCash',
          mobileNumber: data.mobileNumber || '',
          accountHolderName: data.accountHolderName || '',
          transactionId: data.transactionId || '',
          paymentDate: data.paymentDate || new Date().toISOString().split('T')[0]
        });
      } else {
        this.form.reset({
          provider: 'JazzCash',
          mobileNumber: '',
          accountHolderName: '',
          transactionId: '',
          paymentDate: new Date().toISOString().split('T')[0]
        });
      }
      this.formSubmitted.set(false);
    });
  }

  protected setProvider(provider: 'JazzCash' | 'Easypaisa'): void {
    this.form.patchValue({ provider });
  }

  protected onNumericInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D/g, '').slice(0, 11);
    input.value = digitsOnly;
    this.form.get('mobileNumber')?.setValue(digitsOnly, { emitEvent: false });
  }

  protected getFieldError(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (control?.errors && (control.touched || control.dirty || this.formSubmitted())) {
      if (control.errors['required']) {
        if (fieldName === 'provider') return 'Provider is required';
        if (fieldName === 'mobileNumber') return 'Mobile number is required';
        if (fieldName === 'transactionId') return 'Transaction ID is required';
        if (fieldName === 'paymentDate') return 'Payment date is required';
        return 'This field is required';
      }
      if (control.errors['pattern'] && fieldName === 'mobileNumber') {
        return 'Enter a valid 11-digit mobile number (e.g. 03001234567)';
      }
    }
    return '';
  }

  protected onSave(): void {
    this.formSubmitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const val = this.form.value;
    this.save.emit({
      provider: val.provider || 'JazzCash',
      mobileNumber: (val.mobileNumber || '').trim(),
      accountHolderName: (val.accountHolderName || '').trim() || undefined,
      transactionId: (val.transactionId || '').trim(),
      paymentDate: val.paymentDate || new Date().toISOString().split('T')[0]
    });
  }

  protected onCancel(): void {
    this.cancel.emit();
  }
}
