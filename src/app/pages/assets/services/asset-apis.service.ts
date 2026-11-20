import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiCallService } from '../../../core/services/api/base-api-call.service';
import { Asset, AssetCreate, AssetUpdate, AssetUnit } from '../../../core/interfaces/asset.interface';
import { AssetCategory } from '../../../core/interfaces/asset-category.interface';
import { PaginatedResponse } from '../../../core/interfaces/api-response.interface';

@Injectable({ providedIn: 'root' })
export class AssetApisService extends BaseApiCallService {

  // ─── Asset (product-type) endpoints ──────────────────────────────────────

  public getAssets(params?: Record<string, unknown>): Observable<PaginatedResponse<Asset> | Asset[]> {
    return this.get<PaginatedResponse<Asset> | Asset[]>('assets/', params);
  }

  public getAssetById(id: string): Observable<Asset> {
    const cleanId = id.includes('-unit-') ? id.split('-unit-')[0] : id;
    return this.get<Asset>(`assets/${cleanId}/`);
  }

  public createAsset(payload: AssetCreate): Observable<Asset> {
    return this.post<Asset>('assets/', payload);
  }

  public updateAsset(id: string, payload: AssetUpdate): Observable<Asset> {
    const cleanId = id.includes('-unit-') ? id.split('-unit-')[0] : id;
    return this.patch<Asset>(`assets/${cleanId}/`, payload);
  }

  public deleteAsset(id: string): Observable<void> {
    const cleanId = id.includes('-unit-') ? id.split('-unit-')[0] : id;
    return this.delete<void>(`assets/${cleanId}/`);
  }

  // ─── AssetUnit endpoints ──────────────────────────────────────────────────
  // NOTE: assign/return methods do NOT exist on Asset — only on AssetUnit.

  public getAssetUnits(assetId: string): Observable<AssetUnit[]> {
    const cleanId = assetId.includes('-unit-') ? assetId.split('-unit-')[0] : assetId;
    return this.get<any>(`assets/${cleanId}/units/`).pipe(
      map((res: any) => {
        const raw = Array.isArray(res) ? res : (res?.results ?? []);
        return raw.map((u: any) => ({
          id: String(u.id ?? ''),
          displayId: u.displayId ?? u.display_id ?? undefined,
          assetId: String(u.assetId ?? u.asset_id ?? u.asset ?? cleanId),
          unitNumber: u.unitNumber ?? u.unit_number ?? 0,
          serialNumber: u.serialNumber ?? u.serial_number ?? '',
          status: u.status ?? 'AVAILABLE',
          location: u.location ?? undefined,
          assignedTo: u.assignedTo ?? u.assigned_to ?? undefined,
          assignedUser: u.assignedUser ?? u.assigned_user ?? undefined,
          purchaseNumber: u.purchaseNumber ?? u.purchase_number ?? undefined,
          purchaseId: u.purchaseId ?? u.purchase_id ?? undefined,
          createdAt: u.createdAt ?? u.created_at ?? '',
          updatedAt: u.updatedAt ?? u.updated_at ?? '',
        }));
      })
    );
  }

  public getAvailableUnits(assetId: string): Observable<AssetUnit[]> {
    const cleanId = assetId.includes('-unit-') ? assetId.split('-unit-')[0] : assetId;
    return this.get<any>(`assets/${cleanId}/units/`, { status: 'AVAILABLE' }).pipe(
      map((res: any) => {
        const raw = Array.isArray(res) ? res : (res?.results ?? []);
        return raw.map((u: any) => ({
          id: String(u.id ?? ''),
          displayId: u.displayId ?? u.display_id ?? undefined,
          assetId: String(u.assetId ?? u.asset_id ?? u.asset ?? cleanId),
          unitNumber: u.unitNumber ?? u.unit_number ?? 0,
          serialNumber: u.serialNumber ?? u.serial_number ?? '',
          status: u.status ?? 'AVAILABLE',
          location: u.location ?? undefined,
          assignedTo: u.assignedTo ?? u.assigned_to ?? undefined,
          assignedUser: u.assignedUser ?? u.assigned_user ?? undefined,
          purchaseNumber: u.purchaseNumber ?? u.purchase_number ?? undefined,
          purchaseId: u.purchaseId ?? u.purchase_id ?? undefined,
          createdAt: u.createdAt ?? u.created_at ?? '',
          updatedAt: u.updatedAt ?? u.updated_at ?? '',
        }));
      })
    );
  }

