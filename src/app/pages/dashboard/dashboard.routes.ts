import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';

export const DASHBOARD_ROUTES: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: DashboardComponent },
  {
    path: 'users',
    loadChildren: () =>
      import('../users/users.routes').then((m) => m.USERS_ROUTES)
  },
  {
    path: 'sub-admins',
    loadComponent: () =>
      import('../sub-admins/sub-admins-list.component').then(
        (m) => m.SubAdminsListComponent
      ),
  }
];
