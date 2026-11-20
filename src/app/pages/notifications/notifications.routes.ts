import { Routes } from '@angular/router';
import { NotificationsListComponent } from './notifications-list/notifications-list.component';

export const NOTIFICATION_ROUTES: Routes = [
  {
    path: '',
    component: NotificationsListComponent
  }
];
