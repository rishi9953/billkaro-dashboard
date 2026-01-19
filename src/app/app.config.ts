import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { routes } from './app.routes';

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
    provideHttpClient(withInterceptorsFromDi())
  ]
};
