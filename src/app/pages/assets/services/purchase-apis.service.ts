import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiCallService } from '../../../core/services/api/base-api-call.service';
import { Purchase, PurchaseCreate, PurchaseUpdate, AssetSearchResult } from '../../../core/interfaces/purchase.interface';
import { Supplier, SupplierCreate } from '../../../core/interfaces/supplier.interface';
import { PaginatedResponse } from '../../../core/interfaces/api-response.interface';

@Injectable({
  providedIn: 'root'
})
export class PurchaseApisService extends BaseApiCallService {

  // Purchase endpoints
  public getPurchases(params?: Record<string, unknown>): Observable<PaginatedResponse<Purchase>> {
    return this.get<PaginatedResponse<Purchase>>('purchases/', params);
  }

  public getPurchaseById(id: string): Observable<Purchase> {
    return this.get<Purchase>(`purchases/${id}/`);
  }

  public createPurchase(payload: PurchaseCreate): Observable<Purchase> {
    return this.post<Purchase>('purchases/', payload);
  }

  public updatePurchase(id: string, payload: PurchaseUpdate): Observable<Purchase> {
    return this.patch<Purchase>(`purchases/${id}/`, payload);
  }

  public deletePurchase(id: string): Observable<void> {
    return this.delete<void>(`purchases/${id}/`);
  }

  // Supplier endpoints
  public getSuppliers(params?: Record<string, unknown>): Observable<PaginatedResponse<Supplier>> {
    return this.get<PaginatedResponse<Supplier>>('purchases/suppliers/', params);
  }

  public getSupplierById(id: string): Observable<Supplier> {
    return this.get<Supplier>(`purchases/suppliers/${id}/`);
  }

  public createSupplier(payload: SupplierCreate): Observable<Supplier> {
    return this.post<Supplier>('purchases/suppliers/', payload);
  }

  public updateSupplier(id: string, payload: Partial<Supplier>): Observable<Supplier> {
    return this.patch<Supplier>(`purchases/suppliers/${id}/`, payload);
  }

  public deleteSupplier(id: string): Observable<void> {
    return this.delete<void>(`purchases/suppliers/${id}/`);
  }

  // Asset search for purchase form
  public searchAssets(query: string): Observable<AssetSearchResult[]> {
    return this.get<AssetSearchResult[]>('assets/search/', { q: query });
  }

  // Payment installment endpoints
  public getPayments(purchaseId: string): Observable<any[]> {
    return this.get<any[]>(`purchases/${purchaseId}/payments/`);
  }

  public addPayment(purchaseId: string, payload: any): Observable<Purchase> {
    return this.post<Purchase>(`purchases/${purchaseId}/payments/`, payload);
  }

  // Supplier unified payment
  public paySupplier(supplierId: string, payload: any): Observable<any> {
    return this.post<any>(`purchases/suppliers/${supplierId}/pay/`, payload);
  }

  // Supplier payment history
  public getSupplierPaymentHistory(supplierId: string): Observable<any[]> {
    return this.get<any[]>(`purchases/suppliers/${supplierId}/pay/`);
  }

  // Outstanding purchases
  public getOutstandingPurchases(params?: Record<string, unknown>): Observable<any> {
    return this.get<any>('purchases/outstanding/', params);
  }

  // Purchases stats summary
  public getPurchaseSummary(): Observable<{ totalPurchases: number; totalSpent: number; totalOutstanding: number }> {
    return this.get<any>('purchases/summary/');
  }

  // Download/View PDF Invoice (returns Blob)
  public downloadInvoice(paymentId: string): Observable<Blob> {
    return this.http.get(`${this.apiURL}/purchases/payments/${paymentId}/invoice/`, {
      responseType: 'blob'
    });
  }
}
