import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseApiCallService } from '../../../core/services/api/base-api-call.service';
import { CompanySettings } from '../../../core/interfaces/company-settings.interface';

/**
 * API contract:
 *
 * GET  /api/company-settings/
 *   Response 200: CompanySettings object
 *
 * PUT  /api/company-settings/
 *   Request body: same fields (JSON)
 *   Response 200: updated CompanySettings object
 *   Response 403: if caller is not SYSTEM_ADMIN
 *   Response 400: validation errors, e.g. { errors: { currency: "..." } }
 *
 * POST /api/company-settings/logo/
 *   Request: multipart/form-data with 'logo' field
 *   Response 200: { logo_url: string }
 *   Response 403: if caller is not SYSTEM_ADMIN
 */
@Injectable({
  providedIn: 'root'
})
export class CompanySettingsApisService extends BaseApiCallService {

  private readonly ENDPOINT = 'company-settings/';
  private readonly LOGO_ENDPOINT = 'company-settings/logo/';

  public getCompanySettings(): Observable<CompanySettings> {
    return this.get<any>(this.ENDPOINT).pipe(
      map((raw: any) => this.normalize(raw))
    );
  }

  public updateCompanySettings(payload: Partial<CompanySettings>): Observable<CompanySettings> {
    // Convert camelCase payload → snake_case for the backend
    const body: Record<string, unknown> = {
      company_name:    payload.companyName,
      official_email:  payload.officialEmail,
      company_phone:   payload.companyPhone,
      company_address: payload.companyAddress,
      currency:        payload.currency,
      time_zone:       payload.timeZone,
      date_format:     payload.dateFormat,
      logo_url:        payload.logoUrl,
    };
    // Remove undefined keys so we don't overwrite with null
    Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);
    return this.put<any>(this.ENDPOINT, body).pipe(
      map((raw: any) => this.normalize(raw))
    );
  }

  /** Normalize backend snake_case → frontend camelCase */
  private normalize(raw: any): CompanySettings {
    return {
      companyName:    raw.company_name    ?? raw.companyName    ?? '',
      officialEmail:  raw.official_email  ?? raw.officialEmail  ?? '',
      companyPhone:   raw.company_phone   ?? raw.companyPhone   ?? '',
      companyAddress: raw.company_address ?? raw.companyAddress ?? '',
      currency:       raw.currency        ?? 'PKR',
      timeZone:       raw.time_zone       ?? raw.timeZone       ?? 'Asia/Karachi',
      dateFormat:     raw.date_format     ?? raw.dateFormat     ?? 'DD/MM/YYYY',
      logoUrl:        raw.logo_url        ?? raw.logoUrl        ?? undefined,
    };
  }

  public uploadCompanyLogo(file: File): Observable<{ logo_url: string }> {
    const formData = new FormData();
    formData.append('logo', file);
    return this.post<{ logo_url: string }>(this.LOGO_ENDPOINT, formData);
  }
}