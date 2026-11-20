import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiCallService } from '../../../core/services/api/base-api-call.service';
import { AuditLog, AuditLogStats } from '../../../core/interfaces/audit-log.interface';
import { PaginatedResponse } from '../../../core/interfaces/api-response.interface';

@Injectable({
  providedIn: 'root'
})
export class AuditLogsApiService extends BaseApiCallService {
  private readonly ENDPOINT = 'audit-logs/';

  public getAuditLogs(
    params?: Record<string, unknown>
  ): Observable<PaginatedResponse<AuditLog> | AuditLog[]> {
    return this.get<PaginatedResponse<AuditLog> | AuditLog[]>(this.ENDPOINT, params);
  }

  public getAuditLogById(id: string): Observable<AuditLog> {
    return this.get<AuditLog>(`${this.ENDPOINT}${id}/`);
  }

  public getAuditLogStats(): Observable<AuditLogStats> {
    return this.get<AuditLogStats>(`${this.ENDPOINT}stats/`);
  }
}
