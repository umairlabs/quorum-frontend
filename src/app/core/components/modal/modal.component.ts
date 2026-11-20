import { Component, input, output, InputSignal, OutputEmitterRef } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [],
  templateUrl: './modal.component.html'
})
export class ModalComponent {
  public readonly title: InputSignal<string> = input<string>('');
  public readonly breadcrumb: InputSignal<string> = input<string>('');
  public readonly isOpen: InputSignal<boolean> = input<boolean>(false);
  public readonly maxWidth: InputSignal<string> = input<string>('max-w-[1440px]');
  public readonly fullPage: InputSignal<boolean> = input<boolean>(true);
  public readonly hideHeader: InputSignal<boolean> = input<boolean>(false);
  public readonly showCloseButton: InputSignal<boolean> = input<boolean>(true);
  public readonly close: OutputEmitterRef<void> = output<void>();

  protected onClose(): void {
    this.close.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.onClose();
    }
  }
}