import { Component, input, output, InputSignal, OutputEmitterRef } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [],
  templateUrl: './empty-state.component.html'
})
export class EmptyStateComponent {
  public readonly icon: InputSignal<string> = input<string>('inbox');
  public readonly title: InputSignal<string> = input<string>('No results found');
  public readonly description: InputSignal<string> = input<string>('');
  public readonly actionLabel: InputSignal<string> = input<string>('');
  public readonly actionClick: OutputEmitterRef<void> = output<void>();

  protected onActionClick(): void {
    this.actionClick.emit()
  }
}
