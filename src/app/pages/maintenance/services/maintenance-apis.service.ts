import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiCallService } from '../../../core/services/api/base-api-call.service';
import {
  MaintenanceRequest,
  MaintenanceStats,
  CreateMaintenanceRequest,
  UpdateMaintenanceStatusPayload,
} from '../../../core/interfaces/maintenance.interface';
import { PaginatedResponse } from '../../../core/interfaces/api-response.interface';

@Injectable({
  providedIn: 'root'
})
export class MaintenanceApisService extends BaseApiCallService {

  public getMaintenanceRequests(
    params?: Record<string, unknown>
  ): Observable<PaginatedResponse<MaintenanceRequest> | MaintenanceRequest[]> {
    return this.get<PaginatedResponse<MaintenanceRequest> | MaintenanceRequest[]>('maintenance/', params);
  }

  public getMaintenanceRequestById(id: string): Observable<MaintenanceRequest> {
    return this.get<MaintenanceRequest>(`maintenance/${id}/`);
  }

  public createMaintenanceRequest(payload: CreateMaintenanceRequest): Observable<MaintenanceRequest> {
    return this.post<MaintenanceRequest>('maintenance/', payload);
  }

  public updateMaintenanceRequest(id: string, payload: Partial<CreateMaintenanceRequest>): Observable<MaintenanceRequest> {
    return this.patch<MaintenanceRequest>(`maintenance/${id}/`, payload);
  }

  public updateMaintenanceStatus(id: string, payload: UpdateMaintenanceStatusPayload): Observable<MaintenanceRequest> {
    return this.patch<MaintenanceRequest>(`maintenance/${id}/status/`, payload);
  }

  public submitWorkUpdate(id: string, payload: any): Observable<MaintenanceRequest> {
    return this.patch<MaintenanceRequest>(`maintenance/${id}/work-update/`, payload);
  }

  public deleteMaintenanceRequest(id: string): Observable<void> {
    return this.delete<void>(`maintenance/${id}/`);
  }

  public getMaintenanceStats(): Observable<MaintenanceStats> {
    return this.get<MaintenanceStats>('maintenance/stats/');
  }

  public generateIssueWithAI(prompt: string): Observable<{ title: string; description: string; priority: string }> {
    return this.post<{ title: string; description: string; priority: string }>('ai/generate-maintenance-issue/', { prompt });
  }
}