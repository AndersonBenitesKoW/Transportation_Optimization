import { Component, HostListener, inject } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../core/services/theme.service';
import { IconComponent } from '../../shared/ui/icon.component';

@Component({
  selector: 'app-publico-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, IconComponent],
  templateUrl: './publico.html',
  styleUrl: './publico.css'
})
export class PublicoLayout {
  readonly themeService = inject(ThemeService);
  sun = 'sun';
  moon = 'moon';
  menu = 'menu';
  x = 'x';

  menuAbierto = false;
  scrolled = false;

  @HostListener('window:scroll')
  onScroll() { this.scrolled = window.scrollY > 20; }

  toggleMenu() { this.menuAbierto = !this.menuAbierto; }
  cerrarMenu() { this.menuAbierto = false; }
  toggleTema() { this.themeService.toggleTheme(); }
}
