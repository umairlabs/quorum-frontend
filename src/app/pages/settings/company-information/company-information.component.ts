import { Component, ElementRef, inject, OnInit, signal, ViewChild, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { ToastService } from '../../../core/services/toast.service';
import { CompanySettingsApisService } from '../services/company-settings-apis.service';
import { CompanySettings, COMPANY_SETTINGS_DEFAULTS } from '../../../core/interfaces/company-settings.interface';
import { PhoneInputComponent } from '../../../core/components/phone-input/phone-input.component';
import { CurrencyService, CurrencyCode } from '../../../core/services/currency.service';

@Component({
  selector: 'app-company-information',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, PhoneInputComponent],
  templateUrl: './company-information.component.html'
})
export class CompanyInformationComponent implements OnInit {
  private readonly fb                   = inject(FormBuilder);
  private readonly toastService         = inject(ToastService);
  private readonly companySettingsApi   = inject(CompanySettingsApisService);
  private readonly currencyService      = inject(CurrencyService);

  @ViewChild('logoInput') logoInputRef!: ElementRef<HTMLInputElement>;

  protected readonly isLoading:   WritableSignal<boolean>      = signal(true);
  protected readonly isSaving:    WritableSignal<boolean>      = signal(false);
  protected readonly isEditMode:  WritableSignal<boolean>      = signal(false);
  protected readonly logoPreview: WritableSignal<string | null> = signal(null);

  // Last successfully saved snapshot — used by Cancel to revert without an API call
  private savedSettings: CompanySettings = { ...COMPANY_SETTINGS_DEFAULTS };
  private savedLogoUrl:  string | null   = null;

  protected readonly currencies: CurrencyCode[] = ['PKR', 'USD', 'EUR', 'GBP', 'AED', 'SAR'];
  protected readonly timeZones  = [
    'Asia/Karachi',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Riyadh',
    'Europe/London',
    'Europe/Paris',
    'America/New_York',
    'America/Chicago',
    'America/Los_Angeles',
    'UTC'
  ];
  protected readonly dateFormats = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];

  protected form: FormGroup = this.buildForm(COMPANY_SETTINGS_DEFAULTS);

  public ngOnInit(): void {
    this.loadSettings();
  }

  private buildForm(data: CompanySettings): FormGroup {
    const group = this.fb.group({
      companyName:    [data.companyName,    [Validators.required]],
      officialEmail:  [data.officialEmail,  [Validators.required, Validators.email]],
      companyPhone:   [data.companyPhone,   []],
      companyAddress: [data.companyAddress, [Validators.required]],
      currency:       [data.currency,       [Validators.required]],
      timeZone:       [data.timeZone,       [Validators.required]],
      dateFormat:     [data.dateFormat,     [Validators.required]],
    });

    group.get('currency')?.valueChanges.subscribe((newVal) => {
      if (newVal && this.currencies.includes(newVal)) {
        this.currencyService.setCurrency(newVal);
      }
    });

    return group;
  }

  private loadSettings(): void {
    this.isLoading.set(true);
    this.companySettingsApi.getCompanySettings().subscribe({
      next: (data) => {
        this.savedSettings = { ...data };
        this.savedLogoUrl  = data.logoUrl ?? null;
        this.form = this.buildForm(data);
        this.form.disable();                          // View Mode — read-only
        if (data.logoUrl) this.logoPreview.set(data.logoUrl);
        if (data.currency) {
          this.currencyService.setCurrency(data.currency as CurrencyCode);
        }
        this.isLoading.set(false);
      },
      error: (err: unknown) => {
        console.error('[CompanyInformation] Failed to load settings:', err);
        this.toastService.presentToast('Failed to load company information.', 2500, 'error');
        this.form = this.buildForm(COMPANY_SETTINGS_DEFAULTS);
        this.form.disable();
        this.isLoading.set(false);
      }
    });
  }

  protected onEdit(): void {
    this.isEditMode.set(true);
    this.form.enable();
  }

  protected onCancel(): void {
    // Revert form and logo to last saved snapshot — no API call
    this.pendingLogoFile = null;
    this.form = this.buildForm(this.savedSettings);
    this.form.disable();
    this.logoPreview.set(this.savedLogoUrl);
    if (this.savedSettings.currency) {
      this.currencyService.setCurrency(this.savedSettings.currency as CurrencyCode);
    }
    this.isEditMode.set(false);
  }

  // Holds the actual File object selected — used for upload on Save
  private pendingLogoFile: File | null = null;

  protected onLogoButtonClick(): void {
    this.logoInputRef.nativeElement.click();
  }

  protected onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      this.toastService.presentToast('Only JPG, PNG and SVG files are allowed.', 2500, 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.toastService.presentToast('Logo file size must be under 2MB.', 2500, 'error');
      return;
    }
    // Store File for upload on Save; show base64 preview only temporarily
    this.pendingLogoFile = file;
    const reader = new FileReader();
    reader.onload = (e) => this.logoPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  protected onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    // If a new logo file was selected, upload it first then save settings
    if (this.pendingLogoFile) {
      this.companySettingsApi.uploadCompanyLogo(this.pendingLogoFile).subscribe({
        next: (res) => {
          this.pendingLogoFile = null;
          // Use the backend-returned URL (persistent) instead of the blob
          this.logoPreview.set(res.logo_url);
          this.saveSettings(res.logo_url);
        },
        error: (err: unknown) => {
          console.error('[CompanyInformation] Logo upload failed:', err);
          this.isSaving.set(false);
          this.toastService.presentToast('Failed to upload logo. Please try again.', 2500, 'error');
        }
      });
    } else {
      this.saveSettings(this.savedLogoUrl ?? undefined);
    }
  }

  private saveSettings(logoUrl: string | null | undefined): void {
    const payload: Partial<CompanySettings> = {
      ...this.form.value,
      logoUrl: logoUrl ?? undefined
    };

    this.companySettingsApi.updateCompanySettings(payload).subscribe({
      next: (updated) => {
        // Use the normalized server response as the new snapshot
        this.savedSettings = { ...updated };
        this.savedLogoUrl  = updated.logoUrl ?? null;
        // Set preview from backend URL — persists across refresh
        this.logoPreview.set(updated.logoUrl ?? null);
        if (updated.currency) {
          this.currencyService.setCurrency(updated.currency as CurrencyCode);
        }
        this.form = this.buildForm(updated);
        this.form.disable();
        this.isEditMode.set(false);
        this.isSaving.set(false);
        this.toastService.presentToast('Company information saved successfully.', 2000, 'success');
      },
      error: (err: unknown) => {
        console.error('[CompanyInformation] Failed to save settings:', err);
        this.isSaving.set(false);
        this.toastService.presentToast(
          'Failed to save company information. Please try again.',
          2500,
          'error'
        );
      }
    });
  }

  protected getError(field: string): string | null {
    const c = this.form.get(field);
    if (!c || !c.invalid || !c.touched) return null;
    if (c.errors?.['required'])     return 'This field is required';
    if (c.errors?.['email'])        return 'Please enter a valid email address';
    if (c.errors?.['phoneInvalid']) {
      const { country, expected } = c.errors['phoneInvalid'];
      return `Enter a valid ${expected}-digit phone number for ${country}`;
    }
    return null;
  }
}
