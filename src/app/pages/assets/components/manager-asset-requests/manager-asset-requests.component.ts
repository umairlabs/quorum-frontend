import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-manager-asset-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manager-asset-requests.component.html'
})
export class ManagerAssetRequestsComponent {
  public readonly requests = input<any[]>([]);
  public readonly loading = input<boolean>(false);
  public readonly availableUnits = input<any[]>([]);

  public readonly approveRequest = output<string>();
  public readonly rejectRequest = output<{ id: string; reason: string }>();
  public readonly assignUnitToRequest = output<{ requestId: string; unitId: string }>();
  public readonly viewRequest = output<any>();

  protected selectedRequestForReject = signal<any | null>(null);
  protected rejectReason = signal<string>('');

  protected selectedRequestForAssign = signal<any | null>(null);
  protected selectedUnitId = signal<string>('');

  protected openRejectModal(req: any): void {
    this.selectedRequestForReject.set(req);
    this.rejectReason.set('');
  }

  protected confirmReject(): void {
    const req = this.selectedRequestForReject();
    if (!req) return;
    this.rejectRequest.emit({
      id: req.id,
      reason: this.rejectReason().trim() || 'No suitable asset is currently available.'
    });
    this.selectedRequestForReject.set(null);
  }

  protected openAssignModal(req: any): void {
    this.selectedRequestForAssign.set(req);
    this.selectedUnitId.set('');
  }

  protected confirmAssign(): void {
    const req = this.selectedRequestForAssign();
    const unitId = this.selectedUnitId();
    if (!req || !unitId) return;

    this.assignUnitToRequest.emit({
      requestId: req.id,
      unitId: unitId
    });
    this.selectedRequestForAssign.set(null);
  }

  protected getStatusBadgeClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'bg-warning/15 text-warning border-warning/30';
      case 'APPROVED':
        return 'bg-info/15 text-info border-info/30';
      case 'ASSIGNED':
        return 'bg-secondary/15 text-secondary border-secondary/30';
      case 'RECEIVED':
        return 'bg-success/15 text-success border-success/30';
      case 'REJECTED':
        return 'bg-error/15 text-error border-error/30';
      default:
        return 'bg-surface-variant text-on-surface-variant border-outline-variant';
    }
  }
}
