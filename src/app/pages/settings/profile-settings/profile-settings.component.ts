import { Component, ElementRef, inject, OnInit, signal, ViewChild, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthApisService } from '../../../core/services/api/auth-apis.service';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { ToastService } from '../../../core/services/toast.service';
import { User } from '../../../core/interfaces/user.interface';

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  templateUrl: './profile-settings.component.html'
})
export class ProfileSettingsComponent implements OnInit {
  private readonly authService = inject(AuthApisService);
  private readonly toastService = inject(ToastService);

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  protected readonly currentUser: WritableSignal<User | null> = signal<User | null>(null);
  protected readonly avatarPreview: WritableSignal<string | null> = signal<string | null>(null);
  protected readonly nameValue: WritableSignal<string> = signal<string>('');
  protected readonly originalName: WritableSignal<string> = signal<string>('');
  protected readonly isSavingName: WritableSignal<boolean> = signal<boolean>(false);

  public ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.currentUser.set(user);
      const name = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || '';
      this.nameValue.set(name);
      this.originalName.set(name);

      if (user.avatarUrl) {
        this.avatarPreview.set(user.avatarUrl);
      }
    }
  }

  protected get nameValueModel(): string { return this.nameValue(); }
  protected set nameValueModel(v: string) { this.nameValue.set(v); }

  protected get nameChanged(): boolean {
    return this.nameValue().trim() !== this.originalName();
  }

  protected get avatarInitials(): string {
    const user = this.currentUser();
    if (!user) return '?';
    const name = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';
  }

  protected get displayRole(): string {
    const user = this.currentUser();
    if (!user?.role) return '—';
    return user.role
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c: string) => c.toUpperCase());
  }

  protected get displayEmail(): string {
    return this.currentUser()?.email || '—';
  }

  protected get isActive(): boolean {
    return this.currentUser()?.isActive ?? false;
  }

  protected onAvatarButtonClick(): void {
    this.fileInputRef.nativeElement.click();
  }

  protected onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      this.toastService.presentToast('Only JPG and PNG files are allowed.', 2500, 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.toastService.presentToast('File size must be under 2MB.', 2500, 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      this.avatarPreview.set(base64);

      // Persist karo taake refresh ke baad bhi yehi image dikhe
      this.authService.updateStoredUser({ avatarUrl: base64 });
      const updated = this.authService.currentUser();
      if (updated) {
        this.currentUser.set(updated);
      }
    };
    reader.readAsDataURL(file);
    this.toastService.presentToast('Profile image updated.', 2000, 'success');
  }

  protected onSaveName(): void {
    const name = this.nameValue().trim();
    if (!name || !this.nameChanged) return;

    this.isSavingName.set(true);

    const parts = name.split(' ');
    this.authService.updateStoredUser({
      fullName: name,
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || '',
    });

    const updated = this.authService.currentUser();
    if (updated) {
      this.currentUser.set(updated);
    }
    this.originalName.set(name);

    this.isSavingName.set(false);
    this.toastService.presentToast('Name updated successfully.', 2000, 'success');
  }
}