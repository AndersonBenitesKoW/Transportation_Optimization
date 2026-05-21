import { Injectable, inject, signal, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  private _isDark = signal(true);

  readonly isDark = this._isDark.asReadonly();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('fleetmind_theme');
      if (saved === 'light') {
        this._isDark.set(false);
      } else if (saved === 'dark') {
        this._isDark.set(true);
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this._isDark.set(prefersDark);
      }
      this.applyTheme();
    }
  }

  toggleTheme(): void {
    this._isDark.update(v => !v);
    this.applyTheme();
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('fleetmind_theme', this._isDark() ? 'dark' : 'light');
    }
  }

  private applyTheme(): void {
    if (isPlatformBrowser(this.platformId)) {
      const html = document.documentElement;
      if (this._isDark()) {
        html.classList.remove('light');
        html.style.colorScheme = 'dark';
      } else {
        html.classList.add('light');
        html.style.colorScheme = 'light';
      }
    }
  }
}
