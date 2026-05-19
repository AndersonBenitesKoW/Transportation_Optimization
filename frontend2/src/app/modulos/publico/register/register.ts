import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  
  formData = {
    nombre: '',
    email: '',
    empresa: '',
    telefono: '',
    password: '',
    confirmPassword: ''
  };

  submitted = false;
  registrado = false;
  cargando = false;
  errores: Record<string, string> = {};

  validar(): boolean {
    this.errores = {};

    if (!this.formData.nombre.trim()) {
      this.errores['nombre'] = 'El nombre completo es obligatorio.';
    }
    if (!/^[\w.-]+@[\w.-]+\.\w{2,}$/.test(this.formData.email)) {
      this.errores['email'] = 'Ingresa un correo electrónico válido.';
    }
    if (!this.formData.empresa.trim()) {
      this.errores['empresa'] = 'El nombre de la empresa es obligatorio.';
    }
    if (!/^\d{9,}$/.test(this.formData.telefono)) {
      this.errores['telefono'] = 'Ingresa un teléfono válido (mínimo 9 dígitos).';
    }
    if (this.formData.password.length < 6) {
      this.errores['password'] = 'La contraseña debe tener al menos 6 caracteres.';
    }
    if (this.formData.password !== this.formData.confirmPassword) {
      this.errores['confirmPassword'] = 'Las contraseñas no coinciden.';
    }

    return Object.keys(this.errores).length === 0;
  }

  registrar() {
    this.submitted = true;
    
    if (!this.validar()) {
      return;
    }

    this.cargando = true;

    // Registro con AuthService
    this.authService.register(this.formData).subscribe({
      next: (response) => {
        this.cargando = false;
        if (response.status === 'success') {
          this.registrado = true;
          // Redirigir después de 2 segundos
          setTimeout(() => {
            this.router.navigate(['/admin/dashboard']);
          }, 2000);
        } else {
          this.errores['general'] = 'Error al registrar usuario';
        }
      },
      error: (err) => {
        this.cargando = false;
        this.errores['general'] = 'Error al registrar. El email podría estar en uso.';
        console.error('Error registro:', err);
      }
    });
  }

  getValido(campo: string): boolean {
    return this.submitted && !this.errores[campo] && !!this.formData[campo as keyof typeof this.formData];
  }

  getInvalido(campo: string): boolean {
    return this.submitted && !!this.errores[campo];
  }
}
