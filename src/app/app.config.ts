import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';

import { routes } from './app.routes';
import { authTokenInterceptor } from './pages/admin-auth/auth-token.interceptor';

// Handle GitHub Pages query string routing (from 404.html redirect)
if (typeof window !== 'undefined' && window.location.search.includes('?/')) {
  const path = window.location.search.replace('?/', '').split('&')[0].replace(/~and~/g, '&');
  const hash = window.location.hash;
  window.history.replaceState(null, '', path + hash);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
    withInterceptorsFromDi(),
    withInterceptors([authTokenInterceptor])
  )
  ]
};
