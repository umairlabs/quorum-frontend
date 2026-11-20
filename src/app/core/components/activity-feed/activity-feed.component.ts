import { Component, input, InputSignal, signal, computed, Signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityItem } from '../../interfaces/dashboard.interface';

@Component({
  selector: 'app-activity-feed',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './activity-feed.component.html'
})
export class ActivityFeedComponent {
  public readonly items: InputSignal<ActivityItem[]> = input<ActivityItem[]>([]);

  protected readonly isExpanded: WritableSignal<boolean> = signal<boolean>(false);

  protected readonly displayedItems: Signal<ActivityItem[]> = computed(() => {
    const list = this.items() || [];
    return this.isExpanded() ? list : list.slice(0, 7);
  });

  protected toggleExpanded(): void {
    this.isExpanded.update(v => !v);
  }

  protected getIcon(item: ActivityItem): string {
    const t = (item.type || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();
    if (t.includes('assign') || desc.includes('assigned')) return 'assignment_ind';
    if (t.includes('return') || desc.includes('returned')) return 'assignment_return';
    if (t.includes('ticket') || t.includes('maint') || desc.includes('ticket')) return 'build';
    if (t.includes('purchase') || desc.includes('purchase')) return 'shopping_cart';
    return 'notifications';
  }

  protected getBadgeStyle(item: ActivityItem): { bg: string; text: string; iconColor: string } {
    const t = (item.type || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();
    if (t.includes('assign') || desc.includes('assigned')) {
      return { bg: 'bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', iconColor: 'text-blue-600' };
    }
    if (t.includes('return') || desc.includes('returned')) {
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', iconColor: 'text-emerald-600' };
    }
    if (t.includes('ticket') || t.includes('maint') || desc.includes('ticket')) {
      return { bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', iconColor: 'text-amber-600' };
    }
    return { bg: 'bg-primary/10', text: 'text-primary', iconColor: 'text-primary' };
  }
}
