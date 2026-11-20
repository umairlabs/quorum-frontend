import { Pipe, PipeTransform, inject } from '@angular/core';
import { CurrencyService, CurrencyCode } from '../services/currency.service';

@Pipe({
  name: 'appCurrency',
  standalone: true,
  pure: false, // Impure to automatically re-evaluate when activeCurrency signal changes
})
export class AppCurrencyPipe implements PipeTransform {
  private readonly currencyService = inject(CurrencyService);

  public transform(
    value: number | string | null | undefined,
    targetCurrency?: CurrencyCode,
    options?: { hideSymbol?: boolean; showCode?: boolean }
  ): string {
    if (value == null || value === '') return this.currencyService.format(0, targetCurrency, options);
    const num = typeof value === 'number' ? value : parseFloat(value.toString());
    return this.currencyService.format(isNaN(num) ? 0 : num, targetCurrency, options);
  }
}
