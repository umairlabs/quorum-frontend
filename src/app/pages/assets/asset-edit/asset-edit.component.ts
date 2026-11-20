import { Component, computed, inject, OnInit, signal, Signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AssetService } from '../services/asset.service';
import { AssetApisService } from '../services/asset-apis.service';
import { AssetCategory } from '../../../core/interfaces/asset-category.interface';
import { CategoryService } from '../../../core/services/category.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { FormSectionComponent } from '../../../core/components/form-section/form-section.component';
import { CurrencySelectorComponent, CurrencyChangeEvent } from '../../../core/components/currency-selector/currency-selector.component';
import { CurrencyService } from '../../../core/services/currency.service';
import { Asset, AssetStatus, AssetUpdate, TechSpecItem } from '../../../core/interfaces/asset.interface';
import { AuthApisService } from '../../../core/services/api/auth-apis.service';
import { SelectComponent, SelectOption } from '../../../core/components/select/select.component';

@Component({
  selector: 'app-asset-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, FormSectionComponent, CurrencySelectorComponent, SelectComponent],
  templateUrl: './asset-edit.component.html',
})
export class AssetEditComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly assetService = inject(AssetService);
  protected readonly categoryService = inject(CategoryService);
  protected readonly currencyService = inject(CurrencyService);
  private readonly assetApisService = inject(AssetApisService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected asset: Asset | null = null;
  protected readonly categories: WritableSignal<AssetCategory[]> = signal<AssetCategory[]>([]);

  protected readonly categoryOptions: Signal<SelectOption[]> = computed<SelectOption[]>(() => {
    const list = this.categories().length ? this.categories() : this.categoryService.activeCategoriesList();
    return list.map(cat => ({
      label: cat.name,
      value: cat.name,
    }));
  });

  protected readonly statusOptions: SelectOption[] = [
    { label: 'Available', value: 'AVAILABLE' },
    { label: 'Assigned', value: 'ASSIGNED' },
    { label: 'Maintenance', value: 'MAINTENANCE' },
    { label: 'Scrapped', value: 'SCRAPPED' },
  ];

  protected onCategorySelect(value: string | number): void {
    this.form.patchValue({ category: String(value) });
    this.form.get('category')?.markAsTouched();
    this.form.get('category')?.markAsDirty();
  }

  protected onStatusSelect(value: string | number): void {
    this.form.patchValue({ status: String(value) });
    this.form.get('status')?.markAsTouched();
    this.form.get('status')?.markAsDirty();
  }

  // isPurchasedAsset drives conditional field visibility in the template.
  // Inventory assets only show: name, category, brand, model, color.
  // Purchased assets additionally show: serial, status, assigned to,
  //   supplier, purchase date, purchase cost, sale price, tech specs.
  protected get isPurchasedAsset(): boolean {
    return !!(
      this.asset?.purchaseId ||
      this.asset?.purchaseNumber ||
      (this.asset?.units && this.asset.units.length > 0)
    );
  }

  protected readonly form: FormGroup = this.fb.group({
    // ── shared (inventory + purchased) ──────────────────────────────────
    name: ['', Validators.required],
    category: ['', Validators.required],
    brand: [''],
    model: [''],
    color: [''],
    // ── purchased only ──────────────────────────────────────────────────
    serialNumber: [{ value: '', disabled: true }],
    status: ['AVAILABLE'],
    assignedTo: [''],
    supplier: [''],
    purchaseDate: [''],
    purchaseCost: [null as number | null],
    techSpecs: this.fb.array([]),
  });

  private readonly authService = inject(AuthApisService);

  public ngOnInit(): void {
    const role = (this.authService.currentUser()?.role || localStorage.getItem('role') || '').toUpperCase();
    if (role === 'EMPLOYEE') {
      this.toastService.presentToast('Access Denied: You do not have permission to access this page.', 2500, 'warning');
      this.router.navigate(['/assets']);
      return;
    }

    const encodedId = this.route.snapshot.paramMap.get('id');
    if (!encodedId) { this.router.navigate(['/assets']); return; }

    const rawId = decodeURIComponent(encodedId);
    const id = this.assetService.extractBaseAssetId(rawId);
    this.loadCategories();

    // Try API first, fall back to local store for seed/offline assets
    this.assetApisService.getAssetById(id).subscribe({
      next: (found) => {
        this.asset = found;
        this.populateForm(found);
      },
      error: () => {
        const local = this.assetService.getAssetById(id);
        if (local) {
          this.asset = local;
          this.populateForm(local);
        } else {
          this.toastService.presentToast('Asset not found.', 2000, 'error');
          this.router.navigate(['/assets']);
        }
      }
    });
  }

  private resolveCategoryName(cat: any): string {
    if (!cat) return '';
    if (typeof cat === 'object' && cat.name) return cat.name;
    const catStr = String(cat).trim();
    if (!catStr) return '';

    // 1. Check in categories loaded from API
    const foundInSignal = this.categories().find(
      c => c.id === catStr || c.name.toLowerCase() === catStr.toLowerCase()
    );
    if (foundInSignal) return foundInSignal.name;

    // 2. Check in CategoryService store
    const foundInStore = this.categoryService.categories().find(
      c => c.id === catStr || c.name.toLowerCase() === catStr.toLowerCase()
    );
    if (foundInStore) return foundInStore.name;

    // 3. Fallback map for common ID aliases
    const aliasMap: Record<string, string> = {
      'cat-1': 'Laptops',
      'cat-2': 'Desktop Computers',
      'cat-3': 'Monitors',
      'cat-4': 'Mobile Devices',
      'cat-5': 'Printers & Scanners',
      'cat-6': 'Networking Equipment',
      'laptop': 'Laptops',
      'desktop': 'Desktop Computers',
      'monitor': 'Monitors',
      'mobile': 'Mobile Devices',
    };
    return aliasMap[catStr.toLowerCase()] || catStr;
  }

  private populateForm(found: Asset): void {
    const categoryVal = this.resolveCategoryName(found.category);
    const firstUnit = found.units && found.units.length > 0 ? found.units[0] : null;
    const activeCurr = this.currencyService.activeCurrency();
    const rawBaseCost = found.purchaseCost != null ? found.purchaseCost : null;
    const displayCost = rawBaseCost != null ? this.currencyService.convertFromBase(rawBaseCost, activeCurr) : null;

    this.form.patchValue({
      name: found.name ?? '',
      category: categoryVal,
      brand: found.brand ?? '',
      model: found.model ?? '',
      color: found.color ?? '',
      serialNumber: found.serialNumber || firstUnit?.serialNumber || '',
      status: found.status || firstUnit?.status || 'AVAILABLE',
      assignedTo: found.assignedTo || firstUnit?.assignedTo || '',
      supplier: found.supplier ?? '',
      purchaseDate: found.purchaseDate ?? '',
      purchaseCost: displayCost != null ? Math.round(displayCost * 100) / 100 : null,
    });

    this.techSpecsArray.clear();
    const specs: TechSpecItem[] = Array.isArray(found.techSpecs) ? found.techSpecs : [];
    specs.forEach(s => this.addSpec(s.key, s.value));
  }

  protected onCurrencyChange(event: CurrencyChangeEvent): void {
    const costControl = this.form.get('purchaseCost');
    const currentCost = Number(costControl?.value);
    if (currentCost && !isNaN(currentCost)) {
      const newCost = this.currencyService.convertBetween(currentCost, event.previous, event.current);
      costControl?.setValue(newCost, { emitEvent: false });
    }
  }

  private loadCategories(): void {
    this.assetApisService.getCategories().subscribe({
      next: cats => {
        this.categories.set(cats);
        if (this.asset) {
          const resolved = this.resolveCategoryName(this.asset.category);
          if (resolved) {
            this.form.patchValue({ category: resolved });
          }
        }
      },
      error: (err: unknown) => console.error('Failed to load categories.', err),
    });
  }

  protected get techSpecsArray(): FormArray {
    return this.form.get('techSpecs') as FormArray;
  }

  protected addSpec(key = '', value = ''): void {
    this.techSpecsArray.push(this.fb.group({ key: [key, Validators.required], value: [value] }));
  }

  protected removeSpec(index: number): void {
    this.techSpecsArray.removeAt(index);
  }

  protected onSubmit(): void {
    if (!this.asset || this.form.invalid) return;

    const v = this.form.value;

    const matchedCat = this.categories().find(
      c => c.name === v.category || c.id === v.category
    );

    // Build payload — purchased assets include all fields,
    // inventory assets only include name, category, brand, model, color.
    const payload: Partial<Asset> = {
      name: (v.name as string).trim(),
      category: matchedCat?.name || v.category,
      brand: (v.brand as string)?.trim() || undefined,
      model: (v.model as string)?.trim() || undefined,
      color: (v.color as string)?.trim() || undefined,
    };

    if (this.isPurchasedAsset) {
      const techSpecs: TechSpecItem[] = (v.techSpecs as TechSpecItem[])
        .filter(s => s.key?.trim())
        .map(s => ({ key: s.key.trim(), value: (s.value ?? '').trim() }));

      const activeCurr = this.currencyService.activeCurrency();
      const rawCost = v.purchaseCost != null && v.purchaseCost !== '' && !isNaN(Number(v.purchaseCost))
        ? Number(v.purchaseCost)
        : null;
      const baseCost = rawCost !== null
        ? Math.round(this.currencyService.convertToBase(rawCost, activeCurr) * 100) / 100
        : undefined;

      Object.assign(payload, {
        status: v.status as AssetStatus,
        assignedTo: (v.assignedTo as string)?.trim() || undefined,
        supplier: (v.supplier as string)?.trim() || undefined,
        purchaseDate: v.purchaseDate || undefined,
        purchaseCost: baseCost,
        techSpecs: techSpecs.length ? techSpecs : undefined,
      });
    }

    // Optimistic update — navigate immediately, sync with API in background
    this.assetService.updateAsset(this.asset.id, payload).subscribe({
      error: (err: unknown) => console.warn('API sync failed for asset update.', err),
    });

    this.toastService.presentToast(`"${this.asset.name}" updated successfully!`, 2000, 'success');
    this.router.navigate(['/assets']);
  }

  protected onCancel(): void {
    this.router.navigate(['/assets']);
  }
}