import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage, ToastType } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
})
export class ToastComponent {
  protected readonly toastService = inject(ToastService);

  protected getIcon(type: ToastType): string {
    const icons: Record<ToastType, string> = {
      success: 'check_circle',
      error:   'error',
      warning: 'warning',
      info:    'info',
    };
    return icons[type] ?? 'info';
  }

  // Soft, crisp icon badge container for clean contrast on white cards
  protected getIconBadgeClasses(type: ToastType): string {
    const classes: Record<ToastType, string> = {
      success: 'bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/25',
      error:   'bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/25',
      warning: 'bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/25',
      info:    'bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/25',
    };
    return classes[type] ?? classes['info'];
  }
}
