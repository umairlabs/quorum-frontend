export type DepreciationMethod = 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'SUM_OF_YEARS_DIGITS';

export type DepreciationStatus = 'ACTIVE' | 'FULLY_DEPRECIATED' | 'NOT_STARTED';

export interface DepreciationScheduleRow {
  year: number;
  yearLabel: string;
  openingBookValue: number;
  depreciationExpense: number;
  accumulatedDepreciation: number;
  closingBookValue: number;
}

export interface AssetDepreciation {
  id?: string;
  assetId: string;
  purchasePrice: number;
  purchaseDate?: string;
  salvageValue: number;
  usefulLifeYears: number;
  depreciationMethod: DepreciationMethod;
  annualDepreciation: number;
  monthlyDepreciation: number;
  accumulatedDepreciation: number;
  currentBookValue: number;
  depreciationStatus: DepreciationStatus;
  depreciationSchedule: DepreciationScheduleRow[];
}

export interface UpdateDepreciationPayload {
  salvageValue: number;
  usefulLifeYears: number;
  depreciationMethod: DepreciationMethod;
}

export interface Depreciation {
  id: string;
  assetId: string;
  initialValue: number;
  currentValue: number;
  salvageValue: number;
  usefulLifeYears: number;
}
