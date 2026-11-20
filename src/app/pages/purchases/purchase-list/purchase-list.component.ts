import { Component, inject, OnInit, signal, WritableSignal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';
import { PurchaseService } from '../../assets/services/purchase.service';
import { AssetService } from '../../assets/services/asset.service';
import { ToastService } from '../../../core/services/toast.service';
import { AppCurrencyPipe } from '../../../core/pipes/currency.pipe';
import { Purchase, Payment } from '../../../core/interfaces/purchase.interface';
import { StatusBadgeComponent } from '../../../core/components/status-badge/status-badge.component';
import { Supplier } from '../../../core/interfaces/supplier.interface';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { PermissionService } from '../../../core/services/permission.service';
import { SelectComponent, SelectOption } from '../../../core/components/select/select.component';

@Component({
  selector: 'app-purchase-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppCurrencyPipe, StatusBadgeComponent, PageHeaderComponent, SelectComponent],
  templateUrl: './purchase-list.component.html'
})
export class PurchaseListComponent implements OnInit {
  private readonly router = inject(Router);
  protected readonly purchaseService = inject(PurchaseService);
  protected readonly permissionService = inject(PermissionService);
  private readonly assetService = inject(AssetService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly supplierPayMethodOptions: SelectOption[] = [
    { label: 'Cash', value: 'CASH' },
    { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
    { label: 'Cheque', value: 'CHEQUE' },
    { label: 'Mobile Wallet (JazzCash / Easypaisa)', value: 'MOBILE_WALLET' }
  ];

  protected readonly purchasePaymentMethodOptions: SelectOption[] = [
    { label: 'Cash', value: 'CASH' },
    { label: 'Bank Account', value: 'BANK_ACCOUNT' },
    { label: 'JazzCash', value: 'JAZZCASH' },
    { label: 'EasyPaisa', value: 'EASYPAISA' }
  ];

  protected readonly canCreatePurchase = computed(() => this.permissionService.hasPermission('purchase.create'));

  // Active view tab state
  protected readonly activeTab = signal<'purchases' | 'outstanding' | 'suppliers'>('purchases');
  
  // Lists and loading states
  protected readonly isLoading = signal<boolean>(false);
  protected readonly isLoadingSuppliers = signal<boolean>(false);
  protected readonly isSubmittingPayment = signal<boolean>(false);
  protected readonly isSubmittingSupplier = signal<boolean>(false);

  // Signal models
  protected readonly purchases = this.purchaseService.filteredPurchases;
  protected readonly suppliers = this.purchaseService.suppliers;

  // Search/Filters Signal bindings
  protected readonly searchQuery = this.purchaseService.searchQuery;
  protected readonly statusFilter = this.purchaseService.selectedStatus;
  protected readonly paymentStatusFilter = this.purchaseService.selectedPaymentStatus;

  // Outstanding list signals
  protected readonly outstandingPurchases = signal<any[]>([]);
  protected readonly totalOutstanding = signal<number>(0);
  protected readonly outstandingCount = signal<number>(0);

  // Dialog & Detail signal states
  protected readonly selectedPurchase = signal<Purchase | null>(null);
  protected readonly payments = signal<Payment[]>([]);
  protected readonly paymentLoading = signal<boolean>(false);
  protected readonly activePaymentPurchase = signal<Purchase | null>(null);
  protected readonly isAddSupplierOpen = signal<boolean>(false);
  protected readonly activeSupplier = signal<Supplier | null>(null);
  protected readonly supplierPurchases = signal<Purchase[]>([]);

  // Supplier Pay Modal
  protected readonly activeSupplierPay = signal<any | null>(null);
  protected readonly isSubmittingSupplierPay = signal<boolean>(false);
  protected supplierPayForm!: FormGroup;

  // Invoice PDF signal states
  protected readonly invoicePdfBlobUrl = signal<string | null>(null);
  protected readonly invoiceFileName = signal<string>('Invoice.pdf');

  // Reactive Forms
  protected paymentForm!: FormGroup;
  protected supplierForm!: FormGroup;

  public ngOnInit(): void {
    this.initForms();
    this.loadData();
  }

  private initForms(): void {
    const today = new Date().toISOString().split('T')[0];
    this.paymentForm = this.fb.group({
      amount: [null, [Validators.required, Validators.min(0.01)]],
      paymentDate: [today, Validators.required],
      method: ['CASH', Validators.required],
      reference: [''],
      notes: ['']
    });

    this.supplierForm = this.fb.group({
      company: ['', Validators.required],
      name: [''],
      email: ['', [Validators.email]],
      phone: [''],
      address: ['']
    });

    this.supplierPayForm = this.fb.group({
      amount: [null, [Validators.required, Validators.min(0.01)]],
      paymentDate: [today, Validators.required],
      method: ['CASH', Validators.required],
      reference: [''],
      notes: [''],
      // Bank Transfer fields
      bankName: [''],
      accountNumber: [''],
      transactionReference: [''],
      // Cheque fields
      chequeNumber: [''],
      chequeDate: [''],
      // Mobile Wallet fields
      walletProvider: ['JazzCash'],
      mobileNumber: [''],
      accountHolderName: [''],
      transactionId: ['']
    });
  }

  protected loadData(): void {
    this.isLoading.set(true);

    // Load all three in parallel, wait for all to complete, then build outstanding
    forkJoin({
      outstanding: this.purchaseService.getOutstandingPurchases(),
      suppliers: this.purchaseService.getSuppliersObservable(),
      purchases: this.purchaseService.getPurchasesObservable(),
    }).subscribe({
      next: ({ outstanding, suppliers, purchases }) => {
        const rawSuppliers = Array.isArray(suppliers) ? suppliers : (suppliers as any)?.results ?? [];
        this.purchaseService.suppliers.set(rawSuppliers);

        const rawPurchases = Array.isArray(purchases) ? purchases : (purchases as any)?.results ?? [];
        this.purchaseService.purchases.set(rawPurchases.map((p: any) => ({
          ...p,
          totalAmount: p.totalAmount ?? (p.purchasePrice * p.quantity),
          remainingAmount: p.remainingAmount ?? (p.purchasePrice * p.quantity - p.paidAmount),
        })));

        this.buildOutstandingFromSuppliersAndPurchases(outstanding?.results || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.buildOutstandingFromSuppliersAndPurchases([]);
        this.isLoading.set(false);
      }
    });
  }

  protected setActiveTab(tab: 'purchases' | 'outstanding' | 'suppliers'): void {
    this.activeTab.set(tab);
    if (tab === 'outstanding') {
      this.loadOutstanding();
    }
  }

  protected loadOutstanding(): void {
    this.isLoading.set(true);
    forkJoin({
      outstanding: this.purchaseService.getOutstandingPurchases(),
      suppliers: this.purchaseService.getSuppliersObservable(),
      purchases: this.purchaseService.getPurchasesObservable(),
    }).subscribe({
      next: ({ outstanding, suppliers, purchases }) => {
        const rawSuppliers = Array.isArray(suppliers) ? suppliers : (suppliers as any)?.results ?? [];
        this.purchaseService.suppliers.set(rawSuppliers);

        const rawPurchases = Array.isArray(purchases) ? purchases : (purchases as any)?.results ?? [];
        this.purchaseService.purchases.set(rawPurchases.map((p: any) => ({
          ...p,
          totalAmount: p.totalAmount ?? (p.purchasePrice * p.quantity),
          remainingAmount: p.remainingAmount ?? (p.purchasePrice * p.quantity - p.paidAmount),
        })));

        this.buildOutstandingFromSuppliersAndPurchases(outstanding?.results || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.buildOutstandingFromSuppliersAndPurchases([]);
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Builds the outstanding list from ALL suppliers (not just those with balance > 0).
   * Backend only returns suppliers with outstanding > 0, so we merge with full supplier
   * list to ensure paid suppliers remain visible with balance = 0.
   */
  private buildOutstandingFromSuppliersAndPurchases(backendOutstanding: any[]): void {
    const allSuppliers = this.purchaseService.suppliers();
    const allPurchases = this.purchaseService.purchases();

    // Build a map from backend outstanding for quick lookup
    const outstandingMap = new Map<string, any>();
    for (const item of backendOutstanding) {
      const id = item.supplier?.id || item.supplierId || item.id;
      if (id) outstandingMap.set(id, item);
    }

    // For each supplier, compute outstanding balance from purchases
    const merged = allSuppliers.map(supplier => {
      if (outstandingMap.has(supplier.id)) {
        // Use backend data (has outstanding)
        return outstandingMap.get(supplier.id);
      }
      // Supplier is fully paid or has no purchases — compute from local purchases
      const supplierPurchases = allPurchases.filter(p => {
        const sid = typeof p.supplier === 'object' ? (p.supplier as any)?.id : p.supplier;
        return sid === supplier.id;
      });
      if (supplierPurchases.length === 0) return null; // No purchases — skip
      const outstandingBalance = supplierPurchases.reduce((sum, p) => {
        const rem = Number(p.remainingAmount ?? 0);
        return sum + (rem > 0 ? rem : 0);
      }, 0);
      const activeDuesCount = supplierPurchases.filter(p =>
        p.paymentStatus === 'UNPAID' || p.paymentStatus === 'PARTIAL'
      ).length;
      return {
        supplier,
        outstandingBalance,
        activeDuesCount
      };
    }).filter(Boolean);

    const totalOutstanding = merged.reduce((sum, item) => sum + Number(item.outstandingBalance || 0), 0);
    const outstandingCount = merged.filter(item => Number(item.outstandingBalance) > 0).length;

    this.outstandingPurchases.set(merged);
    this.totalOutstanding.set(totalOutstanding);
    this.outstandingCount.set(outstandingCount);
  }

  // Filter Event Handlers
  protected onSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.purchaseService.setSearchQuery(query);
  }

  protected onStatusFilter(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.purchaseService.setStatusFilter(val);
  }

  protected onPaymentStatusFilter(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.purchaseService.setPaymentStatusFilter(val);
  }

  // Helper resolvers for displaying IDs and object names
  protected getAssetName(asset: any): string {
    if (!asset) return '—';
    if (typeof asset === 'string') {
      const fullObj = this.assetService.getAssetById(asset);
      return fullObj?.name || 'Asset Product';
    }
    return asset.name || 'Asset Product';
  }

  protected getSupplierCompany(supplier: any): string {
    if (!supplier) return '—';
    if (typeof supplier === 'string') {
      const fullObj = this.purchaseService.getSupplierById(supplier);
      return fullObj?.company || 'Supplier Company';
    }
    return supplier.company || 'Supplier Company';
  }

  // Navigation handlers
  protected openSupplierPayModal(item: any): void {
    this.activeSupplierPay.set(item);
    const today = new Date().toISOString().split('T')[0];
    this.supplierPayForm.reset({
      amount: item.outstandingBalance,
      paymentDate: today,
      method: 'CASH',
      reference: '',
      notes: '',
      bankName: '', accountNumber: '', transactionReference: '',
      chequeNumber: '', chequeDate: '',
      walletProvider: 'JazzCash', mobileNumber: '', accountHolderName: '', transactionId: ''
    });
    this.supplierPayForm.get('amount')?.setValidators([
      Validators.required,
      Validators.min(0.01),
      Validators.max(item.outstandingBalance)
    ]);
    this.supplierPayForm.get('amount')?.updateValueAndValidity();
  }

  protected onSupplierPayMethodChange(): void {
    const method = this.supplierPayForm.get('method')?.value;
    // Clear all detail-field validators first
    ['bankName','accountNumber','transactionReference','chequeNumber','chequeDate','mobileNumber','transactionId'].forEach(f => {
      this.supplierPayForm.get(f)?.clearValidators();
      this.supplierPayForm.get(f)?.updateValueAndValidity();
    });
    if (method === 'BANK_TRANSFER') {
      this.supplierPayForm.get('bankName')?.setValidators(Validators.required);
      this.supplierPayForm.get('accountNumber')?.setValidators(Validators.required);
      this.supplierPayForm.get('transactionReference')?.setValidators(Validators.required);
    } else if (method === 'CHEQUE') {
      this.supplierPayForm.get('bankName')?.setValidators(Validators.required);
      this.supplierPayForm.get('chequeNumber')?.setValidators(Validators.required);
      this.supplierPayForm.get('chequeDate')?.setValidators(Validators.required);
    } else if (method === 'MOBILE_WALLET') {
      this.supplierPayForm.get('mobileNumber')?.setValidators(Validators.required);
      this.supplierPayForm.get('transactionId')?.setValidators(Validators.required);
    }
    ['bankName','accountNumber','transactionReference','chequeNumber','chequeDate','mobileNumber','transactionId'].forEach(f => {
      this.supplierPayForm.get(f)?.updateValueAndValidity();
    });
  }

  protected onSupplierPayMethodSelect(val: string | number): void {
    this.supplierPayForm.get('method')?.setValue(String(val));
    this.onSupplierPayMethodChange();
  }

  protected onPurchasePaymentMethodSelect(val: string | number): void {
    this.paymentForm.get('method')?.setValue(String(val));
  }

  protected closeSupplierPayModal(): void {
    this.activeSupplierPay.set(null);
  }

  protected onSubmitSupplierPay(): void {
    if (this.supplierPayForm.invalid || !this.activeSupplierPay()) return;
    this.isSubmittingSupplierPay.set(true);

    const supplierId = this.activeSupplierPay().supplier.id;
    const v = this.supplierPayForm.value;

    // Build payment method detail string
    let paymentMethodDetail = '';
    if (v.method === 'BANK_TRANSFER') {
      paymentMethodDetail = [v.bankName, v.accountNumber, v.transactionReference].filter(Boolean).join(' | ');
    } else if (v.method === 'CHEQUE') {
      paymentMethodDetail = [v.bankName, v.chequeNumber, v.chequeDate].filter(Boolean).join(' | ');
    } else if (v.method === 'MOBILE_WALLET') {
      paymentMethodDetail = [v.walletProvider, v.mobileNumber, v.transactionId].filter(Boolean).join(' | ');
    }

    const payload = {
      amount: v.amount,
      paymentDate: v.paymentDate,
      method: v.method,
      reference: v.reference,
      notes: v.notes,
      paymentMethodDetail
    };

    this.purchaseService.paySupplier(supplierId, payload).subscribe({
      next: (res: any) => {
        this.toastService.presentToast(res?.detail || 'Payment recorded successfully!', 2000, 'success');
        this.isSubmittingSupplierPay.set(false);

        // Update the outstanding list locally — set balance to 0, remove Pay button
        // Do NOT reload from backend (backend removes fully-paid suppliers from the list)
        const paidAmount = Number(v.amount) || 0;
        this.outstandingPurchases.update(list =>
          list.map(item => {
            if (item.supplier?.id === supplierId) {
              const newBalance = Math.max(0, Number(item.outstandingBalance) - paidAmount);
              const newDues = newBalance === 0 ? 0 : item.activeDuesCount;
              return { ...item, outstandingBalance: newBalance, activeDuesCount: newDues };
            }
            return item;
          })
        );
        // Update total outstanding
        this.totalOutstanding.update(t => Math.max(0, t - paidAmount));
        // Update count (suppliers with balance > 0)
        this.outstandingCount.set(
          this.outstandingPurchases().filter(i => Number(i.outstandingBalance) > 0).length
        );

        this.closeSupplierPayModal();
      },
      error: (err: any) => {
        this.isSubmittingSupplierPay.set(false);
        const detail = err?.error?.detail || 'Failed to record payment. Please try again.';
        this.toastService.presentToast(detail, 3000, 'error');
      }
    });
  }

  protected navigatePaySupplier(supplierId: string): void {
    this.router.navigate(['/purchases/suppliers', supplierId, 'pay']);
  }

  protected navigateCreatePurchase(): void {
    this.router.navigate(['/assets/purchases/create']);
  }

  // Purchase Details - navigate to full page
  protected viewPurchaseDetail(purchase: Purchase): void {
    this.router.navigate(['/purchases', purchase.id]);
  }

  // Recording Payments Installments Actions
  protected openPaymentModal(purchase: Purchase): void {
    this.activePaymentPurchase.set(purchase);
    const today = new Date().toISOString().split('T')[0];
    
    // Set validator max dynamically to remaining amount
    this.paymentForm.reset({
      amount: purchase.remainingAmount,
      paymentDate: today,
      method: 'CASH',
      reference: '',
      notes: ''
    });
    this.paymentForm.get('amount')?.setValidators([
      Validators.required, 
      Validators.min(0.01), 
      Validators.max(purchase.remainingAmount)
    ]);
    this.paymentForm.get('amount')?.updateValueAndValidity();
  }

  protected closePaymentModal(): void {
    this.activePaymentPurchase.set(null);
  }

  protected onSubmitPayment(): void {
    if (this.paymentForm.invalid || !this.activePaymentPurchase()) return;
    this.isSubmittingPayment.set(true);

    const purchaseId = this.activePaymentPurchase()!.id;
    this.purchaseService.addPayment(purchaseId, this.paymentForm.value).subscribe({
      next: (updatedPurchase) => {
        this.toastService.presentToast('Installment payment recorded successfully!', 2000, 'success');
        this.isSubmittingPayment.set(false);
        this.closePaymentModal();
        this.loadData();
        
        // Refresh active drawer if details page is open
        if (this.selectedPurchase() && this.selectedPurchase()?.id === purchaseId) {
          this.viewPurchaseDetail(updatedPurchase);
        }
      },
      error: (err) => {
        this.isSubmittingPayment.set(false);
        const detail = err?.error?.detail || 'Failed to record installment payment. Please try again.';
        this.toastService.presentToast(detail, 3000, 'error');
      }
    });
  }

  // Supplier Profile ledger actions - navigate to full page
  protected openSupplierDetailModal(supplier: Supplier): void {
    this.router.navigate(['/purchases/suppliers', supplier.id]);
  }

  protected closeSupplierDetailModal(): void {
    this.activeSupplier.set(null);
    this.supplierPurchases.set([]);
  }

  // Create supplier actions
  protected openAddSupplierModal(): void {
    this.supplierForm.reset();
    this.isAddSupplierOpen.set(true);
  }

  protected closeAddSupplierModal(): void {
    this.isAddSupplierOpen.set(false);
  }

  protected onSubmitSupplier(): void {
    if (this.supplierForm.invalid) return;
    this.isSubmittingSupplier.set(true);

    this.purchaseService.createSupplier(this.supplierForm.value).subscribe({
      next: (created) => {
        this.toastService.presentToast(`Supplier "${created.company}" created successfully!`, 2000, 'success');
        this.isSubmittingSupplier.set(false);
        this.closeAddSupplierModal();
        this.loadData();
      },
      error: () => {
        this.isSubmittingSupplier.set(false);
        this.toastService.presentToast('Failed to register new supplier.', 2500, 'error');
      }
    });
  }

  // PDF Invoice rendering & preview actions
  protected viewInvoicePDF(paymentId: string): void {
    this.purchaseService.downloadInvoicePDF(paymentId).subscribe({
      next: (blob) => {
        if (this.invoicePdfBlobUrl()) {
          URL.revokeObjectURL(this.invoicePdfBlobUrl()!);
        }
        const url = URL.createObjectURL(blob);
        this.invoicePdfBlobUrl.set(url);
        this.invoiceFileName.set(`Invoice_${paymentId}.pdf`);
      },
      error: () => {
        this.toastService.presentToast('Unable to generate billing invoice PDF document.', 3000, 'error');
      }
    });
  }

  protected closeInvoicePDF(): void {
    if (this.invoicePdfBlobUrl()) {
      URL.revokeObjectURL(this.invoicePdfBlobUrl()!);
    }
    this.invoicePdfBlobUrl.set(null);
  }

  protected downloadInvoiceFile(): void {
    const url = this.invoicePdfBlobUrl();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = this.invoiceFileName();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  protected invoicePdfBlobUrlSafe(): SafeResourceUrl {
    const url = this.invoicePdfBlobUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : '';
  }
}
