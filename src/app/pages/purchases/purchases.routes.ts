import { Routes } from '@angular/router';

export const PURCHASE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./purchase-list/purchase-list.component').then((m) => m.PurchaseListComponent)
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./purchase-detail/purchase-detail.component').then((m) => m.PurchaseDetailComponent)
  },
  {
    path: 'suppliers/:id',
    loadComponent: () =>
      import('./supplier-detail/supplier-detail.component').then((m) => m.SupplierDetailComponent)
  },
  {
    path: 'suppliers/:id/pay',
    loadComponent: () =>
      import('./supplier-pay/supplier-pay.component').then((m) => m.SupplierPayComponent)
  }
];
