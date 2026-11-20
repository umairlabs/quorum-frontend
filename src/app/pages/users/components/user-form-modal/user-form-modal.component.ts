import { Component, effect, input, output, signal, InputSignal, OutputEmitterRef, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User, UserFormInput, UserRole, UserStatus } from '../../../../core/interfaces/user.interface';
import { ModalComponent } from '../../../../core/components/modal/modal.component';

@Component({
  selector: 'app-user-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './user-form-modal.component.html'
})
export class UserFormModalComponent {
  public readonly isOpen: InputSignal<boolean> = input<boolean>(false);
  public readonly mode: InputSignal<'create' | 'edit'> = input<'create' | 'edit'>('create');
  public readonly initialUser: InputSignal<User | null> = input<User | null>(null);

  public readonly close: OutputEmitterRef<void> = output<void>();
  public readonly save: OutputEmitterRef<UserFormInput> = output<UserFormInput>();

  protected readonly fullName: WritableSignal<string> = signal<string>('');
  protected readonly email: WritableSignal<string> = signal<string>('');
  protected readonly password: WritableSignal<string> = signal<string>('');
  protected readonly role: WritableSignal<UserRole> = signal<UserRole>('OPERATIONS_MANAGER');
  protected readonly submitAttempted: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly showPassword: WritableSignal<boolean> = signal<boolean>(false);

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        const u = this.initialUser();
        if (this.mode() === 'edit' && u) {
          this.fullName.set(u.fullName || `${u.firstName} ${u.lastName}`.trim());
          this.email.set(u.email || '');
          this.role.set(this.normalizeRole(u.role));
        } else {
          this.resetForm();
        }
        this.password.set('');
        this.submitAttempted.set(false);
      }
    });
  }

  private resetForm(): void {
    this.fullName.set('');
    this.email.set('');
    this.role.set('OPERATIONS_MANAGER');
  }

  private normalizeRole(role: string | undefined): UserRole {
    if (!role) return 'OPERATIONS_MANAGER';
    const r = role.toUpperCase().replace(/\s+/g, '_');
    if (r === 'SYSTEM_ADMINISTRATOR' || r === 'SYSTEM_ADMIN' || r === 'SUPER_ADMIN' || r === 'ADMIN') {
      return 'SYSTEM_ADMIN';
    }
    if (r === 'OPERATIONS_MANAGER' || r === 'MANAGER') {
      return 'OPERATIONS_MANAGER';
    }
    if (r === 'EXTERNAL_TECHNICIAN' || r === 'TECHNICIAN') {
      return 'EXTERNAL_TECHNICIAN';
    }
    return 'OPERATIONS_MANAGER';
  }

  protected get isEmailValid(): boolean {
    const val = this.email().trim();
    if (!val) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  }

  protected get isPasswordValid(): boolean {
    if (this.mode() !== 'create') return true; // not required in edit mode
    return !!this.password().trim();
  }

  protected onSubmit(): void {
    this.submitAttempted.set(true);

    if (!this.fullName().trim() || !this.isEmailValid || !this.role() || !this.isPasswordValid) {
      return;
    }

    this.save.emit({
      fullName: this.fullName().trim(),
      email: this.email().trim(),
      role: this.role(),
      status: this.initialUser() ? (this.initialUser()!.isActive ? 'ACTIVE' : 'INACTIVE') : 'ACTIVE',
      password: this.password().trim() ? this.password().trim() : undefined
    });
  }

  protected onClose(): void {
    this.close.emit();
  }
}