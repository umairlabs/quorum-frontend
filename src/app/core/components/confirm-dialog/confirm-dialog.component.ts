import { Component, input, output, InputSignal, OutputEmitterRef } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [],
  templateUrl: './confirm-dialog.component.html'
})
export class ConfirmDialogComponent {
  public readonly isOpen: InputSignal<boolean> = input<boolean>(false);
  public readonly title: InputSignal<string> = input<string>('Are you sure?');
  public readonly message: InputSignal<string> = input<string>('This action cannot be undone.');
  public readonly confirmLabel: InputSignal<string> = input<string>('Delete');
  public readonly cancelLabel: InputSignal<string> = input<string>('Cancel');
  public readonly dangerous: InputSignal<boolean> = input<boolean>(true);
  public readonly icon: InputSignal<string> = input<string>('');

  public readonly confirm: OutputEmitterRef<void> = output<void>();
  public readonly cancel: OutputEmitterRef<void> = output<void>();

  protected onConfirm(): void {
    this.confirm.emit();
  }

  protected onCancel(): void {
    this.cancel.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('confirm-backdrop')) {
      this.onCancel();
    }
  }
}
