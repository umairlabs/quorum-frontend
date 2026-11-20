export type CategoryStatus = 'ACTIVE' | 'INACTIVE';

export interface AssetCategory {
  id: string;
  displayId?: string;
  name: string;
  description?: string;
  assetCount?: number;
  status?: CategoryStatus;
  createdAt?: string;
}

