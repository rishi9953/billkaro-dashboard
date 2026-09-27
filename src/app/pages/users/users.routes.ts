import { Routes } from '@angular/router';
import { UsersComponent } from './users.component';

export const USERS_ROUTES: Routes = [
  { path: '', component: UsersComponent },
  {
    path: ':userId/orders/:orderId',
    loadComponent: () =>
      import('./user-dashboard/order-details/order-details.component').then(
        (m) => m.OrderDetailsComponent,
      ),
  },
  {
    path: ':userId',
    loadComponent: () =>
      import('./user-dashboard/user-dashboard.component').then(
        (m) => m.UserDashboardComponent,
      ),
  },
];
