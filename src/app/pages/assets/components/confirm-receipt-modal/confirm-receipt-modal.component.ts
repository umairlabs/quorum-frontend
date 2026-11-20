import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-confirm-receipt-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './confirm-receipt-modal.component.html'
})
export class ConfirmReceiptModalComponent {
  public readonly isOpen = input<boolean>(false);
  public readonly assetName = input<string>('');
  public readonly serialNumber = input<string>('');

  public readonly confirmReceipt = output<{ condition: string; notes: string }>();
  public readonly cancel = output<void>();

  protected selectedCondition = signal<string>('Good Condition');
  protected notes = signal<string>('');

  protected onConfirm(): void {
    this.confirmReceipt.emit({
      condition: this.selectedCondition(),
      notes: this.notes()
    });
  }

  protected onCancel(): void {
    this.cancel.emit();
  }
}
