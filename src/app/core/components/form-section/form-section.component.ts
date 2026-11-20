import { Component, input, InputSignal } from '@angular/core';

@Component({
  selector: 'app-form-section',
  standalone: true,
  imports: [],
  templateUrl: './form-section.component.html',
  host: {
    '[attr.title]': 'null'
  }
})
export class FormSectionComponent {
  public readonly title: InputSignal<string> = input<string>('');
  public readonly icon: InputSignal<string> = input<string>('');
}
