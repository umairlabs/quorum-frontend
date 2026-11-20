import { Component, computed, inject, OnInit, signal, Signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AssignmentService } from '../services/assignment.service';
import { AssetService } from '../../assets/services/asset.service';
import { Assignment } from '../../../core/interfaces/assignment.interface';
import { AssignmentHistoryItem } from '../../../core/interfaces/asset.interface';
import { StatusBadgeComponent } from '../../../core/components/status-badge/status-badge.component';
import { TabNavComponent, Tab } from '../../../core/components/tab-nav/tab-nav.component';

export type DetailTab = 'overview' | 'history';

@Component({
  selector: 'app-assignment-detail',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent, TabNavComponent],
  templateUrl: './assignment-detail.component.html'
})
export class AssignmentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly assignmentService = inject(AssignmentService);
  private readonly assetService = inject(AssetService);

  private readonly _assignmentId: WritableSignal<string | null> = signal<string | null>(null);

  protected readonly activeTab: WritableSignal<DetailTab> = signal<DetailTab>('overview');

  protected readonly tabs: Tab[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'history',  label: 'Assignment History' },
  ];

  protected readonly assignment: Signal<Assignment | null> = computed(() => {
    const id = this._assignmentId();
    if (!id) return null;
    return this.assignmentService.assignments().find((a) => a.id === id) ?? null;
  });

  protected readonly assetHistory: Signal<AssignmentHistoryItem[]> = computed(() => {
    const a = this.assignment();
    if (!a || !a.assetId) return [];
    const asset = this.assetService.getAssetById(a.assetId);
    return asset?.assignmentHistory ?? [];
  });

  public ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/assignments']); return; }
    this._assignmentId.set(id);

    this.assignmentService.loadAssignmentsFromApi().subscribe();
  }

  protected setTab(key: string): void {
    this.activeTab.set(key as DetailTab);
  }

  protected onEdit(): void {
    const a = this.assignment();
    if (a) this.router.navigate(['/assignments', a.id, 'edit']);
  }
}
