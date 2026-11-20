import { Routes } from '@angular/router';

export const DEPRECIATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./depreciation-list/depreciation-list.component').then(
        (m) => m.DepreciationListComponent
      ),
  },
];
