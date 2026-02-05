import { Injectable } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'billkaro_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _theme: Theme = 'light';

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === 'light' || stored === 'dark') {
      this._theme = stored;
    }
    this.applyToDocument();
  }

  get theme(): Theme {
    return this._theme;
  }

  get isDark(): boolean {
    return this._theme === 'dark';
  }

  setTheme(value: Theme): void {
    if (this._theme === value) return;
    this._theme = value;
    localStorage.setItem(STORAGE_KEY, value);
    this.applyToDocument();
  }

  toggleTheme(): void {
    this.setTheme(this._theme === 'light' ? 'dark' : 'light');
  }

  private applyToDocument(): void {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${this._theme}`);
  }
}
