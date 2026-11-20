import { inject, Injectable, signal, WritableSignal, computed, Signal, OnDestroy } from '@angular/core';
import { NotificationApisService } from './notification-apis.service';
import { NotificationFilter, NotificationItem } from '../../../core/interfaces/notification.interface';
import { ToastService } from '../../../core/services/toast.service';
import { PaginatedResponse } from '../../../core/interfaces/api-response.interface';
import { AuthApisService } from '../../../core/services/api/auth-apis.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private readonly apiService: NotificationApisService = inject(NotificationApisService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly authService: AuthApisService = inject(AuthApisService);

  public readonly notifications: WritableSignal<NotificationItem[]> = signal<NotificationItem[]>([]);
  public readonly unreadCount: WritableSignal<number> = signal<number>(0);
  public readonly activeFilter: WritableSignal<NotificationFilter> = signal<NotificationFilter>('ALL');
  public readonly isLoading: WritableSignal<boolean> = signal<boolean>(false);

  // --- Notification sound + polling setup ---
  private static readonly DEFAULT_SOUND_PATH = '/assets/sounds/notification-bell.wav';
  private static readonly STORAGE_KEY_SOUND = 'astra_notification_sound';

  public readonly selectedSoundPath: WritableSignal<string> = signal<string>(this.getInitialSoundPath());

  private audioCtx: AudioContext | null = null;
  private pollingIntervalId: ReturnType<typeof setInterval> | null = null;
  private readonly POLL_INTERVAL_MS = 10000; // 10 seconds
  private lastSoundPlayedAt: number = 0;
  private readonly SOUND_COOLDOWN_MS = 3000;

  private isEmployee(): boolean {
    const role = (
      this.authService.currentUser()?.role ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('role') : '') ||
      ''
    ).toUpperCase().replace(/\s+/g, '_');
    return role === 'EMPLOYEE';
  }

  public readonly filteredNotifications: Signal<NotificationItem[]> = computed(() => {
    let list: NotificationItem[] = this.notifications();

    // Only employees have WARRANTY/SYSTEM filtered out — technicians see all their notifications
    if (this.isEmployee()) {
      list = list.filter((item: NotificationItem) => {
        const typeUpper = (item.type || '').toUpperCase();
        return typeUpper !== 'WARRANTY' && typeUpper !== 'SYSTEM';
      });
    }

    const filter: NotificationFilter = this.activeFilter();

    if (filter === 'ALL') {
      return list;
    }
    if (filter === 'UNREAD') {
      return list.filter((item: NotificationItem) => !item.isRead);
    }
    if (filter === 'READ') {
      return list.filter((item: NotificationItem) => item.isRead);
    }
    // REQUESTS is a client-side virtual filter: ASSETS notifications whose
    // subType starts with 'ASSET_REQUEST_' or 'ASSET_RECEIPT_'
    if (filter === 'REQUESTS') {
      return list.filter((item: NotificationItem) => {
        const sub = (item.subType || '').toUpperCase();
        return sub.startsWith('ASSET_REQUEST_') || sub.startsWith('ASSET_RECEIPT_');
      });
    }
    return list.filter((item: NotificationItem) => (item.type || '').toUpperCase() === filter.toUpperCase());
  });

  constructor() {
    this.setupAudioUnlock();
    this.loadInitialData();
    // Start background polling — checks every 10 seconds for new notifications.
    this.startPolling();
  }

  public loadInitialData(): void {
    this.fetchUnreadCount();
    this.loadNotifications();
  }

  public checkNow(forcePlaySound: boolean = false): void {
    this.checkForNewNotifications(forcePlaySound);
  }

  public triggerImmediateNotification(playSound: boolean = true): void {
    if (playSound) {
      this.playNotificationSound();
    }
    this.fetchUnreadCount();
    this.loadNotifications();
  }

  private startPolling(): void {
    this.pollingIntervalId = setInterval(() => {
      this.checkForNewNotifications();
    }, this.POLL_INTERVAL_MS);
  }

  public checkForNewNotifications(forcePlaySound: boolean = false): void {
    const previousCount = this.unreadCount();

    this.apiService.getUnreadCount().subscribe({
      next: (res) => {
        const newCount = res?.unreadCount ?? res?.unread_count ?? 0;

        if (newCount > previousCount || forcePlaySound) {
          this.playNotificationSound();
          this.loadNotifications();
        }

        this.unreadCount.set(newCount);
      },
      error: (err) => {
        console.error('[NotificationService] Polling error:', err);
      }
    });
  }

  private setupAudioUnlock(): void {
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.getAudioContext();
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };
      window.addEventListener('click', unlockAudio, { once: true, passive: true });
      window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
      window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioCtx = new AudioCtx();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => { });
      }
    } catch {
      // ignore
    }
    return this.audioCtx;
  }

  // Crystal-clear synthesized notification bell chime via Web Audio API
  private playSynthesizedChime(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Note 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.25, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.45);

      // Note 2: B5 (987.77 Hz) - harmonic chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.1);
      gain2.gain.setValueAtTime(0, now + 0.1);
      gain2.gain.linearRampToValueAtTime(0.3, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.7);
    } catch (e) {
      console.warn('[NotificationService] Synth chime fallback error:', e);
    }
  }

  private getInitialSoundPath(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(NotificationService.STORAGE_KEY_SOUND);
      if (saved) {
        return saved;
      }
    }
    return NotificationService.DEFAULT_SOUND_PATH;
  }

  public setSelectedSound(soundPath: string): void {
    this.selectedSoundPath.set(soundPath);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(NotificationService.STORAGE_KEY_SOUND, soundPath);
    }
  }

  public playSoundPreview(soundPath: string): void {
    try {
      const audio = new Audio(soundPath);
      audio.volume = 0.75;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[NotificationService] Sound preview play failed, falling back to Web Audio API:', err);
          this.playSynthesizedChime();
        });
      }
    } catch {
      this.playSynthesizedChime();
    }
  }

  public playNotificationSound(): void {
    const now = Date.now();
    if (now - this.lastSoundPlayedAt < this.SOUND_COOLDOWN_MS) {
      return;
    }
    this.lastSoundPlayedAt = now;

    try {
      const soundPath = this.selectedSoundPath() || NotificationService.DEFAULT_SOUND_PATH;
      const audio = new Audio(soundPath);
      audio.volume = 0.75;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[NotificationService] Audio element play failed, falling back to Web Audio API:', err);
          this.playSynthesizedChime();
        });
      }
    } catch {
      this.playSynthesizedChime();
    }
  }

  public ngOnDestroy(): void {
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
    }
  }

  public fetchUnreadCount(): void {
    this.apiService.getUnreadCount().subscribe({
      next: (res) => {
        this.unreadCount.set(res?.unreadCount ?? res?.unread_count ?? 0);
      },
      error: (err) => {
        console.error('[NotificationService] Error fetching unread count:', err);
      }
    });
  }

  public loadNotifications(): void {
    this.isLoading.set(true);
    this.apiService.getNotifications().subscribe({
      next: (res) => {
        let items: NotificationItem[] = [];
        if (Array.isArray(res)) {
          items = res;
        } else if (res && Array.isArray((res as PaginatedResponse<NotificationItem>).results)) {
          items = (res as PaginatedResponse<NotificationItem>).results;
        }
        this.notifications.set(items);
        this.recalculateUnreadCount(items);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('[NotificationService] Error fetching notifications:', err);
        this.isLoading.set(false);
      }
    });
  }

  public setFilter(filter: NotificationFilter): void {
    this.activeFilter.set(filter);
  }

  public markAsRead(id: string): void {
    const currentList: NotificationItem[] = this.notifications();
    const targetItem: NotificationItem | undefined = currentList.find((n: NotificationItem) => n.id === id);

    if (!targetItem || targetItem.isRead) return;

    const updatedList: NotificationItem[] = currentList.map((n: NotificationItem) =>
      n.id === id ? { ...n, isRead: true } : n
    );
    this.notifications.set(updatedList);
    this.recalculateUnreadCount(updatedList);

    this.apiService.markAsRead(id).subscribe({
      error: (err) => {
        console.error('[NotificationService] Failed to mark read:', err);
        this.notifications.set(currentList);
        this.recalculateUnreadCount(currentList);
        this.toastService.presentToast('Failed to mark notification as read.', 2500, 'error');
      }
    });
  }

  public markAsUnread(id: string): void {
    const currentList: NotificationItem[] = this.notifications();
    const targetItem: NotificationItem | undefined = currentList.find((n: NotificationItem) => n.id === id);

    if (!targetItem || !targetItem.isRead) return;

    const updatedList: NotificationItem[] = currentList.map((n: NotificationItem) =>
      n.id === id ? { ...n, isRead: false } : n
    );
    this.notifications.set(updatedList);
    this.recalculateUnreadCount(updatedList);

    this.apiService.markAsUnread(id).subscribe({
      error: (err) => {
        console.error('[NotificationService] Failed to mark unread:', err);
        this.notifications.set(currentList);
        this.recalculateUnreadCount(currentList);
        this.toastService.presentToast('Failed to mark notification as unread.', 2500, 'error');
      }
    });
  }

  public markAllAsRead(): void {
    const currentList: NotificationItem[] = this.notifications();
    const hasUnread: boolean = currentList.some((n: NotificationItem) => !n.isRead);

    if (!hasUnread) return;

    const updatedList: NotificationItem[] = currentList.map((n: NotificationItem) => ({ ...n, isRead: true }));
    this.notifications.set(updatedList);
    this.unreadCount.set(0);

    this.apiService.markAllAsRead().subscribe({
      next: () => {
        this.toastService.presentToast('All notifications marked as read.', 2000, 'success');
      },
      error: (err) => {
        console.error('[NotificationService] Failed to mark all as read:', err);
        this.notifications.set(currentList);
        this.recalculateUnreadCount(currentList);
        this.toastService.presentToast('Failed to mark all notifications as read.', 2500, 'error');
      }
    });
  }

  public deleteNotification(id: string): void {
    const currentList: NotificationItem[] = this.notifications();
    const updatedList: NotificationItem[] = currentList.filter((n: NotificationItem) => n.id !== id);

    this.notifications.set(updatedList);
    this.recalculateUnreadCount(updatedList);

    this.apiService.deleteNotification(id).subscribe({
      next: () => {
        this.toastService.presentToast('Notification deleted successfully.', 2000, 'success');
      },
      error: (err) => {
        console.error('[NotificationService] Failed to delete notification:', err);
        this.notifications.set(currentList);
        this.recalculateUnreadCount(currentList);
        this.toastService.presentToast('Failed to delete notification.', 2500, 'error');
      }
    });
  }

  public deleteAllNotifications(): void {
    const currentList: NotificationItem[] = this.notifications();
    const previousUnreadCount = this.unreadCount();
    if (currentList.length === 0 && previousUnreadCount === 0) return;

    this.notifications.set([]);
    this.unreadCount.set(0);

    this.apiService.deleteAllNotifications().subscribe({
      next: () => {
        this.toastService.presentToast('All notifications deleted successfully.', 2000, 'success');
      },
      error: (err) => {
        console.error('[NotificationService] Failed to delete all notifications:', err);
        this.notifications.set(currentList);
        this.unreadCount.set(previousUnreadCount);
        this.toastService.presentToast('Failed to clear notifications.', 2500, 'error');
      }
    });
  }

  private recalculateUnreadCount(items: NotificationItem[]): void {
    let list = items;
    // Only employees have WARRANTY/SYSTEM filtered out
    if (this.isEmployee()) {
      list = list.filter((n: NotificationItem) => {
        const typeUpper = (n.type || '').toUpperCase();
        return typeUpper !== 'WARRANTY' && typeUpper !== 'SYSTEM';
      });
    }
    const count: number = list.filter((n: NotificationItem) => !n.isRead).length;
    this.unreadCount.set(count);
  }
}