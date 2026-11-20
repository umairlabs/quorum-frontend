import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiCallService } from '../../../core/services/api/base-api-call.service';
import { User } from '../../../core/interfaces/user.interface';
import { PaginatedResponse } from '../../../core/interfaces/api-response.interface';

@Injectable({
  providedIn: 'root'
})
export class UserApisService extends BaseApiCallService {

  public getUsers(params?: Record<string, unknown>): Observable<PaginatedResponse<User>> {
    return this.get<PaginatedResponse<User>>('users/', params);
  }

  public getUserById(id: string): Observable<User> {
    return this.get<User>(`users/${id}/`);
  }

  public createUser(payload: any): Observable<User> {
    return this.post<User>('users/', payload);
  }

  public updateUser(id: string, payload: any): Observable<User> {
    return this.patch<User>(`users/${id}/`, payload);
  }

  public deleteUser(id: string): Observable<void> {
    return this.delete<void>(`users/${id}/`);
  }

  public toggleUserStatus(id: string, payload: any): Observable<User> {
    return this.patch<User>(`users/${id}/status/`, payload);
  }

  public getUserPermissions(id: string): Observable<{ user_id: string; email: string; role: string; permissions: string[] }> {
    return this.get<{ user_id: string; email: string; role: string; permissions: string[] }>(`users/${id}/permissions/`);
  }

  public updateUserPermissions(id: string, permissions: string[]): Observable<{ user_id: string; email: string; role: string; permissions: string[] }> {
    return this.put<{ user_id: string; email: string; role: string; permissions: string[] }>(`users/${id}/permissions/`, { permissions });
  }
}
