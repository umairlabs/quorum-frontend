export type SupplierStatus = 'ACTIVE' | 'INACTIVE';

export interface Supplier {
  id: string;
  displayId?: string;
  name: string;
  company: string;
  email?: string;
  phone?: string;
  address?: string;
  status: SupplierStatus;
  specifications?: Record<string, string>;
  totalPurchases?: number;
  totalAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierCreate {
  name?: string;
  company: string;
  email?: string;
  phone?: string;
  address?: string;
  specifications?: Record<string, string>;
}