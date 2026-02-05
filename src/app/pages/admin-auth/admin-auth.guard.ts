import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router, UrlTree } from '@angular/router';
import { AdminAuthService } from './admin-auth.service';

function redirectToAuth(router: Router): UrlTree {
  return router.parseUrl('/admin/login');
}

export const adminAuthGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AdminAuthService);
  if (auth.isLoggedIn()) return true;
  return redirectToAuth(router);
};

export const adminAuthChildGuard: CanActivateChildFn = () => {
  const router = inject(Router);
  const auth = inject(AdminAuthService);
  if (auth.isLoggedIn()) return true;
  return redirectToAuth(router);
};

