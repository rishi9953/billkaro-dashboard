import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router, UrlTree } from '@angular/router';
import { AdminAuthService } from './admin-auth.service';

function redirectToAuth(router: Router): UrlTree {
  return router.parseUrl('/admin/login');
}

/** Paths sub_admin is not allowed to access (redirect to dashboard home). */
const SUB_ADMIN_FORBIDDEN_PATHS = ['/dashboard/sub-admins', '/payments', '/subscriptions'];

export const adminAuthGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AdminAuthService);
  if (auth.isLoggedIn()) return true;
  return redirectToAuth(router);
};

export const adminAuthChildGuard: CanActivateChildFn = (childRoute, state) => {
  const router = inject(Router);
  const auth = inject(AdminAuthService);
  if (!auth.isLoggedIn()) return redirectToAuth(router);
  
  if (auth.isSubAdmin()) {
    const url = state.url.split('?')[0];
    const isForbidden = SUB_ADMIN_FORBIDDEN_PATHS.some((p) => url === p || url.startsWith(p + '/'));
    console.log('[RouteGuard] sub_admin accessing:', url, 'isForbidden:', isForbidden);
    if (isForbidden) {
      console.log('[RouteGuard] Redirecting sub_admin from', url, 'to /dashboard/home');
      return router.parseUrl('/dashboard/home');
    }
  }
  return true;
};

