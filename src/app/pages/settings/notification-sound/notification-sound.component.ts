import { Component, inject, computed, Signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { NotificationService } from '../../notifications/services/notification.service';
import { ToastService } from '../../../core/services/toast.service';

export interface SoundOption {
  id: string;
  name: string;
  description: string;
  path: string;
}

@Component({
  selector: 'app-notification-sound',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  templateUrl: './notification-sound.component.html'
})
export class NotificationSoundComponent {
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly router: Router = inject(Router);
  private readonly location: Location = inject(Location);

  public readonly soundOptions: SoundOption[] = [
    {
      id: 'bell',
      name: 'Classic Bell',
      description: 'Crisp, standard notification bell sound.',
      path: '/assets/sounds/notification-bell.wav'
    },
    {
      id: 'access-allowed',
      name: 'Access Allowed',
      description: 'Modern access granted alert chime.',
      path: '/assets/sounds/mixkit-access-allowed-tone-2869.wav'
    },
    {
      id: 'doorbell',
      name: 'Doorbell',
      description: 'Warm, familiar doorbell chime.',
      path: '/assets/sounds/mixkit-doorbell-tone-2864.wav'
    },
    {
      id: 'doorbell-soft',
      name: 'Soft Doorbell',
      description: 'Gentle, soft doorbell tone.',
      path: '/assets/sounds/mixkit-doorbell-tone-2864 (1).wav'
    },
    {
      id: 'pop',
      name: 'Pop Tone',
      description: 'Quick, friendly pop sound effect.',
      path: '/assets/sounds/mixkit-long-pop-2358.wav'
    },
    {
      id: 'interface-back',
      name: 'Interface Click',
      description: 'Subtle software interface tone.',
      path: '/assets/sounds/mixkit-software-interface-back-2575.wav'
    },
    {
      id: 'success-tone',
      name: 'Success Chime',
      description: 'Uplifting success notification chime.',
      path: '/assets/sounds/mixkit-success-software-tone-2865.wav'
    }
  ];

  public readonly currentSoundPath: Signal<string> = computed(() => this.notificationService.selectedSoundPath());

  protected isSelected(sound: SoundOption): boolean {
    return this.currentSoundPath() === sound.path;
  }

  protected selectSound(sound: SoundOption): void {
    if (this.isSelected(sound)) {
      return;
    }
    this.notificationService.setSelectedSound(sound.path);
    this.notificationService.playSoundPreview(sound.path);
    this.toastService.presentToast(`Notification sound set to "${sound.name}".`, 2500, 'success');
  }

  protected previewSound(event: MouseEvent, sound: SoundOption): void {
    event.stopPropagation();
    this.notificationService.playSoundPreview(sound.path);
  }

  protected goBack(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/settings']);
    }
  }
}
