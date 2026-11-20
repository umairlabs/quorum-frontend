import { Component, input, output, InputSignal, OutputEmitterRef, effect, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ChequeDetails } from '../../../../../core/interfaces/purchase.interface';

@Component({
  selector: 'app-cheque-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cheque-modal.component.html'
})
export class ChequeModalComponent {
  public readonly isOpen: InputSignal<boolean> = input<boolean>(false);
  public readonly initialData: InputSignal<ChequeDetails | null> = input<ChequeDetails | null>(null);
  public readonly isReadOnly: InputSignal<boolean> = input<boolean>(false);

  public readonly save: OutputEmitterRef<ChequeDetails> = output<ChequeDetails>();
  public readonly cancel: OutputEmitterRef<void> = output<void>();

  protected readonly form: FormGroup;
  protected readonly formSubmitted: WritableSignal<boolean> = signal<boolean>(false);

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.group({
      bankName: ['', [Validators.required]],
      chequeNumber: ['', [Validators.required, Validators.maxLength(30)]],
      chequeDate: [new Date().toISOString().split('T')[0], [Validators.required]],
      paymentDate: [new Date().toISOString().split('T')[0], [Validators.required]]
    });

    effect(() => {
      const data = this.initialData();
      if (data) {
        this.form.patchValue({
          bankName: data.bankName || '',
          chequeNumber: data.chequeNumber || '',
          chequeDate: data.chequeDate || new Date().toISOString().split('T')[0],
          paymentDate: data.paymentDate || new Date().toISOString().split('T')[0]
        });
      } else {
        this.form.reset({
          bankName: '',
          chequeNumber: '',
          chequeDate: new Date().toISOString().split('T')[0],
          paymentDate: new Date().toISOString().split('T')[0]
        });
      }
      this.formSubmitted.set(false);
    });
  }

  protected getFieldError(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (control?.errors && (control.touched || control.dirty || this.formSubmitted())) {
      if (control.errors['required']) {
        if (fieldName === 'bankName') return 'Bank name is required';
        if (fieldName === 'chequeNumber') return 'Cheque number is required';
        if (fieldName === 'chequeDate') return 'Cheque date is required';
        if (fieldName === 'paymentDate') return 'Payment date is required';
        return 'This field is required';
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
      chequeNumber: (val.chequeNumber || '').trim(),
      chequeDate: val.chequeDate || new Date().toISOString().split('T')[0],
      paymentDate: val.paymentDate || new Date().toISOString().split('T')[0]
    });
  }

  protected onCancel(): void {
    this.cancel.emit();
  }
}
