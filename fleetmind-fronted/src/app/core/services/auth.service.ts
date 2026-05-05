import { Injectable, signal } from '@angular/core';
import { HttpService } from './http.service';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  currentUser = signal<User | null>(null);

  constructor(private httpService: HttpService) {
    this.loadUserFromToken();
  }

  login(credentials: { email: string; password: string }) {
    return this.httpService.post<{ token: string; user: User }>('/auth/login', credentials);
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    this.currentUser.set(null);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  private loadUserFromToken() {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (token) {
      // Decode token to get user info (simplified)
      this.currentUser.set({ id: '1', name: 'User', email: 'user@example.com', role: 'admin' });
    }
  }
}