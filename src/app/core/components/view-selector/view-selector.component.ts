import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ViewOption {
  key: string;
  label: string;
  icon: string;
  description?: string;
}

@Component({
  selector: 'app-view-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center bg-surface-container-lowest border border-outline-variant rounded-lg p-1 mb-6 gap-1">
      @for (option of options(); track option.key) {
        <button
          (click)="onSelectView(option.key)"
          [class]="getTabClasses(option.key)"
          class="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md font-label-sm text-label-sm transition-all duration-150 ease-in-out">
          <span class="material-symbols-outlined text-[16px]">{{ option.icon }}</span>
          <span class="font-medium">{{ option.label }}</span>
        </button>
      }
    </div>
  `
})
export class ViewSelectorComponent {
  public readonly options = input.required<ViewOption[]>();
  public readonly selectedView = input.required<string>();
  public readonly viewChanged = output<string>();

  protected onSelectView(viewKey: string): void {
    if (viewKey !== this.selectedView()) {
      this.viewChanged.emit(viewKey);
    }
  }

  protected getTabClasses(viewKey: string): string {
    const isSelected = viewKey === this.selectedView();
    
    if (isSelected) {
      return 'bg-surface-container text-on-surface shadow-sm border border-outline-variant/50';
    } else {
      return 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/50';
    }
  }
}