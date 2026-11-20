import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  MaintenanceRequest,
  MaintenanceStatus,
  MaintenanceStats,
  CreateMaintenanceRequest,
  UpdateMaintenanceStatusPayload,
  MaintenanceTimelineEntry,
} from '../../../core/interfaces/maintenance.interface';
import { PaginatedResponse } from '../../../core/interfaces/api-response.interface';

@Injectable({
  providedIn: 'root',
})
export class MaintenanceMockService {
  private store: MaintenanceRequest[] = [];

  private nextId: number = this.store.length + 1;

  // ─── Read ──────────────────────────────────────────────────────────────────

  public getMaintenanceRequests(
    _params?: Record<string, unknown>
  ): Observable<PaginatedResponse<MaintenanceRequest>> {
    return of({ count: this.store.length, next: null, previous: null, results: [...this.store] }).pipe(delay(300));
  }

  public getMaintenanceRequestById(id: string): Observable<MaintenanceRequest> {
    const found = this.store.find((r) => r.id === id);
    if (!found) return throwError(() => new Error(`Request ${id} not found.`));
    return of({ ...found }).pipe(delay(200));
  }

  public getMaintenanceStats(): Observable<MaintenanceStats> {
    const all = this.store;
    return of({
      total:      all.length,
      pending:    all.filter((r) => r.status === 'PENDING').length,
      inProgress: all.filter((r) => r.status === 'IN_PROGRESS').length,
      completed:  all.filter((r) => r.status === 'COMPLETED' || r.status === 'VERIFIED').length,
    }).pipe(delay(100));
  }

