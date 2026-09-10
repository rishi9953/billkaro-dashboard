import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from './layout/dashboard-layout/dashboard-layout.component';
import { adminAuthChildGuard } from './pages/admin-auth/admin-auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/dashboard/home' },
  { path: 'login', pathMatch: 'full', redirectTo: '/admin/login' },
  { path: 'signup', pathMatch: 'full', redirectTo: '/admin/signup' },

  {
    path: 'admin',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/admin-auth/admin-login/admin-login.component').then(
            (m) => m.AdminLoginComponent
          ),
      },
      {
        path: 'signup',
        loadComponent: () =>
          import('./pages/admin-auth/admin-signup/admin-signup.component').then(
            (m) => m.AdminSignupComponent
          ),
      },
    ],
  },

  {
    path: '',
    component: DashboardLayoutComponent,
    canActivateChild: [adminAuthChildGuard],
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
      {
        path: 'services',
        loadComponent: () =>
          import('./services/services-list.component').then(
            (m) => m.ServicesListComponent
          ),
      },
      {
        path: 'payments',
        loadComponent: () =>
          import('./payments/payments-list.component').then(
            (m) => m.PaymentsListComponent
          ),
      },
      {
        path: 'wallet-cards',
        loadComponent: () =>
          import('./wallet-cards/wallet-cards-list.component').then(
            (m) => m.WalletCardsListComponent
          ),
      },
      {
        path: 'wallet-coupons',
        loadComponent: () =>
          import('./wallet-coupons/wallet-coupons-list.component').then(
            (m) => m.WalletCouponsListComponent
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./orders/orders-list.component').then(
            (m) => m.OrdersListComponent
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/admin-profile/admin-profile.component').then(
            (m) => m.AdminProfileComponent
          ),
      },
    ],
  },
  { path: '**', redirectTo: '/dashboard/home' },
];