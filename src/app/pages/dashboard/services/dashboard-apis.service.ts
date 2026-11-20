import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiCallService } from '../../../core/services/api/base-api-call.service';
import { DashboardSummary } from '../../../core/interfaces/dashboard.interface';

@Injectable({
  providedIn: 'root'
})
export class DashboardApisService extends BaseApiCallService {

  public getDashboardSummary(dateFrom?: string, dateTo?: string): Observable<DashboardSummary> {
    const params: Record<string, string> = {};
    if (dateFrom) params['date_from'] = dateFrom;
    if (dateTo) params['date_to'] = dateTo;
    return this.get<DashboardSummary>('dashboard/', params);
  }
}
