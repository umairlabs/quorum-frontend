import { Component, computed, inject, input, InputSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StatCard } from '../../../../core/interfaces/dashboard.interface';

@Component({
  selector: 'app-stat-cards-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stat-cards-grid.component.html'
})
export class StatCardsGridComponent {
  private readonly router = inject(Router);

  public readonly cards: InputSignal<StatCard[]> = input<StatCard[]>([]);

  protected readonly gridColsClass = computed(() => {
    const len = this.cards().length;
    if (len === 4) {
      return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
    }
    if (len === 5) {
      return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5';
    }
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6';
  });

  protected onCardClick(card: StatCard): void {
    if (card.route) {
      this.router.navigate([card.route]);
    }
  }
}
