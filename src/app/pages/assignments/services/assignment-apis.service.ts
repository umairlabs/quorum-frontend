import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiCallService } from '../../../core/services/api/base-api-call.service';
import { Assignment } from '../../../core/interfaces/assignment.interface';
import { PaginatedResponse } from '../../../core/interfaces/api-response.interface';

@Injectable({
  providedIn: 'root'
})
export class AssignmentApisService extends BaseApiCallService {
  public getAssignments(params?: Record<string, unknown>): Observable<PaginatedResponse<Assignment> | Assignment[]> {
    return this.get<PaginatedResponse<Assignment> | Assignment[]>('assignments/', params);
  }

  public getAssignmentById(id: string): Observable<Assignment> {
    return this.get<Assignment>(`assignments/${id}/`);
  }

  public createAssignment(payload: any): Observable<Assignment> {
    return this.post<Assignment>('assignments/', payload);
  }

  public updateAssignment(id: string, payload: Partial<Assignment>): Observable<Assignment> {
    return this.put<Assignment>(`assignments/${id}/`, payload);
  }

  public transferAssignment(id: string, payload: any): Observable<Assignment> {
    return this.post<Assignment>(`assignments/${id}/transfer/`, payload);
  }

  public returnAssignment(id: string): Observable<Assignment> {
    return this.post<Assignment>(`assignments/${id}/return/`, {});
  }

  public deleteAssignment(id: string): Observable<void> {
    return this.delete<void>(`assignments/${id}/`);
  }

  public getAssignmentStats(): Observable<{ total_active: number; pending_returns: number; returned_this_month: number }> {
    return this.get<{ total_active: number; pending_returns: number; returned_this_month: number }>('assignments/stats/');
  }
}
