import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthApisService } from '../services/api/auth-apis.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthApisService);
  const token = authService.getAccessToken();

  // Calls that don't need an Authorization header
  const isAuthCall =
    req.url.includes('/login/') ||
    req.url.includes('/refresh/');

  // Attach token to non-auth requests
  const authReq = (token && !isAuthCall)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {

      // Only handle 401 on non-auth calls
      if (error.status !== 401 || isAuthCall) {
        return throwError(() => error);
      }

      const refreshToken = authService.getRefreshToken();

      // No refresh token — clear session and redirect
      if (!refreshToken) {
        authService.onLogout();
        return throwError(() => error);
      }

      // Attempt token refresh — onRefreshToken() uses shareReplay so
      // concurrent 401s share one refresh call instead of racing
      return authService.onRefreshToken().pipe(
        switchMap((res) => {
          // Retry original request with new token
          const retryReq = req.clone({
            setHeaders: { Authorization: `Bearer ${res.access}` }
          });
          return next(retryReq);
        }),
        catchError((refreshErr: HttpErrorResponse) => {
          // Refresh itself failed (e.g. refresh token expired) — log out
          // Only logout if the refresh actually returned a 4xx, not a network error
          if (refreshErr?.status && refreshErr.status >= 400 && refreshErr.status < 500) {
            authService.onLogout();
          }
          return throwError(() => refreshErr);
        })
      );
    })
  );
};
