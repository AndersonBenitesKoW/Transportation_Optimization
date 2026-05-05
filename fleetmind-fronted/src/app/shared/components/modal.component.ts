import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen()" (click)="onClose.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ title() }}</h3>
          <button (click)="onClose.emit()">×</button>
        </div>
        <div class="modal-body">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
    }
    .modal-content { background: white; padding: 0; border-radius: 8px; max-width: 500px; width: 90%; }
    .modal-header { display: flex; justify-content: space-between; padding: 16px; border-bottom: 1px solid #eee; }
    .modal-body { padding: 16px; }
  `]
})
export class ModalComponent {
  isOpen = input<boolean>(false);
  title = input<string>('');
  onClose = output<void>();
}