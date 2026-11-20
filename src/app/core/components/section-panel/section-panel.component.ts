import { Component, input, output, InputSignal, OutputEmitterRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-section-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './section-panel.component.html'
})
export class SectionPanelComponent {
  public readonly title: InputSignal<string> = input<string>('');
  public readonly actionLabel: InputSignal<string | null> = input<string | null>(null);
  public readonly actionClick: OutputEmitterRef<void> = output<void>();

  protected onActionClick(): void {
    this.actionClick.emit();
  }
}
