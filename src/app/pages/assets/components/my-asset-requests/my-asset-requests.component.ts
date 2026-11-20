import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-my-asset-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-asset-requests.component.html'
})
export class MyAssetRequestsComponent {
  public readonly requests = input<any[]>([]);
  public readonly loading = input<boolean>(false);

  public readonly openRequestModal  = output<void>();
  public readonly viewRequest       = output<any>();
  public readonly confirmReceiptForRequest = output<any>();
  public readonly deleteRequest     = output<any>();

  // ── 3-dot dropdown state ─────────────────────────────────────────────────
  protected readonly openMenuId = signal<string | null>(null);

  protected toggleMenu(id: string, event: Event): void {
    event.stopPropagation();
    this.openMenuId.set(this.openMenuId() === id ? null : id);
  }

  protected closeMenu(): void {
    this.openMenuId.set(null);
  }

  // ── Detail modal state ───────────────────────────────────────────────────
  protected readonly detailItem = signal<any | null>(null);

  protected openDetail(req: any): void {
    this.detailItem.set(req);
    this.closeMenu();
  }

  protected closeDetail(): void {
    this.detailItem.set(null);
  }

  // ── Delete confirm modal state ───────────────────────────────────────────
  protected readonly pendingDeleteItem = signal<any | null>(null);

  protected onDelete(req: any): void {
    this.pendingDeleteItem.set(req);
    this.closeMenu();
  }

  protected confirmDelete(): void {
    const req = this.pendingDeleteItem();
    if (req) {
      this.deleteRequest.emit(req);
      this.pendingDeleteItem.set(null);
    }
  }

  protected cancelDelete(): void {
    this.pendingDeleteItem.set(null);
  }

  // ── Badge helpers ────────────────────────────────────────────────────────
  protected getStatusBadgeClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PENDING':  return 'bg-warning/15 text-warning border-warning/30';
      case 'APPROVED': return 'bg-blue-500/15 text-blue-600 border-blue-500/30';
      case 'ASSIGNED': return 'bg-secondary/15 text-secondary border-secondary/30';
      case 'RECEIVED': return 'bg-success/15 text-success border-success/30';
      case 'REJECTED': return 'bg-error/15 text-error border-error/30';
      default:         return 'bg-surface-variant text-on-surface-variant border-outline-variant';
    }
  }

  protected getPriorityBadgeClass(priority: string): string {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL': return 'text-error font-bold';
      case 'HIGH':     return 'text-warning font-semibold';
      case 'LOW':      return 'text-on-surface-variant';
      default:         return 'text-on-surface';
    }
  }

  protected getPriorityPillClass(priority: string): string {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL': return 'bg-error/15 text-error border-error/30';
      case 'HIGH':     return 'bg-warning/15 text-warning border-warning/30';
      case 'LOW':      return 'bg-surface-container text-on-surface-variant border-outline-variant';
      default:         return 'bg-primary/10 text-primary border-primary/20';
    }
  }
}
