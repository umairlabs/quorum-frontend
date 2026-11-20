import { Injectable, signal, WritableSignal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;
  private readonly MAX_ACTIVE_TOASTS = 3;
  private readonly recentToastTimes = new Map<string, number>();

  public readonly toasts: WritableSignal<ToastMessage[]> = signal<ToastMessage[]>([]);

  public presentToast(
    message: string,
    duration: number = 3000,
    color: string = 'dark'
  ): void {
    if (!message?.trim()) return;

    // Map Ionic / custom color names to our toast types
    const typeMap: Record<string, ToastType> = {
      success: 'success',
      error:   'error',
      danger:  'error',
      warning: 'warning',
      dark:    'info',
      primary: 'info',
    };
    const type: ToastType = typeMap[color] ?? 'info';
    const trimmedMsg = message.trim();
    const key = `${type}:${trimmedMsg}`;
    const now = Date.now();

    // ─── De-duplication: Do not stack duplicate identical toasts within 2 seconds ───
    const lastTime = this.recentToastTimes.get(key);
    if (lastTime && now - lastTime < 2000) {
      return;
    }

    const existing = this.toasts().find(t => t.message === trimmedMsg && t.type === type);
    if (existing) {
      return;
    }

    this.recentToastTimes.set(key, now);
    const id = ++this.counter;

    const toastDuration = duration && duration >= 3000 ? duration : 3000;

    // Limit maximum simultaneous toasts on screen to prevent awkward stacking
    this.toasts.update(curr => {
      const updated = [...curr, { id, message: trimmedMsg, type, duration: toastDuration }];
      return updated.length > this.MAX_ACTIVE_TOASTS ? updated.slice(-this.MAX_ACTIVE_TOASTS) : updated;
    });

    setTimeout(() => this.dismiss(id), toastDuration);
  }

  public dismiss(id: number): void {
    this.toasts.update(curr => curr.filter(t => t.id !== id));
  }
}
