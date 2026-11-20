import { Component, input, output, InputSignal, OutputEmitterRef } from '@angular/core';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [],
  templateUrl: './search-input.component.html'
})
export class SearchInputComponent {
  public readonly value: InputSignal<string> = input<string>('');
  public readonly placeholder: InputSignal<string> = input<string>('Search...');
  public readonly valueChange: OutputEmitterRef<string> = output<string>();

  protected onInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
