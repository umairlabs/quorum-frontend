import { inject, Injectable } from '@angular/core';
import { Observable, of, tap, catchError } from 'rxjs';
import {
  AssetDepreciation,
  DepreciationMethod,
  DepreciationScheduleRow,
  DepreciationStatus,
  UpdateDepreciationPayload,
} from '../../../core/interfaces/depreciation.interface';
import { Asset } from '../../../core/interfaces/asset.interface';
import { AssetApisService } from './asset-apis.service';
import { AssetService } from './asset.service';
import { AuthApisService } from '../../../core/services/api/auth-apis.service';

@Injectable({
  providedIn: 'root',
})
export class DepreciationService {
  private readonly assetApisService = inject(AssetApisService);
  private readonly assetService = inject(AssetService);
  private readonly authService = inject(AuthApisService);

  /**
   * Calculates straight-line depreciation details, book value, status, and yearly schedule.
   */
  public calculateDepreciation(
    asset: Asset | null,
    customInputs?: {
      salvageValue?: number;
      usefulLifeYears?: number;
      depreciationMethod?: DepreciationMethod;
    }
  ): AssetDepreciation | null {
    if (!asset) return null;

    const fin = asset.financials as any;
    const purchasePrice =
      typeof asset.purchasePrice === 'number'
        ? asset.purchasePrice
        : typeof asset.purchaseCost === 'number'
        ? asset.purchaseCost
        : typeof fin?.purchaseValue === 'number'
        ? fin.purchaseValue
        : 0;

    const salvageValue =
      customInputs?.salvageValue !== undefined
        ? Number(customInputs.salvageValue)
        : asset.salvageValue !== undefined
        ? Number(asset.salvageValue)
        : fin?.salvageValue !== undefined
        ? Number(fin.salvageValue)
        : 0;

    const usefulLifeYears =
      customInputs?.usefulLifeYears !== undefined
        ? Number(customInputs.usefulLifeYears)
        : asset.usefulLifeYears !== undefined
        ? Number(asset.usefulLifeYears)
        : fin?.usefulLifeYears !== undefined
        ? Number(fin.usefulLifeYears)
        : 0;

    const depreciationMethod: DepreciationMethod =
      customInputs?.depreciationMethod ||
      (asset.depreciationMethod as DepreciationMethod) ||
      (fin?.depreciationMethod as DepreciationMethod) ||
      'STRAIGHT_LINE';

    const purchaseDate = asset.purchaseDate || fin?.purchaseDate || '';

    // If purchase price or useful life are invalid, return unconfigured state
    if (purchasePrice <= 0 || usefulLifeYears <= 0) {
      return {
        assetId: asset.id,
        purchasePrice,
        purchaseDate,
        salvageValue,
        usefulLifeYears,
        depreciationMethod,
        annualDepreciation: 0,
        monthlyDepreciation: 0,
        accumulatedDepreciation: 0,
        currentBookValue: purchasePrice,
        depreciationStatus: 'NOT_STARTED',
        depreciationSchedule: [],
      };
    }

    const depreciableAmount = Math.max(0, purchasePrice - salvageValue);
    const annualDepreciation = usefulLifeYears > 0 ? depreciableAmount / usefulLifeYears : 0;
    const monthlyDepreciation = annualDepreciation / 12;

    // Determine current book value, accumulated depreciation, and status
    let currentBookValue = purchasePrice;
    let accumulatedDepreciation = 0;
    let depreciationStatus: DepreciationStatus = 'ACTIVE';

    if (!purchaseDate) {
      depreciationStatus = 'ACTIVE';
      accumulatedDepreciation = 0;
      currentBookValue = purchasePrice;
    } else {
      const pDate = new Date(purchaseDate);
      const now = new Date();

      if (isNaN(pDate.getTime()) || pDate > now) {
        depreciationStatus = 'NOT_STARTED';
        accumulatedDepreciation = 0;
        currentBookValue = purchasePrice;
      } else {
        const diffMs = now.getTime() - pDate.getTime();
        const elapsedYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);

        if (elapsedYears >= usefulLifeYears) {
          depreciationStatus = 'FULLY_DEPRECIATED';
          accumulatedDepreciation = depreciableAmount;
          currentBookValue = salvageValue;
        } else {
          depreciationStatus = 'ACTIVE';
          accumulatedDepreciation = Math.min(depreciableAmount, elapsedYears * annualDepreciation);
          currentBookValue = Math.max(salvageValue, purchasePrice - accumulatedDepreciation);
        }
      }
    }

    // Build yearly schedule
    const schedule: DepreciationScheduleRow[] = [];
    const startYear = purchaseDate && !isNaN(new Date(purchaseDate).getTime())
      ? new Date(purchaseDate).getFullYear()
      : new Date().getFullYear();

    let openingValue = purchasePrice;
    let totalAcc = 0;

