import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chatbot-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chatbot-page">
      <h2>Chatbot IA</h2>
      <p>Interacción con el sistema de IA próximamente.</p>
    </div>
  `
})
export class ChatbotPageComponent {}