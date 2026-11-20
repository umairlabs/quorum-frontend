import { Component, input, InputSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssetStatus } from '../../interfaces/asset.interface';
import { TicketStatus } from '../../interfaces/dashboard.interface';
import { AssignmentStatus } from '../../interfaces/assignment.interface';
import { MaintenanceStatus, MaintenancePriority } from '../../interfaces/maintenance.interface';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="inline-flex items-center justify-center text-center px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors w-[100px] min-w-[100px] h-6 border"
      [ngClass]="badgeClass"
    >
      {{ badgeLabel }}
    </span>
  `
})
export class StatusBadgeComponent {
  public readonly status: InputSignal<AssetStatus | TicketStatus | AssignmentStatus | MaintenanceStatus | MaintenancePriority | string | undefined> =
    input<AssetStatus | TicketStatus | AssignmentStatus | MaintenanceStatus | MaintenancePriority | string | undefined>();

  protected get badgeClass(): string {
    const val = String(this.status() ?? '').toUpperCase();

    // Group 1: Critical / Error / Scrapped / Unrepairable (Muted Soft Red Accent)
    if (['SCRAPPED', 'DISCARDED', 'DISPOSED', 'OVERDUE', 'UNREPAIRABLE', 'NOT_REPAIRABLE', 'CRITICAL', 'UNPAID'].includes(val)) {
      return 'bg-red-500/10 text-red-700 border-red-500/20';
    }

    // Group 2: High Priority / Attention (Subtle Warm Tint)
    if (['HIGH', 'MAINTENANCE', 'MEDIUM', 'PENDING', 'PARTIAL'].includes(val)) {
      return 'bg-amber-500/10 text-amber-800 border-amber-500/20';
    }

    // Group 3: Active / In Progress / Assigned / Available / Resolved (Clean Soft Slate Tint)
    if (['ASSIGNED', 'AVAILABLE', 'IN_PROGRESS', 'OPEN', 'IN PROGRESS', 'ACTIVE', 'COMPLETED', 'RESOLVED', 'VERIFIED', 'PAID', 'ASSIGNED'].includes(val)) {
      return 'bg-slate-500/10 text-slate-800 border-slate-500/20';
    }

    // Default / Neutral (Muted Gray)
    return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
  }

  protected get badgeLabel(): string {
    const s = this.status();
    const normalized = s ? String(s).toUpperCase() : '';
    switch (normalized) {
      // Category / General
      case 'ACTIVE': return 'Active';
      case 'INACTIVE': return 'Inactive';
      // Asset
      case 'ASSIGNED': return 'Assigned';
      case 'AVAILABLE': return 'Available';
      case 'MAINTENANCE': return 'Maintenance';
      case 'SCRAPPED': return 'Scrapped';
      case 'DISCARDED': return 'Discarded';
      case 'DISPOSED': return 'Disposed';
      // Maintenance statuses
      case 'PENDING': return 'Pending';
      case 'TODO': return 'To Do';
      case 'OPEN': return 'Open';
      case 'IN_PROGRESS': return 'In Progress';
      case 'REVIEW':
      case 'UNDER_REVIEW': return 'Under Review';
      case 'COMPLETED': return 'Completed';
      case 'RESOLVED': return 'Resolved';
      case 'VERIFIED': return 'Verified';
      case 'OVERDUE': return 'Overdue';
      case 'CANCELLED': return 'Cancelled';
      case 'UNREPAIRABLE':
      case 'NOT_REPAIRABLE': return 'Not Repairable';
      // Payment
      case 'PAID': return 'Paid';
      case 'PARTIAL': return 'Partial';
      case 'UNPAID': return 'Unpaid';
      // Priorities
      case 'LOW': return 'Low';
      case 'MEDIUM': return 'Medium';
      case 'HIGH': return 'High';
      case 'CRITICAL': return 'Critical';
      case 'SIGNED': return 'Signed';
      default: return this.status() ?? 'Unknown';
    }
  }
}
