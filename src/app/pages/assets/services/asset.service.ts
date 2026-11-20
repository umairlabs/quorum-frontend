import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import {
  Asset,
  AssetCreate,
  AssetStatus,
  AssetUnit,
  AssetUpdate,
  InventoryGroup,
  PurchaseGroup,
} from '../../../core/interfaces/asset.interface';
import { AssetCategory } from '../../../core/interfaces/asset-category.interface';
import { AssetApisService } from './asset-apis.service';
import { getAssetIconFromObject } from '../../../core/utils/asset-icon.util';

// ─── Service ──────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class AssetService {
  private readonly assetApisService = inject(AssetApisService);

  // ─── State ────────────────────────────────────────────────────────────────
  public readonly assets: WritableSignal<Asset[]> = signal<Asset[]>(this.loadFromLocalStorage());
  public readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  public readonly errorMessage: WritableSignal<string | null> = signal<string | null>(null);

  // ─── Filters ──────────────────────────────────────────────────────────────
  public readonly searchQuery: WritableSignal<string> = signal<string>('');
  public readonly selectedStatus: WritableSignal<string> = signal<string>('');
  public readonly selectedCategory: WritableSignal<string> = signal<string>('');
  public readonly selectedLocation: WritableSignal<string> = signal<string>('');
  public readonly selectedDepartment: WritableSignal<string> = signal<string>('');
  public readonly selectedEmployee: WritableSignal<string> = signal<string>('');
  public readonly selectedWarrantyStatus: WritableSignal<string> = signal<string>('');
  public readonly selectedView: WritableSignal<'inventory' | 'purchased'> = signal<'inventory' | 'purchased'>('purchased');
  public readonly currentPage: WritableSignal<number> = signal<number>(1);
  public readonly pageSize: WritableSignal<number> = signal<number>(10);

  // ─── LocalStorage ─────────────────────────────────────────────────────────
  private loadFromLocalStorage(): Asset[] {
    try {
      const stored = localStorage.getItem('astra_assets');
      if (stored) {
        const parsed = JSON.parse(stored) as Asset[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Run through normalizeAsset to clean dirty names from old localStorage
          return parsed.map(a => ({
            ...a,
            name: (a.name ?? '')
              .replace(/\s*#\d+(\s*\(PO-[^)]*\))?\s*$/i, '')
              .replace(/\s*\(PO-[^)]*\)\s*$/i, '')
              .trim() || (a.name ?? ''),
          }));
        }
      }
    } catch { /* ignore */ }
    return [];
  }

  public saveToLocalStorage(assets: Asset[]): void {
    try {
      localStorage.setItem('astra_assets', JSON.stringify(assets));
    } catch { /* ignore */ }
  }

  // ─── normalizeAsset ───────────────────────────────────────────────────────
  public normalizeAsset(raw: any): Asset {
    if (!raw) return raw;
    const purchaseCost =
      typeof raw.purchaseCost === 'number' ? raw.purchaseCost :
        typeof raw.purchase_cost === 'number' ? raw.purchase_cost :
          parseFloat(raw.purchaseCost ?? raw.purchase_cost ?? '0') || 0;

    // Clean backend-appended suffixes from names (e.g. "Iphone #3 (PO-LOCAL-...)")
    const rawName: string = raw.name ?? '';
    const cleanedName = rawName
      .replace(/\s*#\d+(\s*\(PO-[^)]*\))?\s*$/i, '')
      .replace(/\s*\(PO-[^)]*\)\s*$/i, '')
      .trim() || rawName;

    const rawId = String(raw.id ?? '');
    const displayId = raw.displayId ?? raw.display_id ?? undefined;
    const assetId = displayId ?? raw.assetId ?? raw.asset_id ?? raw.formatted_asset_id ?? (rawId ? 'AST-' + rawId.replace(/-/g, '').slice(0, 6).toUpperCase() : '');

    return {
      id: rawId,
      displayId,
      assetId,
      name: cleanedName,
      serialNumber: raw.serialNumber ?? raw.serial_number ?? '',
      category: raw.category ?? raw.category_name ?? '',
      brand: raw.brand ?? undefined,
      model: raw.model ?? undefined,
      color: raw.color ?? undefined,
      status: raw.status ?? 'AVAILABLE',
      assignedTo: raw.assignedTo ?? raw.assigned_to ?? raw.currentEmployee ?? raw.current_employee ?? undefined,
      assignedUser: (() => {
        const u = raw.assignedUser ?? raw.assigned_user;
        if (!u) return undefined;
        return {
          name: u.name ?? u.fullName ?? u.full_name ?? u.username ?? '',
          fullName: u.fullName ?? u.full_name ?? u.name ?? '',
          avatarInitials: u.avatarInitials ?? u.avatar_initials ?? (u.name ?? '').slice(0, 2).toUpperCase(),
          employeeId: u.employeeId ?? u.employee_id ?? u.emp_id ?? undefined,
        };
      })(),
      assignmentDate: raw.assignmentDate ?? raw.assignment_date ?? undefined,
      purchaseDate: raw.purchaseDate ?? raw.purchase_date ?? '',
      purchaseCost,
      purchasePrice: typeof raw.purchasePrice === 'number' ? raw.purchasePrice : purchaseCost,
      totalAmount: typeof raw.totalAmount === 'number' ? raw.totalAmount :
        typeof raw.total_amount === 'number' ? raw.total_amount : undefined,
      paidAmount: typeof raw.paidAmount === 'number' ? raw.paidAmount :
        typeof raw.paid_amount === 'number' ? raw.paid_amount : undefined,
      remainingAmount: typeof raw.remainingAmount === 'number' ? raw.remainingAmount :
        typeof raw.remaining_amount === 'number' ? raw.remaining_amount : undefined,
      paymentStatus: raw.paymentStatus ?? raw.payment_status ?? undefined,
      value: raw.value ?? raw.current_value ?? undefined,
      supplier: raw.supplier ?? undefined,
      purchaseNumber: raw.purchaseNumber ?? raw.purchase_number ?? undefined,
      purchaseId: raw.purchaseId ?? raw.purchase_id ?? undefined,
      invoiceNumber: raw.invoiceNumber ?? raw.invoice_number ?? raw.purchaseNumber ?? raw.purchase_number ?? undefined,
      warrantyStartDate: raw.warrantyStartDate ?? raw.warranty_start_date ?? undefined,
      warrantyEndDate: raw.warrantyEndDate ?? raw.warranty_end_date ?? undefined,
      warrantyStatus: raw.warrantyStatus ?? raw.warranty_status ?? 'No Warranty',
      department: raw.department ?? undefined,
      location: raw.location ?? undefined,
      currentEmployee: raw.currentEmployee ?? raw.current_employee ?? raw.assignedTo ?? raw.assigned_to ?? undefined,
      techSpecs: Array.isArray(raw.techSpecs) ? raw.techSpecs :
        Array.isArray(raw.tech_specs) ? raw.tech_specs : undefined,
      salvageValue: raw.salvageValue !== undefined ? Number(raw.salvageValue) :
        raw.salvage_value !== undefined ? Number(raw.salvage_value) :
        raw.financials?.salvageValue !== undefined ? Number(raw.financials.salvageValue) :
        raw.financials?.salvage_value !== undefined ? Number(raw.financials.salvage_value) : undefined,
      usefulLifeYears: raw.usefulLifeYears !== undefined ? Number(raw.usefulLifeYears) :
        raw.useful_life_years !== undefined ? Number(raw.useful_life_years) :
        raw.financials?.usefulLifeYears !== undefined ? Number(raw.financials.usefulLifeYears) :
        raw.financials?.useful_life_years !== undefined ? Number(raw.financials.useful_life_years) : undefined,
      depreciationMethod: raw.depreciationMethod ?? raw.depreciation_method ??
        raw.financials?.depreciationMethod ?? raw.financials?.depreciation_method ?? undefined,
      financials: raw.financials ?? raw.financial_data ?? undefined,
      assignmentHistory: raw.assignmentHistory ?? raw.assignment_history ?? undefined,
      units: Array.isArray(raw.units)
        ? raw.units.map((u: any) => this.normalizeUnit(u))
        : undefined,
      totalQuantity: raw.totalQuantity ?? raw.total_quantity ?? undefined,
      availableQuantity: raw.availableQuantity ?? raw.available_quantity ?? undefined,
      assignedQuantity: raw.assignedQuantity ?? raw.assigned_quantity ?? undefined,
      maintenanceQuantity: raw.maintenanceQuantity ?? raw.maintenance_quantity ?? undefined,
      createdAt: raw.createdAt ?? raw.created_at ?? '',
      updatedAt: raw.updatedAt ?? raw.updated_at ?? '',
      // Auto-detected icon — prefers backend iconKey, falls back to name/category matching
      iconKey: raw.iconKey ?? raw.icon_key ?? getAssetIconFromObject({
        name: raw.name,
        category: raw.category ?? raw.category_name,
        brand: raw.brand,
        model: raw.model,
      }),
    };
  }

  public normalizeUnit(raw: any): AssetUnit {
    if (!raw) return raw;
    // Purchase info is now flat fields, not nested
    const purchaseNumber = raw.purchaseNumber ?? raw.purchase_number ?? undefined;
    const purchaseId = raw.purchaseId ?? raw.purchase_id ?? undefined;
    const displayId = raw.displayId ?? raw.display_id ?? undefined;

    return {
      id: String(raw.id ?? ''),
      displayId,
      assetId: String(raw.assetId ?? raw.asset_id ?? raw.asset ?? ''),
      unitNumber: raw.unitNumber ?? raw.unit_number ?? 0,
      serialNumber: raw.serialNumber ?? raw.serial_number ?? '',
      status: raw.status ?? 'AVAILABLE',
      location: raw.location ?? undefined,
      assignedTo: raw.assignedTo ?? raw.assigned_to ?? undefined,
      assignedUser: (() => {
        const u = raw.assignedUser ?? raw.assigned_user;
        if (!u) return undefined;
        return {
          name: u.name ?? u.fullName ?? u.full_name ?? u.username ?? '',
          fullName: u.fullName ?? u.full_name ?? u.name ?? '',
          avatarInitials: u.avatarInitials ?? u.avatar_initials ?? (u.name ?? '').slice(0, 2).toUpperCase(),
          employeeId: u.employeeId ?? u.employee_id ?? u.emp_id ?? undefined,
        };
      })(),
      purchaseNumber,
      purchaseId,
      createdAt: raw.createdAt ?? raw.created_at ?? '',
      updatedAt: raw.updatedAt ?? raw.updated_at ?? '',
    };
  }

  // ─── Load ─────────────────────────────────────────────────────────────────
  public loadAssetsFromApi(): void {
    this.loading.set(true);
    this.assetApisService.getAssets({ page_size: 200 }).subscribe({
      next: (res: any) => {
        const raw: any[] = Array.isArray(res) ? res : (res?.results ?? []);
        const normalized = raw.map(a => this.normalizeAsset(a));
        // Expand units into individual asset records for purchased assets view
        const expanded: Asset[] = [];
        normalized.forEach(asset => {
          if (asset.units && asset.units.length > 0) {
            const availCount = asset.units.filter(u => u.status === 'AVAILABLE').length;
            expanded.push({
              ...asset,
              availableQuantity: availCount,
              purchaseNumber: undefined,
              purchaseId: undefined,
              units: asset.units,
            });
            // Create individual asset records for each unit for Purchased view
            asset.units.forEach(unit => {
              const assignedDisplayName = unit.assignedUser?.name || unit.assignedUser?.fullName || (typeof unit.assignedTo === 'string' && !unit.assignedTo.includes('-') ? unit.assignedTo : undefined);
              expanded.push({
                ...asset,
                id: `${asset.id}-unit-${unit.id}`, // Composite ID for uniqueness
                unitId: unit.id, // Store unit ID for backend operations
                displayId: unit.displayId || asset.displayId,
                serialNumber: unit.serialNumber,
                status: unit.status,
                assignedTo: assignedDisplayName,
                assignedUser: unit.assignedUser,
                purchaseNumber: unit.purchaseNumber, // From unit's purchase
                purchaseId: unit.purchaseId,
                units: undefined, // Remove nested units
              });
            });
          } else {
            // Inventory asset (no units) - keep as-is
            expanded.push({
              ...asset,
              availableQuantity: asset.status === 'AVAILABLE' ? 1 : 0
            });
          }
        });
        this.assets.set(expanded);
        this.saveToLocalStorage(expanded);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  // ─── Lookup ───────────────────────────────────────────────────────────────
  public extractBaseAssetId(id: string): string {
    if (!id) return id;
    const idx = id.indexOf('-unit-');
    return idx !== -1 ? id.substring(0, idx) : id;
  }

  public getAssetById(id: string): Asset | undefined {
    if (!id) return undefined;
    const exact = this.assets().find(a => a.id === id);
    if (exact) return exact;
    const baseId = this.extractBaseAssetId(id);
    return this.assets().find(a => a.id === baseId || this.extractBaseAssetId(a.id) === baseId);
  }

  public isSerialNumberUnique(serialNumber: string, excludeId?: string): boolean {
    if (!serialNumber?.trim()) return true;
    const target = serialNumber.trim().toLowerCase();
    return !this.assets().some(a =>
      a.serialNumber?.toLowerCase() === target && a.id !== excludeId
    );
  }

  // Strip backend-appended unit suffixes from asset names.
  // The backend appends patterns like " #100 (PO-56195)" or " #1" to names
  // when creating units. We strip these to get the base product name for grouping.
  private cleanAssetName(name: string): string {
    return name
      .replace(/\s*#\d+(\s*\(PO-[^)]*\))?\s*$/i, '')  // remove " #100 (PO-56195)"
      .replace(/\s*\(PO-[^)]*\)\s*$/i, '')             // remove trailing " (PO-xxxxx)"
      .trim();
  }

  public isAssetIdUnique(serialNumber: string, excludeId?: string): boolean {
    if (!serialNumber?.trim()) return true;
    const target = serialNumber.trim().toLowerCase();
    return !this.assets().some(a =>
      a.serialNumber?.toLowerCase() === target && a.id !== excludeId
    );
  }

  // ─── Computed: filtered assets ────────────────────────────────────────────
  public readonly filteredAssets: Signal<Asset[]> = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.selectedStatus().toUpperCase().trim();
    const category = this.selectedCategory().toLowerCase().trim();
    const view = this.selectedView();

    return this.assets().filter(asset => {
      // View split — inventory = no purchaseId/purchaseNumber
      const isPurchased = !!(asset.purchaseId || asset.purchaseNumber);
      const matchesView = view === 'purchased' ? isPurchased : !isPurchased;

      const matchesQuery =
        !query ||
        asset.name.toLowerCase().includes(query) ||
        (asset.serialNumber && asset.serialNumber.toLowerCase().includes(query)) ||
        (asset.brand && asset.brand.toLowerCase().includes(query)) ||
        (asset.model && asset.model.toLowerCase().includes(query)) ||
        (asset.assignedTo && asset.assignedTo.toLowerCase().includes(query)) ||
        (asset.purchaseNumber && asset.purchaseNumber.toLowerCase().includes(query)) ||
        (typeof asset.category === 'string'
          ? asset.category.toLowerCase().includes(query)
          : (asset.category as AssetCategory)?.name?.toLowerCase().includes(query));

      const matchesStatus = !status || asset.status === status;

      const assetCat = typeof asset.category === 'string'
        ? asset.category
        : (asset.category as AssetCategory)?.name ?? '';
      const matchesCategory = !category || assetCat.toLowerCase().includes(category);

      return matchesView && matchesQuery && matchesStatus && matchesCategory;
    });
  });

  // ─── Inventory grouped data ───────────────────────────────────────────────
  public readonly inventoryGroups: Signal<InventoryGroup[]> = computed(() => {
    const inventoryAssets = this.assets().filter(
      a => !(a.purchaseId || a.purchaseNumber)
    );

    // Apply search + category filters
    const query = this.searchQuery().toLowerCase().trim();
    const category = this.selectedCategory().toLowerCase().trim();

    const filtered = inventoryAssets.filter(a => {
      const matchesQuery =
        !query ||
        a.name.toLowerCase().includes(query) ||
        (a.brand && a.brand.toLowerCase().includes(query)) ||
        (a.model && a.model.toLowerCase().includes(query)) ||
        (typeof a.category === 'string'
          ? a.category.toLowerCase().includes(query)
          : (a.category as AssetCategory)?.name?.toLowerCase().includes(query));

      const assetCat = typeof a.category === 'string'
        ? a.category : (a.category as AssetCategory)?.name ?? '';
      const matchesCategory = !category || assetCat.toLowerCase().includes(category);

      return matchesQuery && matchesCategory;
    });

    const groups = new Map<string, InventoryGroup>();
    filtered.forEach(asset => {
      const key = `${asset.name}-${asset.brand ?? ''}-${asset.model ?? ''}`;
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          name: asset.name,
          category: asset.category,
          brand: asset.brand,
          model: asset.model,
          unitCost: asset.purchaseCost || 0,
          totalStock: 0,
          availableStock: 0,
          assignedStock: 0,
          maintenanceStock: 0,
          assetIds: [],
        });
      }
      const g = groups.get(key)!;
      g.totalStock++;
      g.assetIds.push(asset.id);
      if (asset.status === 'AVAILABLE') g.availableStock++;
      else if (asset.status === 'ASSIGNED') g.assignedStock++;
      else if (asset.status === 'MAINTENANCE') g.maintenanceStock++;
    });

    return Array.from(groups.values());
  });

  public readonly inventoryTotalPages: Signal<number> = computed(() =>
    Math.ceil(this.inventoryGroups().length / this.pageSize()) || 1
  );

  public readonly paginatedInventoryGroups: Signal<InventoryGroup[]> = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.inventoryGroups().slice(start, start + this.pageSize());
  });

  // ─── Purchase grouped data ────────────────────────────────────────────────
  public readonly purchaseGroups: Signal<PurchaseGroup[]> = computed(() => {
    const purchasedAssets = this.assets().filter(
      a => !!(a.purchaseId || a.purchaseNumber)
    );

    const query = this.searchQuery().toLowerCase().trim();
    const status = this.selectedStatus().toUpperCase().trim();
    const category = this.selectedCategory().toLowerCase().trim();

    const filtered = purchasedAssets.filter(a => {
      const matchesQuery =
        !query ||
        a.name.toLowerCase().includes(query) ||
        (a.serialNumber && a.serialNumber.toLowerCase().includes(query)) ||
        (a.brand && a.brand.toLowerCase().includes(query)) ||
        (a.model && a.model.toLowerCase().includes(query)) ||
        (a.assignedTo && a.assignedTo.toLowerCase().includes(query)) ||
        (a.purchaseNumber && a.purchaseNumber.toLowerCase().includes(query)) ||
        (a.supplier && a.supplier.toLowerCase().includes(query));

      const matchesStatus = !status || a.status === status;

      const assetCat = typeof a.category === 'string'
        ? a.category : (a.category as AssetCategory)?.name ?? '';
      const matchesCategory = !category || assetCat.toLowerCase().includes(category);

      return matchesQuery && matchesStatus && matchesCategory;
    });

    const groups = new Map<string, PurchaseGroup>();
    filtered.forEach(asset => {
      // Strip backend-appended unit suffixes (e.g. " #100 (PO-56195)") from
      // the name before grouping so all units of the same product merge correctly.
      const cleanName = this.cleanAssetName(asset.name);
      const key = `${cleanName}-${asset.brand ?? ''}-${asset.model ?? ''}`;
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          purchaseNumber: asset.purchaseNumber || '',
          purchaseNumbers: [],
          assetName: cleanName,   // use the clean name for display
          category: asset.category,
          brand: asset.brand,
          model: asset.model,
          supplier: asset.supplier,
          suppliers: [],
          quantity: 0,
          availableCount: 0,
          assignedCount: 0,
          maintenanceCount: 0,
          totalAmount: 0,
          assets: [],
        });
      }
      const g = groups.get(key)!;
      g.quantity++;
      g.totalAmount += asset.purchaseCost || 0;
      g.assets.push(asset);
      if (asset.status === 'AVAILABLE') g.availableCount++;
      else if (asset.status === 'ASSIGNED') g.assignedCount++;
      else if (asset.status === 'MAINTENANCE') g.maintenanceCount++;

      // Track all unique PO numbers
      const po = asset.purchaseNumber || asset.purchaseId;
      if (po && !g.purchaseNumbers.includes(po)) {
        g.purchaseNumbers.push(po);
      }
      if (po) g.purchaseNumber = po;

      // Track all unique suppliers
      const sup = asset.supplier?.trim();
      if (sup && !g.suppliers.includes(sup)) {
        g.suppliers.push(sup);
      }
      // supplier field: single value if uniform, empty if mixed
      g.supplier = g.suppliers.length === 1 ? g.suppliers[0] : undefined;
    });

    return Array.from(groups.values());
  });

  public readonly purchaseTotalPages: Signal<number> = computed(() =>
    Math.ceil(this.purchaseGroups().length / this.pageSize()) || 1
  );

  public readonly paginatedPurchaseGroups: Signal<PurchaseGroup[]> = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.purchaseGroups().slice(start, start + this.pageSize());
  });

  // ─── Pagination ───────────────────────────────────────────────────────────
  public setSearchQuery(query: string): void { this.searchQuery.set(query); this.currentPage.set(1); }
  public setStatusFilter(status: string): void { this.selectedStatus.set(status); this.currentPage.set(1); }
  public setCategoryFilter(cat: string): void { this.selectedCategory.set(cat); this.currentPage.set(1); }
  public setLocationFilter(loc: string): void { this.selectedLocation.set(loc); this.currentPage.set(1); }
  public setViewFilter(view: 'inventory' | 'purchased'): void { this.selectedView.set(view); this.currentPage.set(1); }
  public setPage(page: number): void {
    const max = this.selectedView() === 'inventory'
      ? this.inventoryTotalPages()
      : this.purchaseTotalPages();
    if (page >= 1 && page <= max) this.currentPage.set(page);
  }

  public createAsset(payload: AssetCreate): Observable<Asset> {
    this.loading.set(true);
    return this.assetApisService.createAsset(payload).pipe(
      tap((apiAsset: Asset) => {
        const normalized = this.normalizeAsset(apiAsset);
        this.assets.update(curr => [normalized, ...curr]);
        this.saveToLocalStorage(this.assets());
        this.loading.set(false);
        this.loadAssetsFromApi();
      })
    );
  }

  public createAssetSync(payload: AssetCreate): Asset {
    const newId = 'ast-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const created: Asset = {
      id: newId,
      name: payload.name,
      serialNumber: payload.serialNumber || `SN-${Math.floor(1000 + Math.random() * 9000)}`,
      category: payload.category || payload.categoryId,
      brand: payload.brand,
      model: payload.model,
      color: payload.color,
      status: payload.status || 'AVAILABLE',
      assignedTo: payload.assignedTo,
      purchaseDate: payload.purchaseDate || new Date().toISOString().split('T')[0],
      purchaseCost: payload.purchaseCost || 0,
      value: payload.purchaseCost || 0,
      supplier: payload.supplier,
      purchaseNumber: payload.purchaseNumber,
      totalQuantity: 1,
      availableQuantity: payload.status === 'AVAILABLE' || !payload.status ? 1 : 0,
      assignedQuantity: payload.status === 'ASSIGNED' ? 1 : 0,
      maintenanceQuantity: payload.status === 'MAINTENANCE' ? 1 : 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.assets.update(curr => [created, ...curr]);
    this.saveToLocalStorage(this.assets());
    return created;
  }

  public updateAsset(id: string, payload: Partial<Asset>): Observable<Asset> {
    this.assets.update(curr =>
      curr.map(a => a.id === id
        ? { ...a, ...payload, updatedAt: new Date().toISOString() }
        : a
      )
    );
    this.saveToLocalStorage(this.assets());

    return this.assetApisService.updateAsset(id, payload as AssetUpdate).pipe(
      tap((updated: Asset) => {
        const normalized = this.normalizeAsset(updated);
        this.assets.update(curr =>
          curr.map(a => a.id === id ? normalized : a)
        );
        this.saveToLocalStorage(this.assets());
      })
    );
  }

  public deleteAsset(id: string): Observable<void> {
    this.assets.update(curr => curr.filter(a => a.id !== id));
    this.saveToLocalStorage(this.assets());

    return this.assetApisService.deleteAsset(id).pipe(
      tap(() => this.saveToLocalStorage(this.assets()))
    );
  }

  // ─── Assignment actions ───────────────────────────────────────────────────
  public assignAsset(id: string, employeeName: string, date: string): Observable<Asset> {
    return this.updateAsset(id, {
      status: 'ASSIGNED',
      assignedTo: employeeName,
      assignmentDate: date,
    });
  }

  public returnAsset(id: string): Observable<Asset> {
    return this.updateAsset(id, {
      status: 'AVAILABLE',
      assignedTo: undefined,
      assignmentDate: undefined,
    });
  }

  // ─── Maintenance actions ──────────────────────────────────────────────────
  public markMaintenance(id: string): Observable<Asset> {
    return this.updateAsset(id, { status: 'MAINTENANCE' });
  }

  // ─── Unit actions (pass-through to API) ───────────────────────────────────
  public getAssetUnits(assetId: string): Observable<AssetUnit[]> {
    return this.assetApisService.getAssetUnits(assetId);
  }

  public assignUnit(unitId: string, payload: { employee_name: string; assigned_date?: string }): Observable<AssetUnit> {
    return this.assetApisService.assignUnit(unitId, payload);
  }

  public returnUnit(unitId: string): Observable<AssetUnit> {
    return this.assetApisService.returnUnit(unitId);
  }

  public updateUnitStatus(unitId: string, status: string): Observable<AssetUnit> {
    return this.assetApisService.updateUnitStatus(unitId, status);
  }

  public getAvailableUnits(assetId: string): Observable<AssetUnit[]> {
    return this.assetApisService.getAvailableUnits(assetId);
  }
}
