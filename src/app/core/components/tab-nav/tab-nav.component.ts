import { Component, input, output, InputSignal, OutputEmitterRef } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Tab {
  key: string;
  label: string;
}

@Component({
  selector: 'app-tab-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tab-nav.component.html'
})
export class TabNavComponent {
  public readonly tabs: InputSignal<Tab[]> = input<Tab[]>([]);
  public readonly activeTab: InputSignal<string> = input<string>('');
  public readonly tabChange: OutputEmitterRef<string> = output<string>();

  protected onTabClick(key: string): void {
    this.tabChange.emit(key);
  }
}
