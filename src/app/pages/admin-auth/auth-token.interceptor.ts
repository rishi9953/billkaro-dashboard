import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AdminAuthService } from './admin-auth.service';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AdminAuthService);
  const token = auth.getAccessToken();
  if (token && !req.headers.has('Authorization')) {
    const normalizedToken = token.replace(/^Bearer\s+/i, '').trim();
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${normalizedToken}` },
    });
  }
  return next(req);
};
