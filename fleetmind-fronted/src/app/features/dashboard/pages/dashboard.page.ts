import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardContainerComponent } from '../components/dashboard-container/dashboard-container.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, DashboardContainerComponent],
  template: `
    <app-dashboard-container />
  `
})
export class DashboardPageComponent {}