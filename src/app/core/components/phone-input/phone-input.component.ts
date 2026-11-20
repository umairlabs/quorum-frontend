import { Component, forwardRef, HostListener, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, ControlValueAccessor, FormsModule, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator } from '@angular/forms';

interface Country {
  name: string;
  iso: string;
  dialCode: string;
  flag: string;
  digits: number; // expected local number length (excluding dial code)
}

export const COUNTRIES: Country[] = [
  { name: 'Pakistan', iso: 'PK', dialCode: '92', flag: '🇵🇰', digits: 10 },
  { name: 'United States', iso: 'US', dialCode: '1', flag: '🇺🇸', digits: 10 },
  { name: 'United Kingdom', iso: 'GB', dialCode: '44', flag: '🇬🇧', digits: 10 },
  { name: 'United Arab Emirates', iso: 'AE', dialCode: '971', flag: '🇦🇪', digits: 9 },
  { name: 'Saudi Arabia', iso: 'SA', dialCode: '966', flag: '🇸🇦', digits: 9 },
  { name: 'India', iso: 'IN', dialCode: '91', flag: '🇮🇳', digits: 10 },
  { name: 'Canada', iso: 'CA', dialCode: '1', flag: '🇨🇦', digits: 10 },
  { name: 'Australia', iso: 'AU', dialCode: '61', flag: '🇦🇺', digits: 9 },
  { name: 'Germany', iso: 'DE', dialCode: '49', flag: '🇩🇪', digits: 11 },
  { name: 'China', iso: 'CN', dialCode: '86', flag: '🇨🇳', digits: 11 },
  { name: 'Turkey', iso: 'TR', dialCode: '90', flag: '🇹🇷', digits: 10 },
  { name: 'Bangladesh', iso: 'BD', dialCode: '880', flag: '🇧🇩', digits: 10 },
  { name: 'Qatar', iso: 'QA', dialCode: '974', flag: '🇶🇦', digits: 8 },
  { name: 'France', iso: 'FR', dialCode: '33', flag: '🇫🇷', digits: 9 },
];

@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true,
    },
  ],
  templateUrl: './phone-input.component.html',
})
export class PhoneInputComponent implements ControlValueAccessor, Validator {
  protected readonly countries = COUNTRIES;
  protected readonly selectedCountry: WritableSignal<Country> = signal(COUNTRIES[0]);
  protected readonly localNumber: WritableSignal<string> = signal('');
  protected readonly dropdownOpen: WritableSignal<boolean> = signal(false);
  protected readonly searchTerm: WritableSignal<string> = signal('');

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  protected get filteredCountries(): Country[] {
    const q = this.searchTerm().toLowerCase().trim();
    if (!q) return this.countries;
    return this.countries.filter(
      c => c.name.toLowerCase().includes(q) || c.dialCode.includes(q)
    );
  }

  @HostListener('document:click')
  protected closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  protected toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.dropdownOpen.set(!this.dropdownOpen());
  }

  protected selectCountry(country: Country, event: MouseEvent): void {
    event.stopPropagation();
    this.selectedCountry.set(country);
    this.dropdownOpen.set(false);
    this.searchTerm.set('');
    // Trim existing number if it exceeds new country's digit limit
    const trimmed = this.localNumber().slice(0, country.digits);
    this.localNumber.set(trimmed);
    this.emitValue();
    this.onValidatorChange();
  }

  protected onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  protected onNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Only digits allowed, restricted to selected country's max length
    const digitsOnly = input.value.replace(/\D/g, '').slice(0, this.selectedCountry().digits);
    this.localNumber.set(digitsOnly);
    input.value = digitsOnly;
    this.emitValue();
    this.onTouched();
    this.onValidatorChange();
  }

  private emitValue(): void {
    const full = this.localNumber()
      ? `+${this.selectedCountry().dialCode}${this.localNumber()}`
      : '';
    this.onChange(full);
  }

  // ControlValueAccessor
  writeValue(value: string): void {
    if (!value) {
      this.localNumber.set('');
      return;
    }
    // Parse "+923001234567" or "+92 3001234567" back into country + local digits
    const stripped = value.replace(/\s/g, '');
    // Sort by dialCode length descending so longer codes match first (+880 before +88)
    const sorted = [...this.countries].sort((a, b) => b.dialCode.length - a.dialCode.length);
    const match  = sorted.find(c => stripped.startsWith(`+${c.dialCode}`));
    if (match) {
      this.selectedCountry.set(match);
      const rest = stripped.slice(match.dialCode.length + 1).replace(/\D/g, '');
      this.localNumber.set(rest.slice(0, match.digits));
    } else {
      this.localNumber.set(stripped.replace(/\D/g, ''));
    }
  }

  // Validator
  validate(_control: AbstractControl): ValidationErrors | null {
    const digits  = this.localNumber();
    const country = this.selectedCountry();
    if (!digits) return { required: true };
    if (digits.length < country.digits) {
      return {
        phoneInvalid: {
          expected: country.digits,
          actual:   digits.length,
          country:  country.name,
        }
      };
    }
    return null;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}