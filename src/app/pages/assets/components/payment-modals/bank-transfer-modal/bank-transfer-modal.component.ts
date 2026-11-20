import { Component, input, output, InputSignal, OutputEmitterRef, effect, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BankTransferDetails } from '../../../../../core/interfaces/purchase.interface';

@Component({
  selector: 'app-bank-transfer-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './bank-transfer-modal.component.html'
})
export class BankTransferModalComponent {
  public readonly isOpen: InputSignal<boolean> = input<boolean>(false);
  public readonly initialData: InputSignal<BankTransferDetails | null> = input<BankTransferDetails | null>(null);
  public readonly isReadOnly: InputSignal<boolean> = input<boolean>(false);

  public readonly save: OutputEmitterRef<BankTransferDetails> = output<BankTransferDetails>();
  public readonly cancel: OutputEmitterRef<void> = output<void>();

  protected readonly form: FormGroup;
  protected readonly formSubmitted: WritableSignal<boolean> = signal<boolean>(false);

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.group({
      bankName: ['', [Validators.required]],
      accountNumber: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(24), Validators.pattern(/^[A-Za-z0-9]{8,24}$/)]],
      transactionReference: ['', [Validators.required, Validators.maxLength(50)]],
      paymentDate: [new Date().toISOString().split('T')[0], [Validators.required]]
    });

    effect(() => {
      const data = this.initialData();
      if (data) {
        this.form.patchValue({
          bankName: data.bankName || '',
          accountNumber: data.accountNumber || '',
          transactionReference: data.transactionReference || '',
          paymentDate: data.paymentDate || new Date().toISOString().split('T')[0]
        });
      } else {
        this.form.reset({
          bankName: '',
          accountNumber: '',
          transactionReference: '',
          paymentDate: new Date().toISOString().split('T')[0]
        });
      }
      this.formSubmitted.set(false);
    });
  }

  protected onAccountNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const clean = input.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 24);
    this.form.get('accountNumber')?.setValue(clean, { emitEvent: false });
    input.value = clean;
  }

  protected getFieldError(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (control?.errors && (control.touched || control.dirty || this.formSubmitted())) {
      if (control.errors['required']) {
        if (fieldName === 'bankName') return 'Bank name is required';
        if (fieldName === 'accountNumber') return 'Account number / IBAN is required';
        if (fieldName === 'transactionReference') return 'Transaction reference is required';
        if (fieldName === 'paymentDate') return 'Payment date is required';
        return 'This field is required';
      }
      if (control.errors['minlength'] || control.errors['pattern']) {
        if (fieldName === 'accountNumber') return 'Enter a valid Account Number (10-16 digits) or IBAN (up to 24 characters)';
      }
      if (control.errors['maxlength']) {
        return `Maximum ${control.errors['maxlength'].requiredLength} characters`;
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
      bankName: (val.bankName || '').trim(),
      accountNumber: (val.accountNumber || '').trim(),
      transactionReference: (val.transactionReference || '').trim(),
      paymentDate: val.paymentDate || new Date().toISOString().split('T')[0]
    });
  }

  protected onCancel(): void {
    this.cancel.emit();
  }
}
