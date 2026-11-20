import { Injectable, signal, WritableSignal, computed, Signal } from '@angular/core';
import { environment } from '../../../environments/environment';

export type CurrencyCode = 'PKR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SAR';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
  decimals: number;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'PKR', symbol: 'Rs. ', name: 'Pakistani Rupee', flag: '🇵🇰', decimals: 0 },
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', decimals: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', decimals: 2 },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', decimals: 2 },
  { code: 'AED', symbol: 'AED ', name: 'UAE Dirham', flag: '🇦🇪', decimals: 2 },
  { code: 'SAR', symbol: 'SAR ', name: 'Saudi Riyal', flag: '🇸🇦', decimals: 2 },
];

const STORAGE_KEY_CURRENCY = 'astra_preferred_currency';
const STORAGE_KEY_RATES = 'astra_exchange_rates';
const STORAGE_KEY_RATES_TS = 'astra_exchange_rates_ts';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 Hour

// Fallback rates relative to 1 PKR
const DEFAULT_RATES: Record<CurrencyCode, number> = {
  PKR: 1,
  USD: 0.0036, // ~1 USD = 278 PKR
  EUR: 0.0033, // ~1 EUR = 303 PKR
  GBP: 0.0028, // ~1 GBP = 357 PKR
  AED: 0.0132, // ~1 AED = 75.7 PKR
  SAR: 0.0135, // ~1 SAR = 74.1 PKR
};

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly defaultCurrency: CurrencyCode = 'PKR';

  public readonly activeCurrency: WritableSignal<CurrencyCode> = signal<CurrencyCode>(
    this.getInitialCurrency()
  );

  public readonly exchangeRates: WritableSignal<Record<CurrencyCode, number>> = signal<Record<CurrencyCode, number>>(
    this.getInitialRates()
  );

  public readonly currentConfig: Signal<CurrencyConfig> = computed(() => {
    const code = this.activeCurrency();
    return SUPPORTED_CURRENCIES.find(c => c.code === code) ?? SUPPORTED_CURRENCIES[0];
  });

  public readonly currencies: CurrencyConfig[] = SUPPORTED_CURRENCIES;

  constructor() {
    this.fetchLiveRates();
    this.fetchCompanyCurrency();
  }

  public async fetchCompanyCurrency(): Promise<void> {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(`${environment.apiUrl}/company-settings/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) return;

      const data = await response.json();
      const code = (data.currency || data.currency_code) as CurrencyCode;
      if (code && SUPPORTED_CURRENCIES.some(c => c.code === code)) {
        this.setCurrency(code);
      }
    } catch {
      // Fallback to local storage or defaults
    }
  }

  private getInitialCurrency(): CurrencyCode {
    const stored = localStorage.getItem(STORAGE_KEY_CURRENCY) as CurrencyCode;
    if (stored && SUPPORTED_CURRENCIES.some(c => c.code === stored)) {
      return stored;
    }
    return this.defaultCurrency;
  }

  private getInitialRates(): Record<CurrencyCode, number> {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_RATES);
      if (cached) {
        return { ...DEFAULT_RATES, ...JSON.parse(cached) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_RATES;
  }

  public setCurrency(code: CurrencyCode): void {
    if (!SUPPORTED_CURRENCIES.some(c => c.code === code)) return;
    this.activeCurrency.set(code);
    localStorage.setItem(STORAGE_KEY_CURRENCY, code);
  }

  public getSymbol(code?: CurrencyCode): string {
    const target = code ?? this.activeCurrency();
    const config = SUPPORTED_CURRENCIES.find(c => c.code === target);
    return config ? config.symbol : '$';
  }

  /**
   * Converts a base amount (in PKR) to the target currency.
   */
  public convert(amountInBase: number, targetCurrency?: CurrencyCode): number {
    if (amountInBase == null || isNaN(amountInBase)) return 0;
    const target = targetCurrency ?? this.activeCurrency();
    if (target === 'PKR') return amountInBase;

    const rate = this.exchangeRates()[target] ?? DEFAULT_RATES[target] ?? 1;
    return amountInBase * rate;
  }

  /**
   * Converts an amount from base currency (PKR) to a specific target currency.
   */
  public convertFromBase(amountInBase: number, targetCurrency?: CurrencyCode): number {
    return this.convert(amountInBase, targetCurrency);
  }

  /**
   * Converts an amount from a given currency back into base currency (PKR).
   */
  public convertToBase(amount: number, fromCurrency?: CurrencyCode): number {
    if (amount == null || isNaN(amount) || amount === 0) return 0;
    const source = fromCurrency ?? this.activeCurrency();
    if (source === 'PKR') return amount;

    const rates = this.exchangeRates();
    const rate = rates[source] ?? DEFAULT_RATES[source] ?? 1;
    return rate > 0 ? amount / rate : amount;
  }

  /**
   * Converts an amount directly from one currency to another and rounds appropriately.
   * e.g. convertBetween(100, 'USD', 'PKR') -> 27778
   */
  public convertBetween(
    amount: number,
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode
  ): number {
    if (amount == null || isNaN(amount) || amount === 0) return 0;
    if (fromCurrency === toCurrency) return amount;

    const amountInPKR = this.convertToBase(amount, fromCurrency);
    const converted = this.convertFromBase(amountInPKR, toCurrency);

    const targetConfig = SUPPORTED_CURRENCIES.find(c => c.code === toCurrency) ?? SUPPORTED_CURRENCIES[0];
    const factor = Math.pow(10, targetConfig.decimals);
    return Math.round(converted * factor) / factor;
  }

  /**
   * Formats a base amount (in PKR) to a currency-formatted string.
   * e.g. format(10000) -> "Rs. 10,000" (for PKR) or "$36.00" (for USD)
   */
  public format(
    amountInBase: number,
    targetCurrency?: CurrencyCode,
    options?: { hideSymbol?: boolean; showCode?: boolean }
  ): string {
    if (amountInBase == null || isNaN(amountInBase)) return options?.hideSymbol ? '0' : `${this.getSymbol(targetCurrency)}0`;

    const target = targetCurrency ?? this.activeCurrency();
    const config = SUPPORTED_CURRENCIES.find(c => c.code === target) ?? SUPPORTED_CURRENCIES[0];
    const converted = this.convert(amountInBase, target);

    const formattedNumber = converted.toLocaleString(undefined, {
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    });

    if (options?.hideSymbol) {
      return formattedNumber;
    }

    if (options?.showCode) {
      return `${config.symbol}${formattedNumber} ${config.code}`;
    }

    return `${config.symbol}${formattedNumber}`;
  }

  /**
   * Fetches latest live exchange rates from Open Exchange Rates API.
   */
  public async fetchLiveRates(): Promise<void> {
    try {
      const lastTs = localStorage.getItem(STORAGE_KEY_RATES_TS);
      const isExpired = !lastTs || (Date.now() - Number(lastTs) > CACHE_DURATION_MS);

      if (!isExpired) {
        return; // Cache still fresh
      }

      const response = await fetch('https://open.er-api.com/v6/latest/PKR');
      if (!response.ok) return;

      const data = await response.json();
      if (data && data.rates) {
        const newRates: Record<CurrencyCode, number> = {
          PKR: 1,
          USD: data.rates['USD'] ?? DEFAULT_RATES.USD,
          EUR: data.rates['EUR'] ?? DEFAULT_RATES.EUR,
          GBP: data.rates['GBP'] ?? DEFAULT_RATES.GBP,
          AED: data.rates['AED'] ?? DEFAULT_RATES.AED,
          SAR: data.rates['SAR'] ?? DEFAULT_RATES.SAR,
        };

        this.exchangeRates.set(newRates);
        localStorage.setItem(STORAGE_KEY_RATES, JSON.stringify(newRates));
        localStorage.setItem(STORAGE_KEY_RATES_TS, Date.now().toString());
      }
    } catch (error) {
      console.warn('[CurrencyService] Using cached / fallback exchange rates:', error);
    }
  }
}