  public getMaintenanceByAsset(assetId: string): Observable<MaintenanceRequest[]> {
    return of(this.store.filter((r) => r.assetId === assetId)).pipe(delay(200));
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  public createMaintenanceRequest(payload: CreateMaintenanceRequest): Observable<MaintenanceRequest> {
    const padded = String(this.nextId).padStart(3, '0');

    const newRequest: MaintenanceRequest = {
      id:                   `mnt-${padded}`,
      requestId:            `MNT-${padded}`,
      assetId:              payload.assetId,
      assetName:            this.resolveAssetName(payload.assetId),
      serialNumber:         this.resolveSerialNumber(payload.assetId),
      assetIcon:            this.resolveAssetIcon(payload.assetId),
      componentOrIssueType: payload.componentOrIssueType,
      issueDescription:     payload.issueDescription,
      maintenanceType:      payload.maintenanceType,
      priority:             payload.priority,
      status:               'PENDING',
      createdAt:            new Date().toISOString(),
      updatedAt:            new Date().toISOString(),
      timeline: [{
        id:        `tl-${padded}-1`,
        status:    'PENDING',
        label:     'Request Created',
        timestamp: new Date().toISOString(),
      }],
      assetMaintenanceHistory: [],
    };

    this.store = [...this.store, newRequest];
    this.nextId++;
    return of({ ...newRequest }).pipe(delay(400));
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  public updateMaintenanceRequest(id: string, payload: Partial<CreateMaintenanceRequest>): Observable<MaintenanceRequest> {
    const idx = this.store.findIndex((r) => r.id === id);
    if (idx === -1) return throwError(() => new Error(`Request ${id} not found.`));

    const existing = this.store[idx];
    const updated: MaintenanceRequest = {
      ...existing,
      ...(payload.assetId && { assetId: payload.assetId, assetName: this.resolveAssetName(payload.assetId), serialNumber: this.resolveSerialNumber(payload.assetId), assetIcon: this.resolveAssetIcon(payload.assetId) }),
      ...(payload.componentOrIssueType && { componentOrIssueType: payload.componentOrIssueType }),
      ...(payload.issueDescription     && { issueDescription:     payload.issueDescription }),
      ...(payload.maintenanceType      && { maintenanceType:      payload.maintenanceType }),
      ...(payload.priority             && { priority:             payload.priority }),
      updatedAt: new Date().toISOString(),
    };

    this.store = this.store.map((r) => (r.id === id ? updated : r));
    return of({ ...updated }).pipe(delay(400));
  }

  // ─── Status Update ─────────────────────────────────────────────────────────

  public updateMaintenanceStatus(id: string, payload: UpdateMaintenanceStatusPayload): Observable<MaintenanceRequest> {
    const idx = this.store.findIndex((r) => r.id === id);
    if (idx === -1) return throwError(() => new Error(`Request ${id} not found.`));

    const existing = this.store[idx];
    const newEntry: MaintenanceTimelineEntry = {
      id:        `tl-${existing.id}-${(existing.timeline?.length ?? 0) + 1}`,
      status:    payload.status,
      label:     this.getStatusLabel(payload.status),
      timestamp: new Date().toISOString(),
      note:      payload.note,
    };

    const updated: MaintenanceRequest = {
      ...existing,
      status:      payload.status,
      updatedAt:   new Date().toISOString(),
      completedAt: payload.status === 'COMPLETED' || payload.status === 'VERIFIED' ? new Date().toISOString() : existing.completedAt,
      timeline:    [...(existing.timeline ?? []), newEntry],
    };

    this.store = this.store.map((r) => (r.id === id ? updated : r));
    return of({ ...updated }).pipe(delay(400));
  }

  public submitWorkUpdate(id: string, payload: any): Observable<MaintenanceRequest> {
    const idx = this.store.findIndex((r) => r.id === id || r.requestId === id);
    if (idx === -1) return throwError(() => new Error(`Request ${id} not found.`));

    const existing = this.store[idx];
    const newEntry: MaintenanceTimelineEntry = {
      id:          `tl-${existing.id}-${(existing.timeline?.length ?? 0) + 1}`,
      status:      payload.status,
      label:       this.getStatusLabel(payload.status),
      timestamp:   new Date().toISOString(),
      note:        payload.technicianNotes,
      workDone:    payload.workDone,
      completedBy: payload.technicianName ?? 'Technician',
    };

    const isClosed = payload.status === 'RESOLVED' || payload.status === 'COMPLETED' || payload.status === 'NOT_REPAIRABLE' || payload.status === 'UNREPAIRABLE';

    const updated: MaintenanceRequest = {
      ...existing,
      status:          payload.status,
      workDone:        payload.workDone,
      findings:        payload.workDone,
      technicianNotes: payload.technicianNotes,
      technicianName:  payload.technicianName ?? existing.technicianName,
      technicianId:    payload.technicianId ?? existing.technicianId,
      updatedAt:       new Date().toISOString(),
      ...(isClosed && { completedAt: new Date().toISOString(), resolvedAt: new Date().toISOString(), resolvedBy: payload.technicianName }),
      timeline:        [...(existing.timeline ?? []), newEntry],
    };

    this.store = this.store.map((r) => (r.id === id || r.requestId === id ? updated : r));
    return of({ ...updated }).pipe(delay(400));
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  public deleteMaintenanceRequest(id: string): Observable<void> {
    if (!this.store.some((r) => r.id === id)) return throwError(() => new Error(`Request ${id} not found.`));
    this.store = this.store.filter((r) => r.id !== id);
    return of(undefined as void).pipe(delay(300));
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private resolveAssetName(assetId: string): string {
    const map: Record<string, string> = {
      'ast-001': 'MacBook Pro M2', 'ast-002': 'HP LaserJet Pro',     'ast-003': 'Dell Optiplex',
      'ast-004': 'Cisco IP Phone', 'ast-005': 'Samsung Monitor 27"', 'ast-006': 'Lenovo ThinkPad X1',
      'ast-007': 'Canon ImageRunner', 'ast-008': 'APC UPS 1500VA',   'ast-009': 'HP ProDesk 600',
      'ast-010': 'iPad Pro 12.9"',
    };
    return map[assetId] ?? 'Unknown Asset';
  }

  private resolveSerialNumber(assetId: string): string {
    const map: Record<string, string> = {
      'ast-001': 'SN-2001', 'ast-002': 'SN-3001', 'ast-003': 'SN-4001', 'ast-004': 'SN-5001',
      'ast-005': 'SN-6001', 'ast-006': 'SN-7001', 'ast-007': 'SN-8001', 'ast-008': 'SN-9001',
      'ast-009': 'SN-1002', 'ast-010': 'SN-1003',
    };
    return map[assetId] ?? `SN-${assetId.slice(-4).toUpperCase()}`;
  }

  private resolveAssetIcon(assetId: string): string {
    const map: Record<string, string> = {
      'ast-001': 'laptop_mac', 'ast-002': 'print',    'ast-003': 'desktop_windows',
      'ast-004': 'phone',      'ast-005': 'monitor',  'ast-006': 'laptop',
      'ast-007': 'print',      'ast-008': 'power',    'ast-009': 'desktop_windows',
      'ast-010': 'tablet',
    };
    return map[assetId] ?? 'devices';
  }

  private getStatusLabel(status: MaintenanceStatus): string {
    const labels: Record<MaintenanceStatus, string> = {
      PENDING:        'Request Pending',
      IN_PROGRESS:    'Work Started',
      COMPLETED:      'Work Completed',
      RESOLVED:       'Work Resolved',
      VERIFIED:       'Quality Verified',
      CANCELLED:      'Request Cancelled',
      UNREPAIRABLE:   'Not Repairable',
      NOT_REPAIRABLE: 'Not Repairable',
      TODO:           'To Do',
      REVIEW:         'In Review',
    };
    return labels[status] ?? status;
  }
}
