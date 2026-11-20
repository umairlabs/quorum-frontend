import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, shareReplay, finalize } from 'rxjs';
import { BaseApiCallService } from './base-api-call.service';
import { FcmService } from '../../../pages/assets/services/fcm.service';
import { PermissionService } from '../permission.service';
import {
  AuthResponse,
  LoginCredentials,
  RefreshResponse,
  ChangePasswordPayload,
  User,
} from '../../interfaces/auth.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthApisService extends BaseApiCallService {
  private readonly router = inject(Router);
  private readonly fcmService = inject(FcmService);
  private readonly permissionService = inject(PermissionService);

  public readonly currentUser = signal<User | null>(null);
  public readonly isAuthenticated = signal<boolean>(this.hasToken());

  private refreshInProgress$: Observable<RefreshResponse> | null = null;

  constructor() {
    super();
    this.restoreSession();
  }

  public onLogin(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.post<AuthResponse>('auth/login/', credentials).pipe(
      tap((response) => {
        this.setSession(response);
      })
    );
  }

  public onRefreshToken(): Observable<RefreshResponse> {
    if (this.refreshInProgress$) {
      return this.refreshInProgress$;
    }

    const refresh_token = this.getRefreshToken();

    this.refreshInProgress$ = this.post<RefreshResponse>('auth/refresh/', { refresh_token }).pipe(
      tap((response) => {
        localStorage.setItem('access_token', response.access);
      }),
      shareReplay(1),
      finalize(() => {
        this.refreshInProgress$ = null;
      })
    );

    return this.refreshInProgress$;
  }

  public onLogout(): void {
    const refresh_token = this.getRefreshToken();

    if (refresh_token) {
      this.post('auth/logout/', { refresh_token }).subscribe({
        complete: () => this.clearSession(),
        error: () => this.clearSession(),
      });
    } else {
      this.clearSession();
    }
  }

  public onChangePassword(payload: ChangePasswordPayload): Observable<{ detail: string }> {
    return this.put<{ detail: string }>('auth/change-password/', payload);
  }

  public getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  public getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  /**
   * Local (device-level) profile update — naam/image jaisi cheezein
   * jab backend endpoint confirm nahi hai, tab tak isi se persist karte hain.
   * Refresh ke baad bhi latest value hi dikhegi.
   */
  public updateStoredUser(partial: Partial<User>): void {
    const current = this.currentUser();
    if (!current) return;

    const updated: User = { ...current, ...partial };
    this.currentUser.set(updated);
    localStorage.setItem('user', JSON.stringify(updated));
  }

  private setSession(authResult: AuthResponse): void {
    const rawUser: any = authResult.user;

    const mappedUser: User = {
      id: rawUser.id,
      email: rawUser.email,
      firstName: rawUser.first_name ?? rawUser.firstName ?? '',
      lastName: rawUser.last_name ?? rawUser.lastName ?? '',
      fullName: rawUser.fullName ?? `${rawUser.first_name ?? ''} ${rawUser.last_name ?? ''}`.trim(),
      role: rawUser.role,
      isActive: rawUser.is_active ?? rawUser.isActive ?? true,
      avatarUrl: rawUser.avatar_url ?? rawUser.avatarUrl,
      createdAt: rawUser.created_at ?? rawUser.createdAt,
    };

    localStorage.setItem('access_token', authResult.access);
    localStorage.setItem('refresh_token', authResult.refresh);
    localStorage.setItem('role', authResult.role);
    localStorage.setItem('user', JSON.stringify(mappedUser));

    const perms = (authResult as any).permissions ?? rawUser.permissions ?? [];
    this.permissionService.setPermissions(perms);

    this.currentUser.set(mappedUser);
    this.isAuthenticated.set(true);

    // Login successful — Firebase push notification setup shuru karein
    this.fcmService.initFirebase();
  }

  public clearSession(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    this.permissionService.clearPermissions();
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/auth/login']);
  }

  public isTokenValid(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    // Reject known mock dev tokens or non-JWT tokens
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    try {
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(payloadBase64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      if (payload && typeof payload.exp === 'number') {
        const now = Math.floor(Date.now() / 1000);
        return payload.exp > now;
      }
      return true;
    } catch {
      return false;
    }
  }

  private restoreSession(): void {
    const savedUser = localStorage.getItem('user');
    if (savedUser && this.isTokenValid()) {
      try {
        this.currentUser.set(JSON.parse(savedUser));
        // Page refresh hui, user already logged in tha — push notification setup dobara karein
        this.fcmService.initFirebase();
      } catch {
        // corrupt data, ignore
      }
    } else if (localStorage.getItem('access_token')) {
      // Invalid or expired token exists in storage — clean up
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('role');
      localStorage.removeItem('user');
      this.isAuthenticated.set(false);
    }
  }

  private hasToken(): boolean {
    return this.isTokenValid();
  }
}