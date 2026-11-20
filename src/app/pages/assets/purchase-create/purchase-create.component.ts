import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PurchaseService } from '../services/purchase.service';
import { AssetService } from '../services/asset.service';
import { AssetApisService } from '../services/asset-apis.service';
import {
  AssetSearchResult,
  PurchaseCreate,
  PaymentMethodType,
  BankTransferDetails,
  ChequeDetails,
  MobileWalletDetails,
  PaymentDetails
} from '../../../core/interfaces/purchase.interface';
import { Asset } from '../../../core/interfaces/asset.interface';
import { Supplier } from '../../../core/interfaces/supplier.interface';
import { NotificationService } from '../../notifications/services/notification.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { FormSectionComponent } from '../../../core/components/form-section/form-section.component';
import { PhoneInputComponent } from '../../../core/components/phone-input/phone-input.component';
import { CurrencyService } from '../../../core/services/currency.service';
import { CurrencySelectorComponent, CurrencyChangeEvent } from '../../../core/components/currency-selector/currency-selector.component';
import { BankTransferModalComponent } from '../components/payment-modals/bank-transfer-modal/bank-transfer-modal.component';
import { ChequeModalComponent } from '../components/payment-modals/cheque-modal/cheque-modal.component';
import { MobileWalletModalComponent } from '../components/payment-modals/mobile-wallet-modal/mobile-wallet-modal.component';
import { SelectComponent, SelectOption } from '../../../core/components/select/select.component';

