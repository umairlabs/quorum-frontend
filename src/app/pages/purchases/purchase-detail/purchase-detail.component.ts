import { Component, inject, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PurchaseService } from '../../assets/services/purchase.service';
import { AssetService } from '../../assets/services/asset.service';
import { ToastService } from '../../../core/services/toast.service';
import { AppCurrencyPipe } from '../../../core/pipes/currency.pipe';
import { StatusBadgeComponent } from '../../../core/components/status-badge/status-badge.component';
import { Purchase, Payment } from '../../../core/interfaces/purchase.interface';
import { BreadcrumbService } from '../../../core/services/breadcrumb.service';

@Component({
  selector: 'app-purchase-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppCurrencyPipe],
  templateUrl: './purchase-detail.component.html'
})
export class PurchaseDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly purchaseService = inject(PurchaseService);
  private readonly assetService = inject(AssetService);
  private readonly toastService = inject(ToastService);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);

  // Data signals
  protected readonly purchase = signal<Purchase | null>(null);
  protected readonly payments = signal<Payment[]>([]);
  protected readonly loading = signal<boolean>(true);
  protected readonly paymentLoading = signal<boolean>(false);
  protected readonly isSubmittingPayment = signal<boolean>(false);

  // Payment modal state
  protected readonly activePaymentPurchase = signal<Purchase | null>(null);
  protected paymentForm!: FormGroup;

  // Invoice PDF state
  protected readonly invoicePdfBlobUrl = signal<string | null>(null);
  protected readonly invoiceFileName = signal<string>('Invoice.pdf');

  public ngOnInit(): void {
    this.initForms();
    const purchaseId = this.route.snapshot.paramMap.get('id');
    if (purchaseId) {
      this.loadPurchaseDetail(purchaseId);
    }
  }

  public ngOnDestroy(): void {
    if (this.invoicePdfBlobUrl()) {
      URL.revokeObjectURL(this.invoicePdfBlobUrl()!);
    }
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
  }

  private loadPurchaseDetail(purchaseId: string): void {
    this.loading.set(true);
    this.purchaseService.getPurchaseById(purchaseId).subscribe({
      next: (p: Purchase) => {
        this.purchase.set(p);
        this.breadcrumbService.setOverride({
          showBackArrow: false,
          items: [
            { label: 'AssetFlow' },
            { label: 'Purchases', url: '/purchases' },
            { label: p.purchaseNumber, url: `/purchases/${p.id}`, isLast: true }
          ]
        });
        this.loading.set(false);
        this.loadPayments(purchaseId);
      },
      error: () => {
        this.loading.set(false);
        this.toastService.presentToast('Failed to load purchase details.', 3000, 'error');
        this.router.navigate(['/purchases']);
      }
    });
  }

  private loadPayments(purchaseId: string): void {
    this.paymentLoading.set(true);
    this.purchaseService.getPaymentsForPurchase(purchaseId).subscribe({
      next: (recs) => {
        this.payments.set(recs || []);
        this.paymentLoading.set(false);
      },
      error: () => this.paymentLoading.set(false)
    });
  }

  protected goBack(): void {
    this.router.navigate(['/purchases']);
  }

  // Helper resolvers
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

  // Payment modal actions
  protected openPaymentModal(purchase: Purchase): void {
    this.activePaymentPurchase.set(purchase);
    const today = new Date().toISOString().split('T')[0];
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
        // Refresh current page data
        this.loadPurchaseDetail(purchaseId);
      },
      error: (err) => {
        this.isSubmittingPayment.set(false);
        const detail = err?.error?.detail || 'Failed to record installment payment. Please try again.';
        this.toastService.presentToast(detail, 3000, 'error');
      }
    });
  }

  protected onExportPdf(): void {
    const p = this.purchase();
    if (!p) return;

    if (this.invoicePdfBlobUrl()) {
      URL.revokeObjectURL(this.invoicePdfBlobUrl()!);
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Purchase Order - ${p.purchaseNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1c1e; background: #f8fafc; padding: 32px 20px; }
    .card { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; max-width: 800px; margin: 0 auto; padding: 36px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 20px; margin-bottom: 24px; }
    .header-title { font-size: 22px; font-weight: 700; color: #0f172a; }
    .header-sub { font-size: 13px; color: #64748b; margin-top: 4px; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: #e0f2fe; color: #0369a1; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 14px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .field-label { font-size: 12px; color: #64748b; margin-bottom: 2px; }
    .field-value { font-size: 14px; font-weight: 600; color: #0f172a; }
    .field-value.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #0284c7; }
    .footer { margin-top: 36px; padding-top: 18px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <div class="header-title">PURCHASE ORDER</div>
        <div class="header-sub">PO Number: <strong>${p.purchaseNumber}</strong></div>
      </div>
      <div style="text-align: right;">
        <span class="badge">${p.paymentStatus || 'COMPLETED'}</span>
        <div class="header-sub" style="margin-top: 8px;">Date: ${p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString() : new Date().toLocaleDateString()}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Purchase Details</div>
      <div class="grid">
        <div>
          <div class="field-label">Asset</div>
          <div class="field-value">${this.getAssetName(p.asset)}</div>
        </div>
        <div>
          <div class="field-label">Supplier</div>
          <div class="field-value">${this.getSupplierCompany(p.supplier)}</div>
        </div>
        <div>
          <div class="field-label">Quantity Ordered</div>
          <div class="field-value">${p.quantity}</div>
        </div>
        <div>
          <div class="field-label">Unit Price</div>
          <div class="field-value mono">${p.purchasePrice}</div>
        </div>
        <div>
          <div class="field-label">Total Amount</div>
          <div class="field-value mono" style="font-size: 16px;">${p.totalAmount}</div>
        </div>
        <div>
          <div class="field-label">Total Paid</div>
          <div class="field-value mono" style="color: #16a34a;">${p.paidAmount || 0}</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <div>AssetFlow Enterprise Asset Management</div>
      <div>Procurement Record</div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    this.invoicePdfBlobUrl.set(url);
    this.invoiceFileName.set(`${p.purchaseNumber}_Details.html`);
  }

  // PDF Invoice actions
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

  protected formatMethod(payOrMethod: any): string {
    const method = typeof payOrMethod === 'string'
      ? payOrMethod
      : (payOrMethod?.method || payOrMethod?.paymentMethod || payOrMethod?.payment_method || 'CASH');

    switch (method) {
      case 'BANK_TRANSFER':
      case 'BANK_ACCOUNT': return 'Bank Transfer';
      case 'CHEQUE': return 'Cheque';
      case 'MOBILE_WALLET': return 'Mobile Wallet';
      case 'JAZZCASH': return 'JazzCash';
      case 'EASYPAISA': return 'EasyPaisa';
      case 'CASH':
      default:
        return 'Cash';
    }
  }

  protected getPaymentMethodIcon(payOrMethod: any): string {
    const method = typeof payOrMethod === 'string'
      ? payOrMethod
      : (payOrMethod?.method || payOrMethod?.paymentMethod || payOrMethod?.payment_method || 'CASH');

    switch (method) {
      case 'BANK_TRANSFER':
      case 'BANK_ACCOUNT': return 'account_balance';
      case 'CHEQUE': return 'payments';
      case 'MOBILE_WALLET':
      case 'JAZZCASH':
      case 'EASYPAISA': return 'phone_android';
      case 'CASH':
      default:
        return 'local_atm';
    }
  }

  protected getPaymentDetailSummary(pay: any): string {
    const details = pay?.payment_details || pay?.paymentDetails || this.purchase()?.payment_details || this.purchase()?.paymentDetails;
    const detailStr = pay?.payment_method_detail || pay?.paymentMethodDetail || this.purchase()?.payment_method_detail || this.purchase()?.paymentMethodDetail;
    const fallbackDate = pay?.paymentDate || pay?.payment_date || this.purchase()?.purchaseDate || '';

    if (details && typeof details === 'object') {
      const d = details.paymentDate || fallbackDate;
      if ('accountNumber' in details && details.accountNumber) {
        return `${details.bankName || 'Bank'} • Acc: ${details.accountNumber} • Ref: ${details.transactionReference || ''}${d ? ' • Date: ' + d : ''}`;
      }
      if ('chequeNumber' in details && details.chequeNumber) {
        return `${details.bankName || 'Bank'} • Chq: ${details.chequeNumber} • Chq Date: ${details.chequeDate || ''}${d ? ' • Date: ' + d : ''}`;
      }
      if ('mobileNumber' in details && details.mobileNumber) {
        return `${details.provider || 'Mobile Wallet'} • ${details.mobileNumber} • TID: ${details.transactionId || ''}${d ? ' • Date: ' + d : ''}`;
      }
    }

    if (detailStr && typeof detailStr === 'string' && detailStr.trim()) {
      try {
        const parsed = JSON.parse(detailStr);
        if (typeof parsed === 'object' && parsed !== null) {
          const d = parsed.paymentDate || fallbackDate;
          if ('accountNumber' in parsed && parsed.accountNumber) {
            return `${parsed.bankName || 'Bank'} • Acc: ${parsed.accountNumber} • Ref: ${parsed.transactionReference || ''}${d ? ' • Date: ' + d : ''}`;
          }
          if ('chequeNumber' in parsed && parsed.chequeNumber) {
            return `${parsed.bankName || 'Bank'} • Chq: ${parsed.chequeNumber} • Chq Date: ${parsed.chequeDate || ''}${d ? ' • Date: ' + d : ''}`;
          }
          if ('mobileNumber' in parsed && parsed.mobileNumber) {
            return `${parsed.provider || 'Mobile Wallet'} • ${parsed.mobileNumber} • TID: ${parsed.transactionId || ''}${d ? ' • Date: ' + d : ''}`;
          }
        }
      } catch {
        // String format
      }

      if (fallbackDate && !detailStr.includes('Date:')) {
        return `${detailStr} • Date: ${fallbackDate}`;
      }
      return detailStr;
    }

    return '';
  }
}
