import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { IconComponent } from '../../../components/icon.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {
  arrowLeft = 'arrow-left';
  eye = 'eye';
  eyeOff = 'eye-off';
  circleCheck = 'circle-check';
  truck = 'truck';

  private authService = inject(AuthService);
  private router = inject(Router);

  formData = { nombre: '', email: '', empresa: '', telefono: '', password: '', confirmPassword: '', rol: 'CONDUCTOR' };
  submitted = false; registrado = false; cargando = false;
  errores: Record<string, string> = {};
  mostrarPassword = false; mostrarConfirm = false;

  get fortalezaPassword(): number {
    const p = this.formData.password; let s = 0;
    if (p.length >= 6) s++; if (p.length >= 10) s++; if (/[A-Z]/.test(p)) s++; if (/[0-9]/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
    return Math.min(s, 5);
  }
  get fortalezaColor(): string { return ['#EF4444','#F59E0B','#F59E0B','#22C55E','#22C55E','#22C55E'][this.fortalezaPassword]; }
  get fortalezaTexto(): string { return ['','Debil','Regular','Buena','Fuerte','Muy Fuerte'][this.fortalezaPassword]; }

  validar(): boolean {
    this.errores = {};
    if (!this.formData.nombre.trim()) this.errores['nombre'] = 'El nombre es obligatorio.';
    if (!/^[\w.-]+@[\w.-]+\.\w{2,}$/.test(this.formData.email)) this.errores['email'] = 'Ingresa un email valido.';
    if (!this.formData.empresa.trim()) this.errores['empresa'] = 'La empresa es obligatoria.';
    if (!/^\d{9,}$/.test(this.formData.telefono)) this.errores['telefono'] = 'Telefono valido (min 9 digitos).';
    if (this.formData.password.length < 6) this.errores['password'] = 'Minimo 6 caracteres.';
    if (this.formData.password !== this.formData.confirmPassword) this.errores['confirmPassword'] = 'No coinciden.';
    return Object.keys(this.errores).length === 0;
  }

  registrar() {
    this.submitted = true;
    if (!this.validar()) return;
    this.cargando = true;
    this.authService.register(this.formData).subscribe({
      next: (r: any) => {
        this.cargando = false;
        if (r.status === 'success') {
          this.registrado = true;
          const destino = this.formData.rol === 'CONDUCTOR' ? '/conductor' : '/admin/dashboard';
          setTimeout(() => this.router.navigate([destino]), 2000);
        } else this.errores['general'] = 'Error al registrar';
      },
      error: () => { this.cargando = false; this.errores['general'] = 'Error. El email podria estar en uso.'; }
    });
  }

  getValido(c: string): boolean { return this.submitted && !this.errores[c] && !!(this.formData as any)[c]; }
  getInvalido(c: string): boolean { return this.submitted && !!this.errores[c]; }
}
