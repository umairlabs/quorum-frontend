import { Component, input, InputSignal, OnInit, output, OutputEmitterRef, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoginCredentials } from '@core/interfaces/auth.interface';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login-form.component.html'
})
export class LoginFormComponent implements OnInit {
  public readonly isLoading: InputSignal<boolean> = input<boolean>(false);
  public readonly serverError: InputSignal<string | null> = input<string | null>(null);
  public readonly successMessage: InputSignal<string | null> = input<string | null>(null);

  public readonly formSubmit: OutputEmitterRef<LoginCredentials> = output<LoginCredentials>();
  public readonly focusChange: OutputEmitterRef<'none' | 'email' | 'password'> = output<'none' | 'email' | 'password'>();
  public readonly showPasswordChange: OutputEmitterRef<boolean> = output<boolean>();
  public readonly textLengthChange: OutputEmitterRef<number> = output<number>();

  private readonly fb = inject(FormBuilder);

  public loginForm!: FormGroup;
  public showPassword = false;
  public submitted = false;

  public ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: [
        '',
        [Validators.required, Validators.email, Validators.maxLength(254)]
      ],
      password: [
        '',
        [Validators.required, Validators.maxLength(100)]
      ]
    });

    this.loginForm.get('email')?.valueChanges.subscribe(val => {
      this.submitted = false;
      this.textLengthChange.emit((val || '').length);
    });

    this.loginForm.get('password')?.valueChanges.subscribe(() => {
      this.submitted = false;
    });
  }

  public get f(): FormGroup['controls'] {
    return this.loginForm.controls;
  }

  public togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
    this.showPasswordChange.emit(this.showPassword);
  }

  public onEmailFocus(): void {
    this.focusChange.emit('email');
    this.textLengthChange.emit((this.loginForm.get('email')?.value || '').length);
  }

  public onEmailBlur(): void {
    this.focusChange.emit('none');
  }

  public onPasswordFocus(): void {
    this.focusChange.emit('password');
  }

  public onPasswordBlur(): void {
    this.focusChange.emit('none');
  }

  public shouldShowEmailError(): boolean {
    return this.submitted && this.f['email'].invalid;
  }

  public shouldShowPasswordError(): boolean {
    return this.submitted && this.f['password'].invalid;
  }

  public onSubmit(): void {
    this.submitted = true;

    if (this.loginForm.invalid) {
      return;
    }

    const val = this.loginForm.value;
    this.formSubmit.emit({
      email: val.email,
      password: val.password
    });
  }
}
