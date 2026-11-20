import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class BaseApiCallService {
  protected apiURL: string = environment.apiUrl;
  protected http: HttpClient = inject(HttpClient);

  protected httpOptions: { headers: HttpHeaders } = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  public get<T>(endpoint: string, params?: HttpParams | { [param: string]: any }): Observable<T> {
    return this.http.get<T>(`${this.apiURL}/${endpoint}`, { params });
  }

  public post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.apiURL}/${endpoint}`, body);
  }

  public put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.apiURL}/${endpoint}`, body);
  }

  public patch<T>(endpoint: string, body: any): Observable<T> {
    return this.http.patch<T>(`${this.apiURL}/${endpoint}`, body);
  }

  public delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.apiURL}/${endpoint}`);
  }
}
