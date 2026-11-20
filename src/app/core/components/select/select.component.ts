import {
  Component,
  ElementRef,
  HostListener,
  InputSignal,
  ModelSignal,
  OutputEmitterRef,
  computed,
  input,
  model,
  output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SelectOption {
  label: string;
  value: string | number;
  icon?: string;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss']
})
export class SelectComponent {
  // Input signals
  public readonly options: InputSignal<SelectOption[] | string[]> = input<SelectOption[] | string[]>([]);
  public readonly placeholder: InputSignal<string> = input<string>('Select an option');
  public readonly label: InputSignal<string | undefined> = input<string | undefined>();
  public readonly icon: InputSignal<string | undefined> = input<string | undefined>();
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);
  public readonly customClass: InputSignal<string> = input<string>('');
  public readonly buttonClass: InputSignal<string> = input<string>('');
  public readonly hasError: InputSignal<boolean> = input<boolean>(false);

  // Model signal for two-way binding
  public readonly value: ModelSignal<string | number | null | undefined> = model<string | number | null | undefined>(null);

  // Output emitter for value changes
  public readonly selectionChange: OutputEmitterRef<string | number> = output<string | number>();

  // Open state signal
  protected readonly isOpen = signal<boolean>(false);

  constructor(private readonly elementRef: ElementRef) {}

  // Normalized options computed signal
  protected readonly normalizedOptions = computed<SelectOption[]>(() => {
    const raw = this.options();
    if (!raw || raw.length === 0) return [];
    
    return raw.map((item) => {
      if (typeof item === 'string') {
        return { label: item, value: item };
      }
      return item;
    });
  });

  // Selected option label computed signal
  protected readonly selectedLabel = computed<string>(() => {
    const val = this.value();
    if (val === null || val === undefined || val === '') {
      return this.placeholder();
    }
    const found = this.normalizedOptions().find((opt) => String(opt.value).toLowerCase() === String(val).toLowerCase());
    return found ? found.label : String(val);
  });

  // Dynamic classes for trigger button
  protected readonly triggerClasses = computed<string>(() => {
    const base = 'select-trigger-btn font-body-md text-body-md text-on-surface';
    const state = this.isOpen() ? 'is-open' : '';
    const err = this.hasError() ? 'has-error' : '';
    const extra = this.buttonClass();
    return `${base} ${state} ${err} ${extra}`.trim();
  });

  protected isOptionSelected(opt: SelectOption): boolean {
    const current = this.value();
    if (current === null || current === undefined) return false;
    return String(opt.value).toLowerCase() === String(current).toLowerCase();
  }

  protected toggleDropdown(): void {
    if (this.disabled()) return;
    this.isOpen.update((v) => !v);
  }

  protected selectOption(opt: SelectOption): void {
    this.value.set(opt.value);
    this.selectionChange.emit(opt.value);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  @HostListener('keydown.escape')
  protected onEscape(): void {
    this.isOpen.set(false);
  }
}
