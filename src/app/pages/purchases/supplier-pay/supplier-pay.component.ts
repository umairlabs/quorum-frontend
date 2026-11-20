import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PurchaseService } from '../../assets/services/purchase.service';
import { ToastService } from '../../../core/services/toast.service';
import { BreadcrumbService } from '../../../core/services/breadcrumb.service';
import { AppCurrencyPipe } from '../../../core/pipes/currency.pipe';
import { Supplier } from '../../../core/interfaces/supplier.interface';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SelectComponent, SelectOption } from '../../../core/components/select/select.component';

@Component({
  selector: 'app-supplier-pay',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppCurrencyPipe, SelectComponent],
  templateUrl: './supplier-pay.component.html'
})
export class SupplierPayComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly purchaseService = inject(PurchaseService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly supplier = signal<Supplier | null>(null);
  protected readonly totalOutstanding = signal<number>(0);
  protected readonly paymentHistory = signal<any[]>([]);
  protected readonly loading = signal<boolean>(true);
  protected readonly historyLoading = signal<boolean>(false);
  protected readonly isSubmitting = signal<boolean>(false);
  protected readonly isPayModalOpen = signal<boolean>(false);

  // Invoice viewer
  protected readonly invoicePdfBlobUrl = signal<string | null>(null);
  protected readonly invoiceFileName = signal<string>('invoice.pdf');

  protected readonly paymentMethodOptions: SelectOption[] = [
    { label: 'Cash', value: 'CASH' },
    { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
    { label: 'Cheque', value: 'CHEQUE' },
    { label: 'Mobile Wallet (JazzCash / Easypaisa)', value: 'MOBILE_WALLET' }
  ];

  protected paymentForm!: FormGroup;

  protected onPaymentMethodSelect(value: string | number): void {
    this.paymentForm.get('method')?.setValue(String(value));
  }

  protected openPayModal(): void {
    const today = new Date().toISOString().split('T')[0];
    this.paymentForm.reset({
      amount: this.totalOutstanding(),
      paymentDate: today,
      method: 'CASH',
      reference: '',
      notes: '',
      bankName: '', accountNumber: '', transactionReference: '',
      chequeNumber: '', chequeDate: '',
      walletProvider: 'JazzCash', mobileNumber: '', accountHolderName: '', transactionId: ''
    });
    this.paymentForm.get('amount')?.setValidators([
      Validators.required, Validators.min(0.01), Validators.max(this.totalOutstanding())
    ]);
    this.paymentForm.get('amount')?.updateValueAndValidity();
    this.isPayModalOpen.set(true);
  }

  protected closePayModal(): void {
    this.isPayModalOpen.set(false);
  }

  public ngOnInit(): void {
    this.initForm();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadData(id);
    }
  }

  private initForm(): void {
    const today = new Date().toISOString().split('T')[0];
    this.paymentForm = this.fb.group({
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

  private loadData(id: string): void {
    this.loading.set(true);
    this.purchaseService.getSupplierDetailById(id).subscribe({
      next: (s) => {
        this.supplier.set(s);

        // Breadcrumbs: AssetFlow > Purchases > Outstanding Dues > [Supplier Name]
        this.breadcrumbService.setOverride({
          showBackArrow: false,
          items: [
            { label: 'AssetFlow' },
            { label: 'Purchases', url: '/purchases' },
            { label: 'Outstanding Dues', url: '/purchases' },
            { label: s.company, url: `/purchases/suppliers/${s.id}/pay`, isLast: true }
          ]
        });

        // Load outstanding balance
        this.purchaseService.getPurchasesForSupplier(s.id).subscribe({
          next: (purchases) => {
            const outstanding = purchases.filter(
              (p: any) => p.paymentStatus === 'UNPAID' || p.paymentStatus === 'PARTIAL'
            );
            const sum = outstanding.reduce((acc: number, p: any) => acc + Number(p.remainingAmount || 0), 0);
            this.totalOutstanding.set(sum);

            // Update form max validator and default amount
            this.paymentForm.get('amount')?.setValidators([
              Validators.required,
              Validators.min(0.01),
              Validators.max(sum)
            ]);
            this.paymentForm.patchValue({ amount: sum });
            this.paymentForm.get('amount')?.updateValueAndValidity();
            this.loading.set(false);
          },
          error: () => this.loading.set(false)
        });

        // Load payment history
        this.loadPaymentHistory(s.id);
      },
      error: () => {
        this.loading.set(false);
        this.toastService.presentToast('Failed to load supplier details.', 3000, 'error');
        this.router.navigate(['/purchases']);
      }
    });
  }

  private loadPaymentHistory(supplierId: string): void {
    this.historyLoading.set(true);
    this.purchaseService.getSupplierPaymentHistory(supplierId).subscribe({
      next: (payments) => {
        const processed = this.computeLedgerBalances(payments);
        this.paymentHistory.set(processed);
        this.historyLoading.set(false);
      },
      error: () => this.historyLoading.set(false)
    });
  }

  private computeLedgerBalances(payments: any[]): any[] {
    if (!payments || payments.length === 0) return [];

    const purchaseGroups = new Map<string, any[]>();
    for (const p of payments) {
      const key = p.purchaseId || p.purchaseNumber || 'general';
      if (!purchaseGroups.has(key)) {
        purchaseGroups.set(key, []);
      }
      purchaseGroups.get(key)!.push(p);
    }

    purchaseGroups.forEach((group) => {
      const sorted = [...group].sort((a, b) => {
        const dateA = new Date(a.paymentDate).getTime() || 0;
        const dateB = new Date(b.paymentDate).getTime() || 0;
        if (dateA !== dateB) return dateA - dateB;
        return (a.createdAt || a.invoiceNumber || '').localeCompare(b.createdAt || b.invoiceNumber || '');
      });

      let cumulativePaid = 0;
      for (const item of sorted) {
        cumulativePaid += Number(item.paidAmount ?? item.amount ?? 0);
        if (item.remainingAmount === undefined || item.remainingAmount === null) {
          const tot = Number(item.totalAmount ?? item.purchaseTotalAmount ?? cumulativePaid);
          item.remainingAmount = Math.max(0, tot - cumulativePaid);
        }
      }
    });

    return payments.map(p => ({
      ...p,
      totalAmount: Number(p.totalAmount ?? p.purchaseTotalAmount ?? p.amount ?? 0),
      paidAmount: Number(p.paidAmount ?? p.amount ?? 0),
      remainingAmount: Number(p.remainingAmount ?? 0),
    }));
  }

  protected goBack(): void {
    this.router.navigate(['/purchases']);
  }

  protected onSubmitPayment(): void {
    if (this.paymentForm.invalid || !this.supplier()) return;
    this.isSubmitting.set(true);

    const v = this.paymentForm.value;

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

    this.purchaseService.paySupplier(this.supplier()!.id, payload).subscribe({
      next: (res) => {
        this.toastService.presentToast(res.detail || 'Payment recorded successfully!', 2000, 'success');
        this.isSubmitting.set(false);
        this.closePayModal();
        // Reload data
        this.loadData(this.supplier()!.id);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const detail = err?.error?.detail || 'Failed to record supplier payment.';
        this.toastService.presentToast(detail, 3000, 'error');
      }
    });
  }

  public ngOnDestroy(): void {
    this.closeInvoicePDF();
  }

  protected viewInvoicePDF(payOrId: any): void {
    const paymentId = typeof payOrId === 'string' ? payOrId : payOrId?.id;
    const invoiceNum = typeof payOrId === 'object' ? payOrId?.invoiceNumber : null;

    if (!paymentId) {
      this.toastService.presentToast('Invoice not available for this payment.', 2500, 'warning');
      return;
    }

    this.purchaseService.downloadInvoicePDF(paymentId).subscribe({
      next: (blob: Blob) => {
        if (!blob || blob.size === 0) {
          this.toastService.presentToast('Invoice not generated yet for this payment.', 2500, 'warning');
          return;
        }
        if (this.invoicePdfBlobUrl()) {
          URL.revokeObjectURL(this.invoicePdfBlobUrl()!);
        }
        const url = URL.createObjectURL(blob);
        this.invoicePdfBlobUrl.set(url);
        this.invoiceFileName.set(`${invoiceNum || 'Invoice_' + paymentId}.pdf`);
      },
      error: (err) => {
        console.error('Invoice download failed:', err);
        this.toastService.presentToast('Invoice not available. It may not have been generated yet.', 3000, 'warning');
      }
    });
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

  protected invoicePdfBlobUrlSafe(): SafeResourceUrl | null {
    const url = this.invoicePdfBlobUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  }

  protected closeInvoicePDF(): void {
    const url = this.invoicePdfBlobUrl();
    if (url) URL.revokeObjectURL(url);
    this.invoicePdfBlobUrl.set(null);
  }

  protected formatMethod(payOrMethod: any): string {
    const method = typeof payOrMethod === 'string'
      ? payOrMethod
      : (payOrMethod?.method || payOrMethod?.paymentMethod || payOrMethod?.payment_method || 'CASH');

    switch (method) {
      case 'BANK_TRANSFER':
      case 'BANK_ACCOUNT':
        return 'Bank Transfer';
      case 'CHEQUE':
        return 'Cheque';
      case 'MOBILE_WALLET':
      case 'JAZZCASH':
      case 'EASYPAISA':
        return 'Mobile Wallet';
      case 'ONLINE':
        return 'Online';
      case 'CASH':
      default:
        return 'Cash';
    }
  }
}
