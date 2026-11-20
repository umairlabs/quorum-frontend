import { Component, ElementRef, HostListener, inject, input, output, signal, InputSignal, OutputEmitterRef, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrencyService, CurrencyCode, CurrencyConfig } from '../../services/currency.service';

export type CurrencySelectorVariant = 'input-addon' | 'pill' | 'dropdown';

export interface CurrencyChangeEvent {
  previous: CurrencyCode;
  current: CurrencyCode;
}

@Component({
  selector: 'app-currency-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './currency-selector.component.html'
})
export class CurrencySelectorComponent {
  private readonly elementRef = inject(ElementRef);
  protected readonly currencyService = inject(CurrencyService);

  public readonly variant: InputSignal<CurrencySelectorVariant> = input<CurrencySelectorVariant>('input-addon');
  public readonly showName: InputSignal<boolean> = input<boolean>(false);
  public readonly currencyChange: OutputEmitterRef<CurrencyChangeEvent> = output<CurrencyChangeEvent>();

  protected readonly isOpen: WritableSignal<boolean> = signal<boolean>(false);

  protected readonly currencies: CurrencyConfig[] = Array.from(
    new Map(this.currencyService.currencies.map(c => [c.code, c])).values()
  );

  protected onSelect(code: CurrencyCode): void {
    const previous = this.currencyService.activeCurrency();
    if (previous === code) {
      this.isOpen.set(false);
      return;
    }
    this.currencyService.setCurrency(code);
    this.currencyChange.emit({ previous, current: code });
    this.isOpen.set(false);
  }

  protected toggleDropdown(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.isOpen.update(v => !v);
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
