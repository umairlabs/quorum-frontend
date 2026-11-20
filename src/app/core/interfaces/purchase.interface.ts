import { Asset } from './asset.interface';
import { Supplier } from './supplier.interface';

export type PurchaseStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatus  = 'UNPAID'  | 'PARTIAL'   | 'PAID';

export type PaymentMethodType = 'BANK_TRANSFER' | 'CHEQUE' | 'MOBILE_WALLET' | 'CASH';

export interface BankTransferDetails {
  bankName: string;
  accountTitle?: string;
  accountNumber: string;
  transactionReference: string;
  paymentDate: string;
}

export interface ChequeDetails {
  bankName: string;
  accountTitle?: string;
  chequeNumber: string;
  chequeDate: string;
  paymentDate: string;
}

export interface MobileWalletDetails {
  provider: 'JazzCash' | 'Easypaisa';
  mobileNumber: string;
  accountHolderName?: string;
  transactionId: string;
  paymentDate: string;
}

export type PaymentDetails = BankTransferDetails | ChequeDetails | MobileWalletDetails | Record<string, any>;

export interface Payment {
  id: string;
  displayId?: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethodType | string;
  paymentMethod?: PaymentMethodType | string;
  payment_method?: string;
  paymentDetails?: PaymentDetails;
  payment_details?: PaymentDetails;
  paymentMethodDetail?: string;
  payment_method_detail?: string;
  reference: string;
  invoiceNumber: string;
  notes?: string;
}

export interface PaymentCreate {
  amount: number;
  paymentDate: string;
  method: PaymentMethodType | string;
  paymentMethod?: PaymentMethodType | string;
  payment_method?: string;
  paymentDetails?: PaymentDetails;
  payment_details?: PaymentDetails;
  paymentMethodDetail?: string;
  payment_method_detail?: string;
  reference?: string;
  notes?: string;
}

export interface Purchase {
  id: string;
  displayId?: string;
  purchaseNumber: string;
  asset: Asset | string;       // asset object (detail) or asset ID (list)
  supplier: Supplier | string; // supplier object or supplier ID
  quantity: number;
  purchasePrice: number;
  totalAmount: number;         // purchasePrice x quantity
  paidAmount: number;
  remainingAmount: number;     // totalAmount - paidAmount
  purchaseDate: string;
  status: PurchaseStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethodType | string;
  payment_method?: string;
  paymentDetails?: PaymentDetails;
  payment_details?: PaymentDetails;
  paymentMethodDetail?: string;
  payment_method_detail?: string;
  payments?: Payment[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseCreate {
  assetId: string;
  supplierId: string;
  quantity: number;
  purchasePrice: number;
  paidAmount?: number;
  paymentMethod?: PaymentMethodType | string;
  payment_method?: string;
  paymentDetails?: PaymentDetails;
  payment_details?: PaymentDetails;
  paymentMethodDetail?: string;
  payment_method_detail?: string;
  purchaseDate: string;
  notes?: string;
}

export interface PurchaseUpdate {
  quantity?: number;
  purchasePrice?: number;
  paidAmount?: number;
  paymentMethod?: PaymentMethodType | string;
  payment_method?: string;
  paymentDetails?: PaymentDetails;
  payment_details?: PaymentDetails;
  paymentMethodDetail?: string;
  payment_method_detail?: string;
  purchaseDate?: string;
  status?: PurchaseStatus;
  notes?: string;
}

// For asset search/dropdown in purchase form
export interface AssetSearchResult {
  id: string;
  name: string;
  category: string;
}
