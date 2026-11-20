import { Component, input, InputSignal, output, OutputEmitterRef, signal, WritableSignal, effect, Renderer2, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DOCUMENT } from '@angular/common';

export interface AssignAssetFormValue {
  employeeName: string;
  department: string;
  assignedDate: string;
}

@Component({
  selector: 'app-assign-asset-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assign-asset-modal.component.html'
})
export class AssignAssetModalComponent {
  public readonly isOpen: InputSignal<boolean> = input<boolean>(false);
  public readonly assetName: InputSignal<string> = input<string>('');
  public readonly close: OutputEmitterRef<void> = output<void>();
  public readonly save: OutputEmitterRef<AssignAssetFormValue> = output<AssignAssetFormValue>();

  protected readonly employeeName: WritableSignal<string> = signal<string>('');
  protected readonly department: WritableSignal<string> = signal<string>('');
  protected readonly assignedDate: WritableSignal<string> = signal<string>(this.todayDate());
  protected readonly submitAttempted: WritableSignal<boolean> = signal<boolean>(false);

  private readonly renderer = inject(Renderer2);
  private readonly document = inject(DOCUMENT);

  constructor() {
    // Handle body scroll lock when modal opens/closes
    effect(() => {
      const body = this.document.body;
      if (this.isOpen()) {
        this.renderer.addClass(body, 'overflow-hidden');
      } else {
        this.renderer.removeClass(body, 'overflow-hidden');
      }
    });
  }

  private todayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  protected onSubmit(): void {
    this.submitAttempted.set(true);
    if (!this.employeeName().trim()) return;

    this.save.emit({
      employeeName: this.employeeName().trim(),
      department: this.department().trim(),
      assignedDate: this.assignedDate()
    });

    this.resetForm();
  }

  protected onClose(): void {
    this.resetForm();
    this.close.emit();
  }

  private resetForm(): void {
    this.employeeName.set('');
    this.department.set('');
    this.assignedDate.set(this.todayDate());
    this.submitAttempted.set(false);
  }
}