    for (let year = 1; year <= usefulLifeYears; year++) {
      const maxPossibleExpense = Math.max(0, openingValue - salvageValue);
      const expense = Math.min(annualDepreciation, maxPossibleExpense);
      const closingValue = Math.max(salvageValue, openingValue - expense);
      totalAcc += expense;

      schedule.push({
        year,
        yearLabel: `Year ${year} (${startYear + year - 1})`,
        openingBookValue: Math.round(openingValue * 100) / 100,
        depreciationExpense: Math.round(expense * 100) / 100,
        accumulatedDepreciation: Math.round(totalAcc * 100) / 100,
        closingBookValue: Math.round(closingValue * 100) / 100,
      });

      openingValue = closingValue;
    }

    return {
      assetId: asset.id,
      purchasePrice: Math.round(purchasePrice * 100) / 100,
      purchaseDate,
      salvageValue: Math.round(salvageValue * 100) / 100,
      usefulLifeYears,
      depreciationMethod,
      annualDepreciation: Math.round(annualDepreciation * 100) / 100,
      monthlyDepreciation: Math.round(monthlyDepreciation * 100) / 100,
      accumulatedDepreciation: Math.round(accumulatedDepreciation * 100) / 100,
      currentBookValue: Math.round(currentBookValue * 100) / 100,
      depreciationStatus,
      depreciationSchedule: schedule,
    };
  }

  /**
   * Validates payload against financial rules
   */
  public validateDepreciationPayload(
    payload: UpdateDepreciationPayload,
    purchasePrice: number
  ): { isValid: boolean; error?: string } {
    if (payload.salvageValue === null || payload.salvageValue === undefined || payload.salvageValue < 0) {
      return { isValid: false, error: 'Salvage value must be greater than or equal to 0.' };
    }
    if (!payload.usefulLifeYears || payload.usefulLifeYears <= 0) {
      return { isValid: false, error: 'Useful life must be greater than 0 years.' };
    }
    if (purchasePrice > 0 && payload.salvageValue > purchasePrice) {
      return {
        isValid: false,
        error: `Salvage value cannot exceed the asset purchase price (${purchasePrice}).`,
      };
    }
    return { isValid: true };
  }

  /**
   * Updates depreciation configuration on the asset and synchronizes state
   */
  public updateDepreciation(
    asset: Asset,
    payload: UpdateDepreciationPayload
  ): Observable<Asset> {
    const updateBody: any = {
      salvage_value: payload.salvageValue,
      useful_life_years: payload.usefulLifeYears,
      depreciation_method: payload.depreciationMethod,
      financials: {
        ...(asset.financials || {}),
        salvageValue: payload.salvageValue,
        usefulLifeYears: payload.usefulLifeYears,
        depreciationMethod: payload.depreciationMethod,
      },
    };

    return this.assetApisService.updateAssetDepreciation(asset.id, {
      salvageValue: payload.salvageValue,
      usefulLifeYears: payload.usefulLifeYears,
      depreciationMethod: payload.depreciationMethod,
    }).pipe(
      tap((updated) => {
        // Also update local storage and reactive state
        const currentAssets = this.assetService.assets();
        const index = currentAssets.findIndex((a) => a.id === asset.id);
        if (index !== -1) {
          const merged: Asset = {
            ...currentAssets[index],
            salvageValue: payload.salvageValue,
            usefulLifeYears: payload.usefulLifeYears,
            depreciationMethod: payload.depreciationMethod,
            financials: {
              ...(currentAssets[index].financials || {
                purchaseValue: currentAssets[index].purchaseCost,
                purchaseDate: currentAssets[index].purchaseDate || '',
                currentValue: currentAssets[index].purchaseCost,
                depreciationPercent: 0,
              }),
              salvageValue: payload.salvageValue,
              usefulLifeYears: payload.usefulLifeYears,
              depreciationMethod: payload.depreciationMethod,
            },
          };
          const next = [...currentAssets];
          next[index] = merged;
          this.assetService.assets.set(next);
          this.assetService.saveToLocalStorage(next);
        }
      }),
      catchError(() => {
        // If offline / local fallback, update local memory
        const currentAssets = this.assetService.assets();
        const index = currentAssets.findIndex((a) => a.id === asset.id);
        const merged: Asset = {
          ...asset,
          salvageValue: payload.salvageValue,
          usefulLifeYears: payload.usefulLifeYears,
          depreciationMethod: payload.depreciationMethod,
          financials: {
            ...(asset.financials || {
              purchaseValue: asset.purchaseCost,
              purchaseDate: asset.purchaseDate || '',
              currentValue: asset.purchaseCost,
              depreciationPercent: 0,
            }),
            salvageValue: payload.salvageValue,
            usefulLifeYears: payload.usefulLifeYears,
            depreciationMethod: payload.depreciationMethod,
          },
        };
        if (index !== -1) {
          const next = [...currentAssets];
          next[index] = merged;
          this.assetService.assets.set(next);
          this.assetService.saveToLocalStorage(next);
        }
        return of(merged);
      })
    );
  }
}
