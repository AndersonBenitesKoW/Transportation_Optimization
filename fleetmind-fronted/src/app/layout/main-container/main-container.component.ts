import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-main-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="main-content">
      <ng-content></ng-content>
    </main>
  `,
  styles: [`
    .main-content {
      margin-left: 250px;
      margin-top: 60px;
      padding: 20px;
      min-height: calc(100vh - 60px);
    }
  `]
})
export class MainContainerComponent {}