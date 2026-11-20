import { User } from './user.interface';
export { User };

export interface LoginCredentials {
  email: string;
  password: string;
}

// Django backend jo actual response deta hai (flat structure)
export interface AuthResponse {
  access: string;
  refresh: string;
  role: string;
  must_change_password: boolean;
  user: User;
}

export interface RefreshResponse {
  access: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_new_password: string;
}