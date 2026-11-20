import {
  Component,
  input,
  InputSignal,
  TemplateRef,
  contentChild,
  computed,
  Signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TableColumn {
  key: string;
  label: string;
  cssClass?: string;
  headerCssClass?: string;
  sortable?: boolean;
}

export interface PaginationConfig {
  currentPage: Signal<number>;
  totalPages: Signal<number>;
  totalCount: Signal<number>;
  pageSize: Signal<number>;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onSetPage: (page: number) => void;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './data-table.component.html'
})
export class DataTableComponent<T = any> {
  public readonly data: InputSignal<T[]> = input.required<T[]>();
  public readonly columns: InputSignal<TableColumn[]> = input.required<TableColumn[]>();
  public readonly pagination: InputSignal<PaginationConfig | null> = input<PaginationConfig | null>(null);
  public readonly trackByFn: InputSignal<((item: T) => any) | null> = input<((item: T) => any) | null>(null);
  public readonly getRowClass: InputSignal<(item: T) => string> = input<(item: T) => string>(() => '');
  public readonly rowHeight: InputSignal<string | null> = input<string | null>(null);
  public readonly paginationWrapperClass: InputSignal<string> = input<string>('hidden sm:flex sm:items-center sm:justify-between');
  public readonly tableClass: InputSignal<string> = input<string>('');

  // Content projection for custom cell templates
  public readonly cellTemplate = contentChild.required<TemplateRef<any>>('cellTemplate');

  protected getPageNumbers(): number[] {
    const pagination = this.pagination();
    if (!pagination) return [];
    
    const current = pagination.currentPage();
    const total = pagination.totalPages();
    
    // If only 1 page, show just page 1
    if (total <= 1) return [1];
    
    // If 2 or fewer pages, show all pages
    if (total <= 2) return Array.from({ length: total }, (_, i) => i + 1);
    
    // For 3+ pages, show smart pagination
    const pages = new Set<number>();
    
    // Always show first page
    pages.add(1);
    
    // Show pages around current page
    for (let i = Math.max(1, current - 1); i <= Math.min(total, current + 1); i++) {
      pages.add(i);
    }
    
    // Always show last page if it's not already included
    if (total > 2) {
      pages.add(total);
    }
    
    return Array.from(pages).sort((a, b) => a - b);
  }
}