import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {
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
    if (this.validar()) {
      this.registrado = true;
    }
  }

  getValido(campo: string): boolean {
    return this.submitted && !this.errores[campo] && !!this.formData[campo as keyof typeof this.formData];
  }

  getInvalido(campo: string): boolean {
    return this.submitted && !!this.errores[campo];
  }
}