  public assignUnit(
    unitId: string,
    payload: { employee_name: string; assigned_date?: string }
  ): Observable<AssetUnit> {
    return this.post<AssetUnit>(`assets/units/${unitId}/assign/`, payload);
  }

  public returnUnit(unitId: string): Observable<AssetUnit> {
    return this.post<AssetUnit>(`assets/units/${unitId}/return/`, {});
  }

  public updateUnitStatus(unitId: string, status: string): Observable<AssetUnit> {
    return this.patch<AssetUnit>(`assets/units/${unitId}/`, { status });
  }

  // ─── Category endpoints ───────────────────────────────────────────────────

  public getCategories(): Observable<AssetCategory[]> {
    return this.get<AssetCategory[]>('assets/categories/');
  }

  public createCategory(payload: { name: string; description?: string }): Observable<AssetCategory> {
    return this.post<AssetCategory>('assets/categories/', payload);
  }

  public updateCategory(id: string, payload: Partial<AssetCategory>): Observable<AssetCategory> {
    return this.patch<AssetCategory>(`assets/categories/${id}/`, payload);
  }

  public deleteCategory(id: string): Observable<void> {
    return this.delete<void>(`assets/categories/${id}/`);
  }

  // ─── Depreciation endpoints ──────────────────────────────────────────────

  public getDepreciationList(params?: Record<string, unknown>): Observable<any[]> {
    return this.get<any[]>('depreciation/', params);
  }

  public getAssetDepreciation(assetId: string): Observable<any> {
    const cleanId = assetId.includes('-unit-') ? assetId.split('-unit-')[0] : assetId;
    return this.get<any>(`depreciation/${cleanId}/`);
  }

  public updateAssetDepreciation(
    assetId: string,
    payload: { salvageValue: number; usefulLifeYears: number; depreciationMethod?: string }
  ): Observable<any> {
    const cleanId = assetId.includes('-unit-') ? assetId.split('-unit-')[0] : assetId;
    return this.patch<any>(`depreciation/${cleanId}/`, payload);
  }

  // ─── Asset Request & Receipt endpoints ─────────────────────────────────────

  public getAssetRequests(params?: Record<string, unknown>): Observable<any> {
    return this.get<any>('assets/requests/', params);
  }

  public createAssetRequest(payload: {
    categoryName: string;
    requestedAsset: string;
    reason: string;
    priority: string;
    model?: string;
    color?: string;
    notes?: string;
  }): Observable<any> {
    return this.post<any>('assets/requests/', payload);
  }

  public approveAssetRequest(id: string): Observable<any> {
    return this.post<any>(`assets/requests/${id}/approve/`, {});
  }

  public rejectAssetRequest(id: string, reason: string): Observable<any> {
    return this.post<any>(`assets/requests/${id}/reject/`, { reason });
  }

  public assignUnitToRequest(id: string, unit_id: string): Observable<any> {
    const cleanUnitId = unit_id && unit_id.includes('-unit-') ? unit_id.split('-unit-')[1] : unit_id;
    return this.post<any>(`assets/requests/${id}/assign-unit/`, { unit_id: cleanUnitId });
  }

  public confirmAssetReceipt(payload: {
    requestId?: string;
    assignmentId?: string;
    condition?: string;
    notes?: string;
  }): Observable<any> {
    return this.post<any>('assets/confirm-receipt/', payload);
  }

  public getMyAssignedAssets(): Observable<any[]> {
    return this.get<any[]>('assets/my-assigned/');
  }

  public deleteAssetRequest(id: string): Observable<void> {
    return this.delete<void>(`assets/requests/${id}/`);
  }

  public deleteAssignmentRecord(id: string): Observable<void> {
    // Sends assignment_id as query param — backend reads from request.query_params
    return this.delete<void>(`assets/my-assigned/?assignment_id=${encodeURIComponent(id)}`);
  }
}
