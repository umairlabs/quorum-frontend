import { Component, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { LoginCredentials } from '@core/interfaces/auth.interface';
import { AuthApisService } from '@core/services/api/auth-apis.service';
import { LoginFormComponent } from '../components/login-form/login-form.component';
import { LoginCharactersComponent } from '../components/login-characters/login-characters.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [LoginFormComponent, LoginCharactersComponent],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  private readonly authApisService = inject(AuthApisService);
  private readonly router = inject(Router);

  protected readonly isLoading = signal<boolean>(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  // Character interaction state
  protected readonly focusField = signal<'none' | 'email' | 'password'>('none');
  protected readonly showPassword = signal<boolean>(false);
  protected readonly textLength = signal<number>(0);
  protected readonly cursorX = signal<number>(window.innerWidth / 2);
  protected readonly cursorY = signal<number>(window.innerHeight / 2);

  @HostListener('window:mousemove', ['$event'])
  public onMouseMove(event: MouseEvent): void {
    this.cursorX.set(event.clientX);
    this.cursorY.set(event.clientY);
  }

  protected onFocusChange(field: 'none' | 'email' | 'password'): void {
    this.focusField.set(field);
  }

  protected onShowPasswordChange(show: boolean): void {
    this.showPassword.set(show);
  }

  protected onTextLengthChange(length: number): void {
    this.textLength.set(length);
  }

  protected onSubmit(credentials: LoginCredentials): void {
    this.isLoading.set(true);
    this.serverError.set(null);
    this.successMessage.set(null);

    this.authApisService.onLogin(credentials)
      .pipe(
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (response) => {
          const destination = response.must_change_password
            ? '/auth/change-password'
            : '/dashboard';

          this.successMessage.set('Login successful! Redirecting…');

          setTimeout(() => {
            this.router.navigate([destination]);
          }, 1000);
        },
        error: (err) => {
          if (err.status === 0) {
            this.serverError.set('Unable to connect to backend server. Please make sure the server is running.');
          } else {
            const errorMsg = err.error?.detail || err.error?.message || 'Login failed. Please check your credentials or try again.';
            this.serverError.set(errorMsg);
          }
        }
      });
  }
}