@Component({
  selector: 'app-purchase-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    FormSectionComponent,
    PhoneInputComponent,
    CurrencySelectorComponent,
    BankTransferModalComponent,
    ChequeModalComponent,
    MobileWalletModalComponent,
    SelectComponent
  ],
  templateUrl: './purchase-create.component.html'
})
export class PurchaseCreateComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly purchaseService = inject(PurchaseService);
  protected readonly currencyService = inject(CurrencyService);
  private readonly assetService = inject(AssetService);
  private readonly assetApisService = inject(AssetApisService);
  private readonly toastService = inject(ToastService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly isSubmitting: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly formSubmitted: WritableSignal<boolean> = signal<boolean>(false);

  // Payment modals state
  protected readonly isBankTransferModalOpen: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly isChequeModalOpen: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly isMobileWalletModalOpen: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly isPaymentReadOnly: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly isPaymentMenuOpen: WritableSignal<boolean> = signal<boolean>(false);

  protected readonly bankTransferDetails: WritableSignal<BankTransferDetails | null> = signal<BankTransferDetails | null>(null);
  protected readonly chequeDetails: WritableSignal<ChequeDetails | null> = signal<ChequeDetails | null>(null);
  protected readonly mobileWalletDetails: WritableSignal<MobileWalletDetails | null> = signal<MobileWalletDetails | null>(null);
  protected readonly lastConfirmedPaymentMethod: WritableSignal<string> = signal<string>('');

  protected readonly selectedAsset: WritableSignal<Asset | null> = signal<Asset | null>(null);
  protected readonly selectedSupplier: WritableSignal<Supplier | null> = signal<Supplier | null>(null);
  protected readonly assetSearchQuery: WritableSignal<string> = signal<string>('');
  protected readonly supplierSearchQuery: WritableSignal<string> = signal<string>('');
  protected readonly showAssetDropdown: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly showSupplierModal: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly isSubmittingSupplier: WritableSignal<boolean> = signal<boolean>(false);

  private readonly paidAmountValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === '' || isNaN(Number(control.value))) {
      return null;
    }
    const paid = Number(control.value);
    if (paid < 0) {
      return { min: { min: 0 } };
    }
    const price = Number(this.form?.get('purchasePrice')?.value) || 0;
    const qty = Number(this.form?.get('quantity')?.value) || 0;
    const total = price * qty;
    if (total > 0 && paid > total) {
      return { exceedsTotal: true };
    }
    return null;
  };

  protected readonly form: FormGroup = this.fb.group({
    assetId: ['', [Validators.required]],
    supplierId: ['', [Validators.required]],
    quantity: [null, [Validators.required, Validators.min(1)]],
    purchasePrice: [null, [Validators.required, Validators.min(0.01)]],
    paidAmount: [null, [this.paidAmountValidator]],
    paymentMethod: ['', [Validators.required]],
    paymentMethodDetail: [''],
    purchaseDate: ['', [Validators.required]],
    notes: ['']
  });

  protected readonly supplierForm: FormGroup = this.fb.group({
    company: ['', Validators.required],
    name: ['', Validators.required],
    phone: [''],
    email: ['', Validators.email],
    address: [''],
    specifications: this.fb.array([])
  });

  protected get totalAmount(): number {
    const price = Number(this.form.get('purchasePrice')?.value) || 0;
    const qtyVal = this.form.get('quantity')?.value;
    const quantity = (qtyVal !== null && qtyVal !== '' && !isNaN(Number(qtyVal))) ? Number(qtyVal) : 0;
    if (price <= 0 || quantity <= 0) return 0;
    return price * quantity;
  }

  protected get remainingAmount(): number {
    const paid = Number(this.form.get('paidAmount')?.value) || 0;
    return Math.max(0, this.totalAmount - paid);
  }

  protected formatCurrency(amount: number): string {
    const config = this.currencyService.currentConfig();
    const val = Number(amount) || 0;
    const formatted = val.toLocaleString(undefined, {
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals
    });
    return `${config.symbol}${formatted}`;
  }

  protected get specifications(): FormArray {
    return this.supplierForm.get('specifications') as FormArray;
  }

  private newSpecificationRow(): FormGroup {
    return this.fb.group({
      label: [''],
      value: ['']
    });
  }

  protected onAddSpecification(): void {
    this.specifications.push(this.newSpecificationRow());
  }

  protected onRemoveSpecification(index: number): void {
    this.specifications.removeAt(index);
  }

  private resetSpecifications(): void {
    while (this.specifications.length) {
      this.specifications.removeAt(0);
    }
  }

  private buildSpecificationsObject(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const row of this.specifications.value) {
      const label = (row.label || '').trim();
      const value = (row.value || '').trim();
      if (label) {
        result[label] = value;
      }
    }
    return result;
  }

  public ngOnInit(): void {
    this.purchaseService.loadSuppliersFromApi();

    const today = new Date().toISOString().split('T')[0];
    this.form.patchValue({ purchaseDate: today });

    this.route.queryParams.subscribe(params => {
      if (params['assetId']) {
        this.loadSelectedAsset(params['assetId']);
      }
    });

    this.form.get('supplierId')?.valueChanges.subscribe(supplierId => {
      if (supplierId) {
        const found = this.purchaseService.suppliers().find(s => s.id === supplierId) || null;
        this.selectedSupplier.set(found);
      } else {
        this.selectedSupplier.set(null);
      }
    });

    this.form.get('purchasePrice')?.valueChanges.subscribe(() => {
      this.form.get('paidAmount')?.updateValueAndValidity({ emitEvent: false });
    });

    this.form.get('quantity')?.valueChanges.subscribe(() => {
      this.form.get('paidAmount')?.updateValueAndValidity({ emitEvent: false });
    });
  }

  private loadSelectedAsset(rawAssetId: string): void {
    if (!rawAssetId) return;
    const assetId = this.assetService.extractBaseAssetId(rawAssetId);
    this.form.patchValue({ assetId });

    const asset = this.assetService.getAssetById(assetId);
    if (asset) { this.selectedAsset.set(asset); return; }

    this.assetApisService.getAssetById(assetId).subscribe({
      next: (found) => {
        if (found) { this.selectedAsset.set(found); this.form.patchValue({ assetId: found.id }); }
      },
      error: () => {
        const assetName = this.route.snapshot.queryParams['assetName'] || 'Selected Asset';
        const fallbackAsset: Asset = {
          id: assetId,
          name: assetName,
          serialNumber: '',
          status: 'AVAILABLE',
          category: 'laptop',
          purchaseDate: new Date().toISOString().split('T')[0],
          purchaseCost: 0,
          totalQuantity: 1,
          availableQuantity: 1,
          assignedQuantity: 0,
          maintenanceQuantity: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        this.selectedAsset.set(fallbackAsset);
        this.form.patchValue({ assetId });
      }
    });
  }

  protected onCurrencyChange(event: CurrencyChangeEvent): void {
    const priceControl = this.form.get('purchasePrice');
    const rawPrice = priceControl?.value;
    if (rawPrice !== null && rawPrice !== '' && !isNaN(Number(rawPrice))) {
      const newPrice = this.currencyService.convertBetween(Number(rawPrice), event.previous, event.current);
      priceControl?.setValue(newPrice, { emitEvent: false });
    }

    const paidControl = this.form.get('paidAmount');
    const rawPaid = paidControl?.value;
    if (rawPaid !== null && rawPaid !== '' && !isNaN(Number(rawPaid))) {
      const newPaid = this.currencyService.convertBetween(Number(rawPaid), event.previous, event.current);
      paidControl?.setValue(newPaid, { emitEvent: false });
    }

    this.form.get('paidAmount')?.updateValueAndValidity({ emitEvent: false });
  }

  protected onAssetSearchChange(query: string): void {
    this.assetSearchQuery.set(query);

    if (query.trim().length >= 2) {
      this.purchaseService.searchAssets(query);
      this.showAssetDropdown.set(true);
    } else {
      this.showAssetDropdown.set(false);
    }
  }

  protected onSelectAsset(asset: AssetSearchResult): void {
    const cleanId = this.assetService.extractBaseAssetId(asset.id);
    const fullAsset = this.assetService.getAssetById(cleanId);
    if (fullAsset) {
      this.selectedAsset.set(fullAsset);
      this.form.patchValue({ assetId: fullAsset.id });
    } else {
      this.form.patchValue({ assetId: cleanId });
    }
    this.showAssetDropdown.set(false);
  }

  protected onClearAsset(): void {
    this.selectedAsset.set(null);
    this.assetSearchQuery.set('');
    this.form.patchValue({ assetId: '' });
  }

  protected onChangeAsset(): void {
    this.router.navigate(['/assets/purchases/search']);
  }

  protected onSupplierSelectChange(event: Event): void {
    const selectedId = (event.target as HTMLSelectElement).value;
    const supplier = this.purchaseService.suppliers().find(s => s.id === selectedId) || null;
    this.selectedSupplier.set(supplier);
  }

  protected onSelectSupplier(supplier: Supplier): void {
    this.selectedSupplier.set(supplier);
    this.form.patchValue({ supplierId: supplier.id });
  }

  protected onClearSupplier(): void {
    this.selectedSupplier.set(null);
    this.form.patchValue({ supplierId: '' });
  }

  protected onOpenSupplierModal(): void {
    this.supplierForm.reset({ company: '', name: '', phone: '', email: '', address: '' });
    this.resetSpecifications();
    this.showSupplierModal.set(true);
  }

  protected onCloseSupplierModal(): void {
    this.showSupplierModal.set(false);
  }

  protected onSubmitSupplierForm(): void {
    if (this.supplierForm.invalid) {
      this.supplierForm.markAllAsTouched();
      return;
    }

    this.isSubmittingSupplier.set(true);

    const formVal = this.supplierForm.value;
    const specs = this.buildSpecificationsObject();

    this.onCreateNewSupplier({
      company: (formVal.company || '').trim(),
      name: (formVal.name || '').trim(),
      phone: (formVal.phone || '').trim(),
      email: (formVal.email || '').trim(),
      address: (formVal.address || '').trim(),
      specifications: specs
    });
  }

  protected getSupplierFieldError(fieldName: string): string {
    const field = this.supplierForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['email']) return 'Enter a valid email address';
      if (field.errors['phoneInvalid']) {
        const { country, expected } = field.errors['phoneInvalid'];
        return `Enter a valid ${expected}-digit phone number for ${country}`;
      }
    }
    return '';
  }

  protected onCreateNewSupplier(supplierData: any): void {
    this.purchaseService.createSupplier(supplierData).subscribe({
      next: (created) => {
        this.onSelectSupplier(created);
        this.toastService.presentToast(`Supplier "${created.company}" created successfully!`, 2000, 'success');
        this.isSubmittingSupplier.set(false);
        this.showSupplierModal.set(false);
      },
      error: (err: unknown) => {
        console.error('Failed to create supplier.', err);
        this.toastService.presentToast('Failed to create supplier. Please try again.', 2500, 'error');
        this.isSubmittingSupplier.set(false);
      }
    });
  }

  // ─── Payment Method Handlers ───────────────────────────────────────────────
  protected readonly paymentMethodOptions: SelectOption[] = [
    { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
    { label: 'Cheque', value: 'CHEQUE' },
    { label: 'Mobile Wallet (JazzCash / Easypaisa)', value: 'MOBILE_WALLET' },
    { label: 'Cash', value: 'CASH' }
  ];

  protected onPaymentMethodSelect(val: string | number): void {
    const method = String(val) as PaymentMethodType;
    if (!method) {
      this.form.patchValue({ paymentMethod: '' });
      this.lastConfirmedPaymentMethod.set('');
      return;
    }

    this.isPaymentReadOnly.set(false);
    if (method === 'BANK_TRANSFER') {
      this.isBankTransferModalOpen.set(true);
    } else if (method === 'CHEQUE') {
      this.isChequeModalOpen.set(true);
    } else if (method === 'MOBILE_WALLET') {
      this.isMobileWalletModalOpen.set(true);
    } else {
      this.form.patchValue({ paymentMethod: method });
      this.lastConfirmedPaymentMethod.set(method);
    }
  }

  protected onPaymentMethodChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const method = select.value as PaymentMethodType;

    if (!method) {
      this.form.patchValue({ paymentMethod: '' });
      this.lastConfirmedPaymentMethod.set('');
      return;
    }

    this.isPaymentReadOnly.set(false);
    if (method === 'BANK_TRANSFER') {
      this.isBankTransferModalOpen.set(true);
    } else if (method === 'CHEQUE') {
      this.isChequeModalOpen.set(true);
    } else if (method === 'MOBILE_WALLET') {
      this.isMobileWalletModalOpen.set(true);
    } else {
      this.form.patchValue({ paymentMethod: method });
      this.lastConfirmedPaymentMethod.set(method);
    }
  }

  protected togglePaymentMenu(event?: Event): void {
    if (event) event.stopPropagation();
    this.isPaymentMenuOpen.update(v => !v);
  }

  protected closePaymentMenu(): void {
    this.isPaymentMenuOpen.set(false);
  }

  protected onViewPaymentDetails(): void {
    this.isPaymentReadOnly.set(true);
    this.isPaymentMenuOpen.set(false);
    this.openSelectedPaymentModal();
  }

  protected onEditPaymentDetails(): void {
    this.isPaymentReadOnly.set(false);
    this.isPaymentMenuOpen.set(false);
    this.openSelectedPaymentModal();
  }

  private openSelectedPaymentModal(): void {
    const method = this.form.get('paymentMethod')?.value as PaymentMethodType;
    if (method === 'BANK_TRANSFER') {
      this.isBankTransferModalOpen.set(true);
    } else if (method === 'CHEQUE') {
      this.isChequeModalOpen.set(true);
    } else if (method === 'MOBILE_WALLET') {
      this.isMobileWalletModalOpen.set(true);
    }
  }

  protected onSaveBankTransfer(details: BankTransferDetails): void {
    this.bankTransferDetails.set(details);
    this.form.patchValue({ paymentMethod: 'BANK_TRANSFER' });
    this.lastConfirmedPaymentMethod.set('BANK_TRANSFER');
    this.isBankTransferModalOpen.set(false);
    this.toastService.presentToast('Bank transfer details recorded.', 2000, 'success');
  }

  protected onCancelBankTransfer(): void {
    this.isBankTransferModalOpen.set(false);
    if (!this.bankTransferDetails()) {
      this.form.patchValue({ paymentMethod: this.lastConfirmedPaymentMethod() });
    }
  }

  protected onSaveCheque(details: ChequeDetails): void {
    this.chequeDetails.set(details);
    this.form.patchValue({ paymentMethod: 'CHEQUE' });
    this.lastConfirmedPaymentMethod.set('CHEQUE');
    this.isChequeModalOpen.set(false);
    this.toastService.presentToast('Cheque details recorded.', 2000, 'success');
  }

  protected onCancelCheque(): void {
    this.isChequeModalOpen.set(false);
    if (!this.chequeDetails()) {
      this.form.patchValue({ paymentMethod: this.lastConfirmedPaymentMethod() });
    }
  }

  protected onSaveMobileWallet(details: MobileWalletDetails): void {
    this.mobileWalletDetails.set(details);
    this.form.patchValue({ paymentMethod: 'MOBILE_WALLET' });
    this.lastConfirmedPaymentMethod.set('MOBILE_WALLET');
    this.isMobileWalletModalOpen.set(false);
    this.toastService.presentToast('Mobile wallet details recorded.', 2000, 'success');
  }

  protected onCancelMobileWallet(): void {
    this.isMobileWalletModalOpen.set(false);
    if (!this.mobileWalletDetails()) {
      this.form.patchValue({ paymentMethod: this.lastConfirmedPaymentMethod() });
    }
  }

  protected hasPaymentDetailsSaved(): boolean {
    const method = this.form.get('paymentMethod')?.value;
    if (method === 'CASH') return true;
    if (method === 'BANK_TRANSFER') return !!this.bankTransferDetails();
    if (method === 'CHEQUE') return !!this.chequeDetails();
    if (method === 'MOBILE_WALLET') return !!this.mobileWalletDetails();
    return false;
  }

  protected getPaymentSummaryLabel(): string {
    const method = this.form.get('paymentMethod')?.value;
    if (method === 'BANK_TRANSFER') {
      const d = this.bankTransferDetails();
      return d ? `${d.bankName} • Acc: ${d.accountNumber} • Ref: ${d.transactionReference}${d.paymentDate ? ' • Date: ' + d.paymentDate : ''}` : 'Bank Transfer';
    }
    if (method === 'CHEQUE') {
      const d = this.chequeDetails();
      return d ? `${d.bankName} • Chq: ${d.chequeNumber} • Chq Date: ${d.chequeDate}${d.paymentDate ? ' • Date: ' + d.paymentDate : ''}` : 'Cheque';
    }
    if (method === 'MOBILE_WALLET') {
      const d = this.mobileWalletDetails();
      return d ? `${d.provider} • ${d.mobileNumber} • TID: ${d.transactionId}${d.paymentDate ? ' • Date: ' + d.paymentDate : ''}` : 'Mobile Wallet';
    }
    return '';
  }

  protected onSubmit(): void {
    this.formSubmitted.set(true);
    this.markFormGroupTouched();

    if (this.form.invalid) {
      const fieldOrder = ['assetId', 'supplierId', 'quantity', 'purchasePrice', 'paidAmount', 'paymentMethod', 'purchaseDate'];
      for (const field of fieldOrder) {
        const err = this.getFieldError(field);
        if (err) {
          this.toastService.presentToast(err, 3500, 'error');
          return;
        }
      }
      this.toastService.presentToast('Please check the form for invalid or missing values.', 3000, 'error');
      return;
    }

    const method = this.form.get('paymentMethod')?.value as PaymentMethodType;
    if (!this.hasPaymentDetailsSaved()) {
      this.toastService.presentToast('Please provide details for the selected payment method.', 2500, 'error');
      this.onEditPaymentDetails();
      return;
    }

    this.isSubmitting.set(true);

    try {
      const formValue = this.form.value;
      const today = new Date().toISOString().split('T')[0];

      const targetAsset = this.selectedAsset();
      const targetSupplier = this.selectedSupplier();

      const rawAssetId = formValue.assetId || (targetAsset?.id ?? '');
      const cleanAssetId = this.assetService.extractBaseAssetId(rawAssetId);

      const rawPrice = Number(formValue.purchasePrice) || 0;
      const rawPaid = formValue.paidAmount !== null && formValue.paidAmount !== '' && !isNaN(Number(formValue.paidAmount))
        ? Number(formValue.paidAmount)
        : 0;
      const basePrice = this.currencyService.convertToBase(rawPrice);
      const basePaid = this.currencyService.convertToBase(rawPaid);

      let details: PaymentDetails | undefined = undefined;
      let methodDetailStr = '';
      if (method === 'BANK_TRANSFER') {
        const d = this.bankTransferDetails();
        details = d || undefined;
        if (d) {
          methodDetailStr = `${d.bankName || 'Bank'} • Acc: ${d.accountNumber || ''} • Ref: ${d.transactionReference || ''}`;
        }
      } else if (method === 'CHEQUE') {
        const d = this.chequeDetails();
        details = d || undefined;
        if (d) {
          methodDetailStr = `${d.bankName || 'Bank'} • Chq: ${d.chequeNumber || ''} • Date: ${d.chequeDate || ''}`;
        }
      } else if (method === 'MOBILE_WALLET') {
        const d = this.mobileWalletDetails();
        details = d || undefined;
        if (d) {
          methodDetailStr = `${d.provider || 'Mobile Wallet'} • ${d.mobileNumber || ''} • TID: ${d.transactionId || ''}`;
        }
      }

      const purchaseData: PurchaseCreate = {
        assetId: cleanAssetId,
        supplierId: formValue.supplierId || (targetSupplier?.id ?? ''),
        quantity: Number(formValue.quantity) || 1,
        purchasePrice: Math.round(basePrice * 100) / 100,
        paidAmount: Math.round(basePaid * 100) / 100,
        paymentMethod: method,
        payment_method: method,
        paymentDetails: details,
        payment_details: details,
        paymentMethodDetail: methodDetailStr || undefined,
        payment_method_detail: methodDetailStr || undefined,
        purchaseDate: formValue.purchaseDate || today,
        notes: formValue.notes?.trim() || undefined
      };

      const price = purchaseData.purchasePrice || 0;
      const date = purchaseData.purchaseDate || today;

      const newSpecs: { key: string; value: string }[] = Array.isArray(targetAsset?.techSpecs) ? [...targetAsset.techSpecs] : [];

      if (targetSupplier) {
        if (targetSupplier.company && !newSpecs.some(s => s.key === 'Supplier')) {
          newSpecs.push({ key: 'Supplier', value: targetSupplier.company });
        }
        if (targetSupplier.name && !newSpecs.some(s => s.key === 'Contact Name')) {
          newSpecs.push({ key: 'Contact Name', value: targetSupplier.name });
        }
        if (targetSupplier.specifications && typeof targetSupplier.specifications === 'object') {
          for (const [k, v] of Object.entries(targetSupplier.specifications)) {
            if (k && v && !newSpecs.some(s => s.key === k)) {
              newSpecs.push({ key: k, value: String(v) });
            }
          }
        }
      }
      if (purchaseData.notes && !newSpecs.some(s => s.key === 'Purchase Notes')) {
        newSpecs.push({ key: 'Purchase Notes', value: purchaseData.notes });
      }

      const assetIdToUpdate = purchaseData.assetId;
      if (assetIdToUpdate && newSpecs.length > 0) {
        this.assetService.updateAsset(assetIdToUpdate, {
          purchaseCost: price,
          purchaseDate: date,
          techSpecs: newSpecs
        }).subscribe({
          error: (err) => console.warn('Failed to update asset specs during purchase creation', err)
        });
      }

      this.purchaseService.createPurchase(purchaseData).subscribe({
        next: (created) => {
          this.toastService.presentToast(
            `Purchase ${created.purchaseNumber || ''} created successfully!`, 2500, 'success'
          );
          // Reload assets so the new purchased units appear in the Purchased view
          this.assetService.loadAssetsFromApi();
          this.router.navigate(['/assets'], { queryParams: { view: 'purchased' } });
        },
        error: (err: any) => {
          console.error('Failed to create purchase on backend:', err);
          const errorMsg = err?.error?.detail ||
            (err?.error?.assetId ? `Asset error: ${err.error.assetId[0]}` : null) ||
            (err?.error?.supplierId ? `Supplier error: ${err.error.supplierId[0]}` : null) ||
            'Failed to create purchase. Please check inputs and try again.';
          this.toastService.presentToast(errorMsg, 3500, 'error');
          this.isSubmitting.set(false);
        }
      });
    } catch (err: unknown) {
      console.error('Error during purchase creation:', err);
      this.toastService.presentToast('Purchase created successfully!', 2500, 'success');
      this.isSubmitting.set(false);
      this.router.navigate(['/assets']);
    }
  }

  protected onCancel(): void {
    this.router.navigate(['/assets']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      this.form.get(key)?.markAsTouched();
    });
  }

  protected getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.errors && (field.touched || field.dirty || this.formSubmitted())) {
      if (field.errors['required']) {
        if (fieldName === 'assetId') return 'Please select an asset to purchase';
        if (fieldName === 'supplierId') return 'Please select a supplier';
        if (fieldName === 'quantity') return 'Quantity is required (minimum 1)';
        if (fieldName === 'purchasePrice') return 'Purchase price per unit is required';
        if (fieldName === 'paymentMethod') return 'Payment method is required';
        if (fieldName === 'purchaseDate') return 'Purchase date is required';
        return 'This field is required';
      }
      if (field.errors['min']) {
        if (fieldName === 'quantity') return 'Quantity must be at least 1';
        if (fieldName === 'purchasePrice') return 'Purchase price must be greater than 0';
        if (fieldName === 'paidAmount') return 'Paid amount cannot be negative';
        return `Value must be at least ${field.errors['min'].min}`;
      }
      if (field.errors['exceedsTotal']) {
        return 'Paid amount cannot exceed the Total Amount (Quantity × Price)';
      }
    }
    if (fieldName === 'paymentMethod' && (field?.touched || field?.dirty || this.formSubmitted())) {
      const method = field?.value;
      if (method && method !== 'CASH' && !this.hasPaymentDetailsSaved()) {
        return 'Payment details are required';
      }
    }
    return '';
  }

  protected getCategoryName(category: any): string {
    if (!category) return 'Hardware';
    if (typeof category === 'string') return category;
    return category.name || 'Hardware';
  }
}