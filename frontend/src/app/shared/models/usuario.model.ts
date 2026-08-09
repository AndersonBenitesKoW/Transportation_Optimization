/**
 * Modelos del dominio Usuarios.
 *
 * Se distinguen dos conceptos que antes compartian el nombre `Usuario` en
 * archivos distintos con campos divergentes:
 *  - `Usuario`       -> registro persistido en la base de datos.
 *  - `UsuarioSesion` -> perfil de la sesion autenticada en el navegador.
 */
export interface Usuario {
  id?: string;
  nombre: string;
  email: string;
  password?: string;
  telefono?: string;
  rol: string;
  id_conductor?: string;
  ref?: string;
}

export type RolUsuario = 'ADMIN' | 'CONDUCTOR';

export interface UsuarioSesion {
  uid: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
  empresa?: string;
  telefono?: string;
  ref?: string;
}

export interface LoginResponse {
  status: string;
  token?: string;
  usuario?: UsuarioSesion;
  mensaje?: string;
}
