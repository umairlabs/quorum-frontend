import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusBadgeComponent } from '../../../../core/components/status-badge/status-badge.component';

@Component({
  selector: 'app-my-assigned-assets',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  templateUrl: './my-assigned-assets.component.html'
})
export class MyAssignedAssetsComponent {
  public readonly assignments      = input<any[]>([]);
  public readonly loading          = input<boolean>(false);

  public readonly confirmReceipt   = output<any>();
  public readonly viewAsset        = output<any>();
  public readonly reportProblem    = output<any>();
  public readonly deleteAssignment = output<any>();

  // ── 3-dot dropdown ───────────────────────────────────────────────────────
  protected readonly openMenuId = signal<string | null>(null);

  protected toggleMenu(id: string, event: Event): void {
    event.stopPropagation();
    this.openMenuId.set(this.openMenuId() === id ? null : id);
  }

  protected closeAllMenus(): void {
    this.openMenuId.set(null);
  }

  // ── Delete confirm modal ─────────────────────────────────────────────────
  protected readonly pendingDeleteItem = signal<any | null>(null);

  protected onDeleteClick(item: any): void {
    this.pendingDeleteItem.set(item);
    this.closeAllMenus();
  }

  protected confirmDelete(): void {
    const item = this.pendingDeleteItem();
    if (item) {
      this.deleteAssignment.emit(item);
      this.pendingDeleteItem.set(null);
    }
  }

  protected cancelDelete(): void {
    this.pendingDeleteItem.set(null);
  }

  // ── Receipt status helpers ───────────────────────────────────────────────
  protected isPending(item: any): boolean {
    const s = (item?.receiptStatus || item?.receipt_status || '').toUpperCase();
    return !s || s === 'PENDING_RECEIPT';
  }

  protected getReceiptStatusBadgeClass(item: any): string {
    return this.isPending(item)
      ? 'bg-warning/15 text-warning border-warning/30'
      : 'bg-success/15 text-success border-success/30';
  }

  protected getReceiptStatusLabel(item: any): string {
    return this.isPending(item) ? 'Pending Receipt' : 'Received';
  }

  // ── Asset Lifecycle Status helper ─────────────────────────────────────────
  protected getAssetStatus(item: any): string {
    const raw = (item?.unitStatus || item?.unit_status || item?.unit?.status || item?.assetStatus || '').toUpperCase();
    if (raw === 'MAINTENANCE') return 'MAINTENANCE';
    if (raw === 'SCRAPPED' || raw === 'DISCARDED' || raw === 'UNREPAIRABLE' || raw === 'NOT_REPAIRABLE') return 'SCRAPPED';
    return 'ASSIGNED';
  }
}
