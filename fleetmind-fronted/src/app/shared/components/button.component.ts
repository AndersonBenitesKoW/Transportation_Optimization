import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [class]="variant()"
      [disabled]="disabled()"
      (click)="onClick.emit()"
    >
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    .primary { background: #007bff; color: white; }
    .secondary { background: #6c757d; color: white; }
    .danger { background: #dc3545; color: white; }
    button { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
  `]
})
export class ButtonComponent {
  variant = input<'primary' | 'secondary' | 'danger'>('primary');
  disabled = input<boolean>(false);
  onClick = output<void>();
}