import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { Observable, tap, catchError, of, map } from 'rxjs';
import {
  Purchase, PurchaseCreate, PurchaseUpdate,
  PurchaseStatus, PaymentStatus, AssetSearchResult
} from '../../../core/interfaces/purchase.interface';
import { Supplier, SupplierCreate } from '../../../core/interfaces/supplier.interface';
import { PurchaseApisService } from './purchase-apis.service';

@Injectable({ providedIn: 'root' })
export class PurchaseService {
  private readonly purchaseApisService = inject(PurchaseApisService);

  // ─── Purchase state ───────────────────────────────────────────────────────
  public readonly purchases:     WritableSignal<Purchase[]>       = signal<Purchase[]>([]);
  public readonly loading:       WritableSignal<boolean>          = signal<boolean>(false);
  public readonly errorMessage:  WritableSignal<string | null>    = signal<string | null>(null);

  // ─── Supplier state ───────────────────────────────────────────────────────
  private readonly SUPPLIER_STORAGE_KEY = 'astra_suppliers';

  public readonly suppliers:        WritableSignal<Supplier[]> = signal<Supplier[]>(this.loadSuppliersFromStorage());
  public readonly suppliersLoading: WritableSignal<boolean>    = signal<boolean>(false);

  private loadSuppliersFromStorage(): Supplier[] {
    try {
      const raw = localStorage.getItem(this.SUPPLIER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Supplier[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return [];
  }

  private saveSuppliersToStorage(suppliers: Supplier[]): void {
    try {
      localStorage.setItem(this.SUPPLIER_STORAGE_KEY, JSON.stringify(suppliers));
    } catch { /* ignore */ }
  }

  // ─── Asset search (for purchase form dropdown) ────────────────────────────
  public readonly assetSearchResults: WritableSignal<AssetSearchResult[]> = signal<AssetSearchResult[]>([]);
  public readonly assetSearchLoading: WritableSignal<boolean>             = signal<boolean>(false);

  // ─── Filter signals ───────────────────────────────────────────────────────
  public readonly searchQuery:          WritableSignal<string> = signal<string>('');
  public readonly selectedStatus:       WritableSignal<string> = signal<string>('');
  public readonly selectedSupplier:     WritableSignal<string> = signal<string>('');
  public readonly selectedPaymentStatus: WritableSignal<string> = signal<string>('');
  public readonly currentPage:          WritableSignal<number> = signal<number>(1);
  public readonly pageSize:             WritableSignal<number> = signal<number>(10);

  // ─── Computed: filtered & paginated ──────────────────────────────────────
  public readonly filteredPurchases: Signal<Purchase[]> = computed(() => {
    const query         = this.searchQuery().toLowerCase().trim();
    const status        = this.selectedStatus().toUpperCase() as PurchaseStatus;
    const supplier      = this.selectedSupplier();
    const paymentStatus = this.selectedPaymentStatus().toUpperCase() as PaymentStatus;

    return this.purchases().filter(p => {
      const matchesQuery =
        !query ||
        p.purchaseNumber.toLowerCase().includes(query) ||
        (typeof p.asset === 'object' ? (p.asset as any).name?.toLowerCase().includes(query) : false) ||
        (typeof p.supplier === 'object' ? (p.supplier as Supplier).company?.toLowerCase().includes(query) : false);

      const matchesStatus        = !status        || p.status        === status;
      const matchesPaymentStatus = !paymentStatus || p.paymentStatus === paymentStatus;
      const matchesSupplier      = !supplier      || (
        typeof p.supplier === 'object'
          ? (p.supplier as Supplier).id === supplier
          : p.supplier === supplier
      );

      return matchesQuery && matchesStatus && matchesSupplier && matchesPaymentStatus;
    });
  });

  public readonly totalFilteredCount: Signal<number> = computed(() =>
    this.filteredPurchases().length
  );

  public readonly totalPages: Signal<number> = computed(() =>
    Math.ceil(this.totalFilteredCount() / this.pageSize()) || 1
  );

  public readonly paginatedPurchases: Signal<Purchase[]> = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredPurchases().slice(start, start + this.pageSize());
  });

  // ─── Load ─────────────────────────────────────────────────────────────────
  public loadPurchasesFromApi(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.purchaseApisService.getPurchases({ page_size: 100 }).subscribe({
      next: (res) => {
        const raw = Array.isArray(res) ? res : (res?.results ?? []);
        const normalized = raw.map(p => {
          const rawP = p as any;
          const displayId = rawP.displayId ?? rawP.display_id ?? undefined;
          const rawId = String(rawP.id ?? '');
          const purchaseNumber = displayId ?? rawP.purchaseNumber ?? rawP.purchase_number ?? (rawId ? 'PO-' + rawId.replace(/-/g, '').slice(0, 6).toUpperCase() : '');
          return {
            ...p,
            displayId,
            purchaseNumber: p.purchaseNumber || purchaseNumber,
            totalAmount:     p.totalAmount     ?? (p.purchasePrice * p.quantity),
            remainingAmount: p.remainingAmount ?? (p.purchasePrice * p.quantity - p.paidAmount),
          };
        });
        this.purchases.set(normalized);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        console.error('[PurchaseService] Failed to load purchases.', err);
        this.errorMessage.set('Failed to load purchases. Please refresh.');
        this.purchases.set([]);
        this.loading.set(false);
      }
    });
  }

  public loadSuppliersFromApi(): void {
    this.suppliersLoading.set(true);

    this.purchaseApisService.getSuppliers({ page_size: 100 }).subscribe({
      next: (res) => {
        const raw = Array.isArray(res) ? res : (res?.results ?? []);
        const normalizedSuppliers = raw.map((s: any) => ({
          ...s,
          displayId: s.displayId ?? s.display_id ?? undefined,
        }));
        this.suppliers.set(normalizedSuppliers);
        this.saveSuppliersToStorage(normalizedSuppliers);
        this.suppliersLoading.set(false);
      },
      error: (err: unknown) => {
        console.warn('[PurchaseService] Failed to load suppliers from API — using local cache.', err);
        // Keep whatever is already in the signal (from localStorage)
        this.suppliersLoading.set(false);
      }
    });
  }

  // ─── Asset search ─────────────────────────────────────────────────────────
  public searchAssets(query: string): void {
    if (!query.trim()) { this.assetSearchResults.set([]); return; }
    this.assetSearchLoading.set(true);
    this.purchaseApisService.searchAssets(query).subscribe({
      next: (results) => {
        this.assetSearchResults.set(results);
        this.assetSearchLoading.set(false);
      },
      error: (err: unknown) => {
        console.warn('[PurchaseService] Asset search failed.', err);
        this.assetSearchResults.set([]);
        this.assetSearchLoading.set(false);
      }
    });
  }

  // ─── Filters ──────────────────────────────────────────────────────────────
  public setSearchQuery(query: string):             void { this.searchQuery.set(query);           this.currentPage.set(1); }
  public setStatusFilter(status: string):           void { this.selectedStatus.set(status);        this.currentPage.set(1); }
  public setSupplierFilter(id: string):             void { this.selectedSupplier.set(id);          this.currentPage.set(1); }
  public setPaymentStatusFilter(ps: string):        void { this.selectedPaymentStatus.set(ps);     this.currentPage.set(1); }
  public setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) this.currentPage.set(page);
  }

  // ─── Purchase CRUD ────────────────────────────────────────────────────────
  // createPurchase calls the API directly — no createAssetSync, no local
  // asset records created client-side, no localStorage.
  // The backend creates AssetUnit rows automatically when a Purchase is saved.
  public createPurchase(payload: PurchaseCreate): Observable<Purchase> {
    return this.purchaseApisService.createPurchase(payload).pipe(
      tap(() => this.loadPurchasesFromApi()),
      catchError((err: unknown) => {
        console.error('[PurchaseService] createPurchase failed.', err);
        throw err;  // propagate — do NOT silently create local records
      })
    );
  }

  public updatePurchase(id: string, payload: PurchaseUpdate): Observable<Purchase> {
    return this.purchaseApisService.updatePurchase(id, payload).pipe(
      tap(() => this.loadPurchasesFromApi())
    );
  }

  public deletePurchase(id: string): Observable<void> {
    return this.purchaseApisService.deletePurchase(id).pipe(
      tap(() => this.loadPurchasesFromApi())
    );
  }

  // ─── Supplier CRUD ────────────────────────────────────────────────────────
  public createSupplier(payload: SupplierCreate): Observable<Supplier> {
    return this.purchaseApisService.createSupplier(payload).pipe(
      tap((created) => {
        // Sync the local list with the newly created supplier
        this.suppliers.update(curr => {
          const updated = [created, ...curr];
          this.saveSuppliersToStorage(updated);
          return updated;
        });
      }),
      catchError((err: unknown) => {
        console.warn('[PurchaseService] createSupplier API failed — saving locally.', err);
        // Create a local supplier with a temporary ID so the form can proceed
        const localSupplier: Supplier = {
          id:        'sup-local-' + Date.now(),
          name:      payload.name || payload.company,
          company:   payload.company,
          email:     payload.email,
          phone:     payload.phone,
          address:   payload.address,
          specifications: payload.specifications,
          status:    'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.suppliers.update(curr => {
          const updated = [localSupplier, ...curr];
          this.saveSuppliersToStorage(updated);
          return updated;
        });
        return of(localSupplier);
      })
    );
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  public getSupplierById(id: string): Supplier | undefined {
    return this.suppliers().find(s => s.id === id);
  }

  public calculateTotalAmount(price: number, quantity: number): number {
    return price * quantity;
  }

  public calculateRemainingAmount(total: number, paid: number): number {
    return Math.max(0, total - paid);
  }

  public getPurchasesForSupplier(supplierId: string): Observable<Purchase[]> {
    return new Observable(observer => {
      this.purchaseApisService.getPurchases({ supplier: supplierId, page_size: 200 }).subscribe({
        next: (res) => { observer.next(res.results || []); observer.complete(); },
        error: (e) => observer.error(e)
      });
    });
  }

  public getPurchaseById(purchaseId: string): Observable<Purchase> {
    return this.purchaseApisService.getPurchaseById(purchaseId);
  }

  public getSupplierDetailById(id: string): Observable<Supplier> {
    return this.purchaseApisService.getSupplierById(id);
  }

  // Standalone additions for payments and summary endpoints
  public getPaymentsForPurchase(purchaseId: string): Observable<any[]> {
    return this.purchaseApisService.getPayments(purchaseId).pipe(
      map((items: any[]) => (items || []).map(p => ({
        ...p,
        method: p.payment_method || p.paymentMethod || p.method || 'CASH',
        paymentMethod: p.payment_method || p.paymentMethod || p.method || 'CASH',
        payment_method: p.payment_method || p.paymentMethod || p.method || 'CASH',
        paymentMethodDetail: p.payment_method_detail || p.paymentMethodDetail || '',
        payment_method_detail: p.payment_method_detail || p.paymentMethodDetail || '',
        paymentDate: p.payment_date || p.paymentDate || p.createdAt || '',
        payment_date: p.payment_date || p.paymentDate || p.createdAt || '',
      })))
    );
  }

  public addPayment(purchaseId: string, payload: any): Observable<Purchase> {
    const formattedPayload = {
      ...payload,
      payment_method: payload.paymentMethod || payload.payment_method || payload.method || 'CASH',
      paymentMethod: payload.paymentMethod || payload.payment_method || payload.method || 'CASH',
      method: payload.paymentMethod || payload.payment_method || payload.method || 'CASH',
      payment_method_detail: payload.paymentMethodDetail || payload.payment_method_detail || undefined,
      paymentMethodDetail: payload.paymentMethodDetail || payload.payment_method_detail || undefined,
      payment_date: payload.paymentDate || payload.payment_date || new Date().toISOString().split('T')[0],
      paymentDate: payload.paymentDate || payload.payment_date || new Date().toISOString().split('T')[0],
    };
    return this.purchaseApisService.addPayment(purchaseId, formattedPayload).pipe(
      tap(() => this.loadPurchasesFromApi())
    );
  }

  public downloadInvoicePDF(paymentId: string): Observable<Blob> {
    return this.purchaseApisService.downloadInvoice(paymentId);
  }

  public paySupplier(supplierId: string, payload: any): Observable<any> {
    const formattedPayload = {
      ...payload,
      payment_method: payload.paymentMethod || payload.payment_method || payload.method || 'CASH',
      paymentMethod: payload.paymentMethod || payload.payment_method || payload.method || 'CASH',
      method: payload.paymentMethod || payload.payment_method || payload.method || 'CASH',
      payment_method_detail: payload.paymentMethodDetail || payload.payment_method_detail || undefined,
      paymentMethodDetail: payload.paymentMethodDetail || payload.payment_method_detail || undefined,
      payment_date: payload.paymentDate || payload.payment_date || new Date().toISOString().split('T')[0],
      paymentDate: payload.paymentDate || payload.payment_date || new Date().toISOString().split('T')[0],
    };
    return this.purchaseApisService.paySupplier(supplierId, formattedPayload).pipe(
      tap(() => this.loadPurchasesFromApi())
    );
  }

  public getSupplierPaymentHistory(supplierId: string): Observable<any[]> {
    return this.purchaseApisService.getSupplierPaymentHistory(supplierId).pipe(
      map((items: any[]) => (items || []).map(p => ({
        ...p,
        method: p.payment_method || p.paymentMethod || p.method || 'CASH',
        paymentMethod: p.payment_method || p.paymentMethod || p.method || 'CASH',
        payment_method: p.payment_method || p.paymentMethod || p.method || 'CASH',
        paymentMethodDetail: p.payment_method_detail || p.paymentMethodDetail || '',
        payment_method_detail: p.payment_method_detail || p.paymentMethodDetail || '',
        paymentDate: p.payment_date || p.paymentDate || p.createdAt || '',
        payment_date: p.payment_date || p.paymentDate || p.createdAt || '',
        totalAmount: Number(p.totalAmount ?? p.purchaseTotalAmount ?? p.total_amount ?? p.amount ?? 0),
        paidAmount: Number(p.paidAmount ?? p.amount ?? 0),
        remainingAmount: Number(p.remainingAmount ?? p.purchaseRemainingAmount ?? p.remaining_amount ?? 0),
        purchaseNumber: p.purchaseNumber || p.purchase_number || '',
        purchaseId: p.purchaseId || p.purchase_id || '',
      })))
    );
  }

  public getOutstandingPurchases(params?: any): Observable<any> {
    return this.purchaseApisService.getOutstandingPurchases(params);
  }

  public getSuppliersObservable(): Observable<any> {
    return this.purchaseApisService.getSuppliers({ page_size: 100 });
  }

  public getPurchasesObservable(): Observable<any> {
    return this.purchaseApisService.getPurchases({ page_size: 100 });
  }

  public getPurchaseSummaryStats(): Observable<any> {
    return this.purchaseApisService.getPurchaseSummary();
  }
}
