import { Component, DestroyRef, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { CategoryService } from '../../../core/services/category.service';
import { LayoutService } from '../../../core/services/layout.service';
import { AssetApisService } from '../../assets/services/asset-apis.service';
import { ToastService } from '../../../core/services/toast.service';
import { AssetCategory } from '../../../core/interfaces/asset-category.interface';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { SearchInputComponent } from '../../../core/components/search-input/search-input.component';
import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { ConfirmDialogComponent } from '../../../core/components/confirm-dialog/confirm-dialog.component';
import { CategoryModalComponent, CategoryFormValue } from '../../../core/components/category-modal/category-modal.component';
import { CategoryDetailModalComponent } from '../../../core/components/category-detail-modal/category-detail-modal.component';
import { getCategoryIcon } from '../../../core/utils/asset-icon.util';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [
    CommonModule,
    PageHeaderComponent,
    SearchInputComponent,
    EmptyStateComponent,
    ConfirmDialogComponent,
    CategoryModalComponent,
    CategoryDetailModalComponent,
  ],
  templateUrl: './category-list.component.html'
})
export class CategoryListComponent implements OnInit {
  protected readonly categoryService = inject(CategoryService);
  private readonly assetApisService = inject(AssetApisService);
  private readonly toastService = inject(ToastService);
  private readonly layoutService = inject(LayoutService);
  private readonly destroyRef = inject(DestroyRef);

  // Modal State Signals
  protected readonly isAddEditModalOpen: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly isViewModalOpen: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly isDeleteModalOpen: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly loading: WritableSignal<boolean> = signal<boolean>(false);

  protected readonly selectedCategory: WritableSignal<AssetCategory | null> = signal<AssetCategory | null>(null);
  protected readonly modalTitle: WritableSignal<string> = signal<string>('Add Category');

  public ngOnInit(): void {
    this.loadCategories();

    this.layoutService.navItemClicked$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.closeAllModals();
      });
  }

  private closeAllModals(): void {
    this.isAddEditModalOpen.set(false);
    this.isViewModalOpen.set(false);
    this.isDeleteModalOpen.set(false);
    this.selectedCategory.set(null);
  }

  private loadCategories(): void {
    this.loading.set(true);
    this.assetApisService.getCategories().subscribe({
      next: (categories) => {
        if (categories && categories.length > 0) {
          this.categoryService.setCategories(categories);
        }
        this.loading.set(false);
      },
      error: (err: unknown) => {
        console.warn('Failed to load categories from backend. Using local categories.', err);
        this.loading.set(false);
      }
    });
  }

  // Search & Filter Handlers
  protected readonly statusOptions = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  protected onStatusSelect(val: string | number): void {
    this.categoryService.setStatusFilter(String(val || 'ALL'));
  }

  protected onSearchChange(query: string): void {
    this.categoryService.setSearchQuery(query);
  }

  protected onStatusFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.categoryService.setStatusFilter(val);
  }

  // Action Triggers
  protected onOpenAddModal(): void {
    this.selectedCategory.set(null);
    this.modalTitle.set('Add Category');
    this.isAddEditModalOpen.set(true);
  }

  protected onOpenEditModal(category: AssetCategory): void {
    this.selectedCategory.set(category);
    this.modalTitle.set('Edit Category');
    this.isAddEditModalOpen.set(true);
  }

  protected onOpenViewModal(category: AssetCategory): void {
    this.selectedCategory.set(category);
    this.isViewModalOpen.set(true);
  }

  protected onOpenDeleteModal(category: AssetCategory): void {
    if (category.assetCount && category.assetCount > 0) {
      this.toastService.presentToast(
        `Cannot delete category "${category.name}" because it has ${category.assetCount} linked asset(s).`,
        3000,
        'error'
      );
      return;
    }
    this.selectedCategory.set(category);
    this.isDeleteModalOpen.set(true);
  }

  protected onConfirmDelete(): void {
    const cat = this.selectedCategory();
    if (!cat) return;

    if (cat.assetCount && cat.assetCount > 0) {
      this.toastService.presentToast(
        `Cannot delete category "${cat.name}" because it has ${cat.assetCount} linked asset(s).`,
        3000,
        'error'
      );
      this.isDeleteModalOpen.set(false);
      this.selectedCategory.set(null);
      return;
    }

    this.assetApisService.deleteCategory(cat.id).subscribe({
      next: () => {
        this.categoryService.deleteCategory(cat.id);
        this.toastService.presentToast(`Category "${cat.name}" deleted successfully.`, 2000, 'success');
        this.isDeleteModalOpen.set(false);
        this.selectedCategory.set(null);
      },
      error: (err: any) => {
        const errorMsg = err?.error?.detail || `Failed to delete category "${cat.name}".`;
        this.toastService.presentToast(errorMsg, 3000, 'error');
        this.isDeleteModalOpen.set(false);
        this.selectedCategory.set(null);
      }
    });
  }

  protected onSaveCategory(formVal: CategoryFormValue): void {
    const currentCat = this.selectedCategory();

    if (currentCat) {
      this.categoryService.updateCategory(currentCat.id, {
        name: formVal.name,
        description: formVal.description,
        status: formVal.status
      });
      this.toastService.presentToast(`Category "${formVal.name}" updated successfully.`, 2000, 'success');
      this.isAddEditModalOpen.set(false);
      this.selectedCategory.set(null);

      this.assetApisService.updateCategory(currentCat.id, {
        name: formVal.name,
        description: formVal.description,
        status: formVal.status
      }).subscribe({ error: (err) => console.warn('Backend updateCategory failed.', err) });
    } else {
      const created = this.categoryService.addCategory({
        name: formVal.name,
        description: formVal.description,
        status: formVal.status || 'ACTIVE'
      });
      this.toastService.presentToast(`Category "${created.name}" created successfully.`, 2000, 'success');
      this.isAddEditModalOpen.set(false);
      this.selectedCategory.set(null);

      this.assetApisService.createCategory({
        name: formVal.name,
        description: formVal.description
      }).subscribe({ error: (err) => console.warn('Backend createCategory failed.', err) });
    }
  }

  protected getCategoryIconName(category: AssetCategory): string {
    return getCategoryIcon(category);
  }
}