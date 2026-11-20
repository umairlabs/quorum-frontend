import { computed, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { AssetCategory, CategoryStatus } from '../interfaces/asset-category.interface';

const DEFAULT_CATEGORIES: AssetCategory[] = [];

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private readonly STORAGE_KEY = 'astra_categories';

  private saveToLocalStorage(data: AssetCategory[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save categories to localStorage', e);
    }
  }

  private loadFromLocalStorage(): AssetCategory[] | null {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as AssetCategory[];
      }
    } catch (e) {
      console.warn('Failed to read categories from localStorage', e);
    }
    return null;
  }

  // Central State Signal — initialized from localStorage or default seed categories
  public readonly categories: WritableSignal<AssetCategory[]> = signal<AssetCategory[]>(
    this.loadFromLocalStorage() || DEFAULT_CATEGORIES
  );

  // Filter Signals
  public readonly searchQuery: WritableSignal<string> = signal<string>('');
  public readonly statusFilter: WritableSignal<string> = signal<string>('ALL');

  // Computed Signals for Dashboard Summary Cards
  public readonly totalCategories: Signal<number> = computed(() => this.categories().length);

  // Active Categories list for dropdowns (e.g. Add Asset) - Deduplicated by normalized category name
  public readonly activeCategoriesList: Signal<AssetCategory[]> = computed(() => {
    const seen = new Set<string>();
    const result: AssetCategory[] = [];

    for (const c of this.categories()) {
      if ((c.status || 'ACTIVE') !== 'ACTIVE') continue;
      const key = this.normalizeCategoryName(c.name);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(c);
      }
    }
    return result;
  });

  // Computed Filtered List for Table display
  public readonly filteredCategories: Signal<AssetCategory[]> = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter().toUpperCase();

    return this.categories().filter((cat) => {
      const matchesQuery =
        !query ||
        cat.name.toLowerCase().includes(query) ||
        (cat.description && cat.description.toLowerCase().includes(query));

      const catStatus = cat.status || 'ACTIVE';
      const matchesStatus = status === 'ALL' || catStatus === status;

      return matchesQuery && matchesStatus;
    });
  });

  // Filter Actions
  public setSearchQuery(query: string): void {
    this.searchQuery.set(query);
  }

  public setStatusFilter(status: string): void {
    this.statusFilter.set(status);
  }

  // Helper for normalizing category names (e.g. "Laptops" and "Laptop" -> "laptop")
  private normalizeCategoryName(name: string): string {
    const trimmed = name.toLowerCase().trim();
    if (trimmed.endsWith('s') && trimmed.length > 3) {
      return trimmed.slice(0, -1);
    }
    return trimmed;
  }

  public setCategories(categories: AssetCategory[]): void {
    const list = categories || [];
    this.categories.set(list);
    this.saveToLocalStorage(list);
  }

  // CRUD State Actions with Deduplication & localStorage persistence
  public addCategory(payload: { name: string; description?: string; status?: CategoryStatus; id?: string }): AssetCategory {
    const nameTrimmed = payload.name.trim();
    const normalizedKey = this.normalizeCategoryName(nameTrimmed);

    const existing = this.categories().find(
      (c) => this.normalizeCategoryName(c.name) === normalizedKey
    );

    if (existing) {
      this.updateCategory(existing.id, {
        description: payload.description || existing.description,
        status: payload.status || existing.status || 'ACTIVE'
      });
      return existing;
    }

    const today = new Date().toISOString().split('T')[0];
    const newCat: AssetCategory = {
      id: payload.id || `cat-${Date.now()}`,
      name: nameTrimmed,
      description: payload.description ? payload.description.trim() : '',
      status: payload.status || 'ACTIVE',
      assetCount: 0,
      createdAt: today
    };

    this.categories.update((prev) => [newCat, ...prev]);
    this.saveToLocalStorage(this.categories());
    return newCat;
  }

  public updateCategory(id: string, payload: Partial<AssetCategory>): void {
    this.categories.update((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...payload } : c))
    );
    this.saveToLocalStorage(this.categories());
  }

  public deleteCategory(id: string): void {
    this.categories.update((prev) => prev.filter((c) => c.id !== id));
    this.saveToLocalStorage(this.categories());
  }
}