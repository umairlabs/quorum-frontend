import { Component, computed, inject, OnInit, signal, Signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AssetService } from '../services/asset.service';
import { AssetApisService } from '../services/asset-apis.service';
import { AssetCategory } from '../../../core/interfaces/asset-category.interface';
import { AssetCreate } from '../../../core/interfaces/asset.interface';
import { CategoryService } from '../../../core/services/category.service';
import { ToastService } from '../../../core/services/toast.service';
import { NotificationService } from '../../notifications/services/notification.service';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { FormSectionComponent } from '../../../core/components/form-section/form-section.component';
import { CategoryModalComponent, CategoryFormValue } from '../../../core/components/category-modal/category-modal.component';
import { AuthApisService } from '../../../core/services/api/auth-apis.service';
import { SelectComponent, SelectOption } from '../../../core/components/select/select.component';

@Component({
  selector: 'app-asset-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    FormSectionComponent,
    CategoryModalComponent,
    SelectComponent,
  ],
  templateUrl: './asset-create.component.html',
})
export class AssetCreateComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly assetService = inject(AssetService);
  private readonly assetApisService = inject(AssetApisService);
  protected readonly categoryService = inject(CategoryService);
  private readonly toastService = inject(ToastService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly categoriesLoading: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly isAddCategoryModalOpen: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly savingCategory: WritableSignal<boolean> = signal<boolean>(false);
  protected formSubmitted = false;

  // ── Brand autocomplete ────────────────────────────────────────────────────
  protected readonly showBrandDropdown: WritableSignal<boolean> = signal(false);
  protected readonly brandSearchQuery: WritableSignal<string> = signal('');

  protected readonly filteredBrands: Signal<string[]> = computed(() => {
    const q = this.brandSearchQuery().toLowerCase().trim();
    const brands = [
      ...new Set(
        this.assetService.assets()
          .map(a => (a.brand || '').trim())
          .filter(b => b.length > 0)
      )
    ].sort();
    if (!q) return brands;
    return brands.filter(b => b.toLowerCase().includes(q));
  });

  protected readonly categoryOptions: Signal<SelectOption[]> = computed<SelectOption[]>(() => {
    return this.categoryService.activeCategoriesList().map(cat => ({
      label: cat.name,
      value: cat.name,
    }));
  });

  protected onCategorySelect(value: string | number): void {
    this.form.patchValue({ category: String(value) });
    this.form.get('category')?.markAsTouched();
    this.form.get('category')?.markAsDirty();
  }

  protected readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.pattern(/^(?!\s*$).+/)]],
    category: ['', [Validators.required]],
    brand: ['', [Validators.required, Validators.pattern(/^(?!\s*$).+/)]],
    model: ['', [Validators.required, Validators.pattern(/^(?!\s*$).+/)]],
    color: [''],
  });

  private readonly authService = inject(AuthApisService);

  public ngOnInit(): void {
    const userRole = this.authService.currentUser()?.role || localStorage.getItem('role') || '';
    const role = String(userRole).toUpperCase();
    if (role === 'EMPLOYEE') {
      this.toastService.presentToast('Access Denied: You do not have permission to access this page.', 2500, 'warning');
      this.router.navigate(['/assets']);
      return;
    }
    this.loadCategoriesFromBackend();
  }

  // Pre-fill form fields from query params (e.g. when navigating from
  // inventory-asset-detail "Add Unit" or from inventory list "Add to Stock")
  private prefillFromQueryParams(): void {
    const p = this.route.snapshot.queryParams;
    if (!p['name'] && !p['brand'] && !p['model'] && !p['category']) return;

    const categoryName = p['category'] as string | undefined;
    const matchedCat = categoryName
      ? this.categoryService.activeCategoriesList().find(
        c => c.name.toLowerCase() === categoryName.toLowerCase()
      )
      : undefined;

    this.form.patchValue({
      name: p['name'] || '',
      brand: p['brand'] || '',
      model: p['model'] || '',
      category: matchedCat?.name || categoryName || '',
    });
  }

  private loadCategoriesFromBackend(): void {
    this.categoriesLoading.set(true);
    this.assetApisService.getCategories().subscribe({
      next: (apiCategories) => {
        const mapped: AssetCategory[] = (apiCategories || []).map(cat => ({
          id: cat.id,
          name: cat.name,
          description: cat.description,
          status: 'ACTIVE' as const,
          assetCount: 0,
          createdAt: '',
        }));
        this.categoryService.setCategories(mapped);
        this.categoriesLoading.set(false);
        // Pre-fill after categories are loaded so dropdown has options before value is set
        this.prefillFromQueryParams();
      },
      error: (err: unknown) => {
        console.warn('Failed to load categories from backend.', err);
        this.categoriesLoading.set(false);
        this.prefillFromQueryParams();
      },
    });
  }

  // ── Brand dropdown handlers ───────────────────────────────────────────────
  protected onFocusBrand(): void {
    this.assetService.loadAssetsFromApi();
    this.showBrandDropdown.set(true);
  }

  protected onBlurBrand(): void {
    setTimeout(() => this.showBrandDropdown.set(false), 200);
  }

  protected onBrandInput(value: string): void {
    this.brandSearchQuery.set(value);
    this.form.patchValue({ brand: value });
    this.showBrandDropdown.set(true);
  }

  protected onSelectBrand(brand: string): void {
    this.form.patchValue({ brand });
    this.brandSearchQuery.set(brand);
    this.showBrandDropdown.set(false);
  }

  protected onOpenAddCategoryModal(): void {
    this.isAddCategoryModalOpen.set(true);
  }

  protected onSaveNewCategory(val: CategoryFormValue): void {
    this.savingCategory.set(true);

    const newCat = this.categoryService.addCategory({
      name: val.name,
      description: val.description,
      status: 'ACTIVE',
    });

    this.form.patchValue({ category: newCat.name });
    this.toastService.presentToast(`Category "${newCat.name}" added successfully!`, 2000, 'success');
    this.isAddCategoryModalOpen.set(false);
    this.savingCategory.set(false);

    this.assetApisService.createCategory({ name: val.name, description: val.description }).subscribe({
      next: (created) => {
        if (created?.id) {
          this.categoryService.updateCategory(newCat.id, { id: created.id });
          // Keep the form value as category name (options bind to cat.name, not cat.id)
        }
      },
      error: (err: unknown) => {
        console.warn('Backend createCategory failed — category saved locally.', err);
      },
    });
  }

  protected getFieldError(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (control?.errors && (control.touched || control.dirty || this.formSubmitted)) {
      if (control.errors['required'] || control.errors['pattern']) {
        if (fieldName === 'name') return 'Asset name is required';
        if (fieldName === 'category') return 'Category is required';
        if (fieldName === 'brand') return 'Brand is required';
        if (fieldName === 'model') return 'Model is required';
        return 'This field is required';
      }
    }
    return '';
  }

  protected onSubmit(): void {
    this.formSubmitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;

    const matchedCat = this.categoryService.activeCategoriesList()
      .find(c => c.name === v.category || c.id === v.category);

    const assetData: AssetCreate = {
      name: (v.name as string).trim(),
      categoryId: matchedCat?.id || (v.category as string),
      category: matchedCat?.name || (v.category as string),
      brand: (v.brand as string)?.trim() || undefined,
      model: (v.model as string)?.trim() || undefined,
      color: (v.color as string)?.trim() || undefined,
      status: 'AVAILABLE',
      // This form only registers the asset "type"/catalog entry — purchase
      // details are captured later in the actual Purchase flow. The backend
      // still marks these fields as required on POST /assets/, so we send
      // harmless placeholder values here rather than asking the user for
      // purchase info at catalog-creation time.
      purchaseDate: new Date().toISOString().split('T')[0],
      purchaseCost: 0,
    };

    // Optimistic insert — asset is added locally immediately.
    // Navigate right away so the user isn't blocked waiting for the API.
    this.assetService.createAsset(assetData).subscribe({
      error: (err: unknown) => {
        console.warn('API sync failed for new asset — local copy is retained.', err);
        this.toastService.presentToast(
          `"${assetData.name}" saved locally, but syncing with the server failed. It may not appear after refresh.`,
          3500,
          'error'
        );
      },
    });

    this.toastService.presentToast(`Asset "${assetData.name}" created successfully!`, 2500, 'success');
    this.router.navigate(['/assets']);
  }

  protected onCancel(): void {
    this.router.navigate(['/assets']);
  }
}