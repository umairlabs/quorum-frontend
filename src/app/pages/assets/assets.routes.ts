import { Routes } from '@angular/router';

export const ASSET_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./asset-list/asset-list.component').then((m) => m.AssetListComponent)
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./asset-create/asset-create.component').then((m) => m.AssetCreateComponent)
  },
  {
    path: 'request',
    loadComponent: () =>
      import('./request-asset/request-asset.component').then((m) => m.RequestAssetComponent)
  },
  {
    path: 'purchases',
    loadComponent: () =>
      import('./purchase-search/purchase-search.component').then((m) => m.PurchaseSearchComponent)
  },
  {
    path: 'purchases/search',
    loadComponent: () =>
      import('./purchase-search/purchase-search.component').then((m) => m.PurchaseSearchComponent)
  },
  {
    path: 'purchases/create',
    loadComponent: () =>
      import('./purchase-create/purchase-create.component').then((m) => m.PurchaseCreateComponent)
  },
  {
    path: 'inventory/:groupId',
    loadComponent: () =>
      import('./components/inventory-asset-detail/inventory-asset-detail.component').then((m) => m.InventoryAssetDetailComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./asset-edit/asset-edit.component').then((m) => m.AssetEditComponent)
  },
  {
    path: ':id/assign',
    loadComponent: () =>
      import('./asset-assign/asset-assign.component').then((m) => m.AssetAssignComponent)
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./asset-detail/asset-detail.component').then((m) => m.AssetDetailComponent)
  }
];
