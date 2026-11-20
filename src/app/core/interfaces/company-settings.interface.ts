export interface CompanySettings {
  companyName: string;
  logoUrl?: string;
  officialEmail: string;
  companyPhone: string;
  companyAddress: string;
  currency: 'PKR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SAR';
  timeZone: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
}

export const COMPANY_SETTINGS_DEFAULTS: CompanySettings = {
  companyName: '',
  logoUrl: undefined,
  officialEmail: '',
  companyPhone: '',
  companyAddress: '',
  currency: 'PKR',
  timeZone: 'Asia/Karachi',
  dateFormat: 'DD/MM/YYYY'
};
