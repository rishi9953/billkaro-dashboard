import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AdminAuthService } from './admin-auth.service';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AdminAuthService);
  const token = auth.getAccessToken();

  // Do not attach stale Bearer token to login API.
  const isLoginRequest =
    req.url.includes('/auth/admin/login') ||
    req.url.endsWith('/api/auth/admin/login');

  if (token && !req.headers.has('Authorization') && !isLoginRequest) {
    const normalizedToken = token.replace(/^Bearer\s+/i, '').trim();
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${normalizedToken}` },
    });
  }
  return next(req);
};
