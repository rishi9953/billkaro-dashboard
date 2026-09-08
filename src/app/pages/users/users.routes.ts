import { Routes } from '@angular/router';
import { UsersComponent } from './users.component';

export const USERS_ROUTES: Routes = [
  { path: '', component: UsersComponent },
  {
    path: ':userId',
    loadComponent: () =>
      import('./user-dashboard/user-dashboard.component').then(
        (m) => m.UserDashboardComponent,
      ),
  },
];
