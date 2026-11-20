import { Component, input, output, InputSignal, OutputEmitterRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditLog } from '../../../../core/interfaces/audit-log.interface';
import { ModalComponent } from '../../../../core/components/modal/modal.component';

@Component({
  selector: 'app-audit-detail-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  templateUrl: './audit-detail-modal.component.html',
  styleUrls: ['./audit-detail-modal.component.scss']
})
export class AuditDetailModalComponent {
  public readonly isOpen: InputSignal<boolean> = input<boolean>(false);
  public readonly log: InputSignal<AuditLog | null> = input<AuditLog | null>(null);

  public readonly close: OutputEmitterRef<void> = output<void>();

  protected onClose(): void {
    this.close.emit();
  }

  protected getActionBadgeClass(action: string | undefined): string {
    if (!action) return 'bg-slate-500/10 text-slate-700 border-slate-500/20';
    const a = action.toUpperCase();

    if (a.includes('CREATED') || a.includes('PURCHASED') || a.includes('RESOLVED')) {
      return 'bg-emerald-500/10 text-emerald-800 border-emerald-500/30';
    }
    if (a.includes('ASSIGNED') || a.includes('TRANSFERRED') || a.includes('RETURNED')) {
      return 'bg-sky-500/10 text-sky-800 border-sky-500/30';
    }
    if (a.includes('MAINTENANCE') || a.includes('STARTED') || a.includes('REVIEW')) {
      return 'bg-amber-500/10 text-amber-800 border-amber-500/30';
    }
    if (a.includes('RETIRED') || a.includes('SCRAPPED') || a.includes('DELETED')) {
      return 'bg-error-container/30 text-error border-error/40';
    }
    return 'bg-slate-500/10 text-slate-800 border-slate-500/30';
  }

  protected formatActionName(action: string | undefined): string {
    if (!action) return '—';
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  protected getObjectEntries(obj: Record<string, any> | undefined): [string, any][] {
    if (!obj || typeof obj !== 'object') return [];
    return Object.entries(obj);
  }

  protected hasValueEntries(obj: Record<string, any> | undefined): boolean {
    return !!(obj && Object.keys(obj).length > 0);
  }
}
