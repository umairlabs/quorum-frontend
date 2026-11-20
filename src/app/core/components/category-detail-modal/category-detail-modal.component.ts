import { Component, input, output, InputSignal, OutputEmitterRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { AssetCategory } from '../../interfaces/asset-category.interface';
import { getCategoryIcon } from '../../utils/asset-icon.util';

@Component({
  selector: 'app-category-detail-modal',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  templateUrl: './category-detail-modal.component.html'
})
export class CategoryDetailModalComponent {
  public readonly isOpen: InputSignal<boolean> = input<boolean>(false);
  public readonly category: InputSignal<AssetCategory | null> = input<AssetCategory | null>(null);
  public readonly close: OutputEmitterRef<void> = output<void>();

  protected onClose(): void {
    this.close.emit();
  }

  protected getCategoryIconName(category: AssetCategory | null): string {
    if (!category) return 'category';
    return getCategoryIcon(category);
  }
}
