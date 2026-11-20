import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiCallService } from '../../../core/services/api/base-api-call.service';
import { NotificationItem, NotificationPreferences, UnreadCountResponse } from '../../../core/interfaces/notification.interface';
import { PaginatedResponse } from '../../../core/interfaces/api-response.interface';

@Injectable({
  providedIn: 'root'
})
export class NotificationApisService extends BaseApiCallService {
  private readonly ENDPOINT = 'notifications/';

  public getNotifications(
    params?: Record<string, unknown>
  ): Observable<PaginatedResponse<NotificationItem> | NotificationItem[]> {
    return this.get<PaginatedResponse<NotificationItem> | NotificationItem[]>(this.ENDPOINT, params);
  }

  public getUnreadCount(): Observable<UnreadCountResponse> {
    return this.get<UnreadCountResponse>(`${this.ENDPOINT}unread-count/`);
  }

  public markAsRead(id: string): Observable<NotificationItem> {
    return this.post<NotificationItem>(`${this.ENDPOINT}${id}/read/`, {});
  }

  public markAsUnread(id: string): Observable<NotificationItem> {
    return this.post<NotificationItem>(`${this.ENDPOINT}${id}/unread/`, {});
  }

  public markAllAsRead(): Observable<{ detail: string; updated_count: number }> {
    return this.post<{ detail: string; updated_count: number }>(`${this.ENDPOINT}mark-all-read/`, {});
  }

  public deleteNotification(id: string): Observable<void> {
    return this.delete<void>(`${this.ENDPOINT}${id}/`);
  }

  public deleteAllNotifications(): Observable<{ detail: string; deleted_count: number }> {
    return this.delete<{ detail: string; deleted_count: number }>(`${this.ENDPOINT}delete-all/`);
  }

  public getPreferences(): Observable<NotificationPreferences> {
    return this.get<NotificationPreferences>(`${this.ENDPOINT}preferences/`);
  }

  public updatePreferences(payload: Partial<NotificationPreferences>): Observable<NotificationPreferences> {
    return this.post<NotificationPreferences>(`${this.ENDPOINT}preferences/`, payload);
  }
}
