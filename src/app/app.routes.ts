import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from './layout/dashboard-layout/dashboard-layout.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/dashboard/home' },

  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./pages/dashboard/dashboard.routes').then(
            (m) => m.DASHBOARD_ROUTES
          ),
      },
      {
        path: 'subscriptions',
        loadComponent: () =>
          import('./subscriptions/subscriptions-list.component').then(
            (m) => m.SubscriptionsListComponent
          ),
      },
    ],
  },
];