import { AssetCategory } from './asset-category.interface';

// ─── Status ──────────────────────────────────────────────────────────────────
export type AssetStatus = 'AVAILABLE' | 'ASSIGNED' | 'MAINTENANCE' | 'SCRAPPED';

// ─── TechSpec ─────────────────────────────────────────────────────────────────
export interface TechSpecItem {
  key: string;
  value: string;
}
export type TechSpecs = TechSpecItem[];

// ─── Financials ───────────────────────────────────────────────────────────────
export interface Financials {
  purchaseValue: number;
  purchaseDate: string;
  currentValue: number;
  depreciationPercent: number;
  salvageValue?: number;
  usefulLifeYears?: number;
  depreciationMethod?: string;
  depreciationStatus?: string;
  annualDepreciation?: number;
  monthlyDepreciation?: number;
  accumulatedDepreciation?: number;
  currentBookValue?: number;
}

// ─── AssignmentHistoryItem ────────────────────────────────────────────────────
export interface AssignmentHistoryItem {
  id: string;
  employeeName: string;
  assignedDate: string;
  returnedDate?: string;
  status: 'Active' | 'Returned';
}

// ─── AssetUnit ────────────────────────────────────────────────────────────────
export interface AssignedUser {
  name: string;
  avatarInitials: string;
  employeeId?: string;
  fullName?: string;
}

export interface AssetUnit {
  id: string;
  displayId?: string;
  assetId: string;
  unitNumber: number;
  serialNumber: string;
  status: AssetStatus;
  location?: string;
  assignedTo?: string;
  assignedUser?: AssignedUser;
  purchaseNumber?: string;
  purchaseId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Asset ────────────────────────────────────────────────────────────────────
// A single physical asset record. Can be an inventory asset (no purchaseId /
// purchaseNumber) or a purchased asset (has purchaseId OR purchaseNumber).
//
// Inventory asset  = product definition — no serial, no PO reference
// Purchased asset  = real physical unit  — has serial + PO reference
//
// See appflow.md Rule 27 for full domain model explanation.
export interface Asset {
  id: string;
  displayId?: string;           // Formatted Display ID (e.g. AST-001)
  assetId?: string;             // Formatted Asset ID (e.g. AST-001)
  unitId?: string;              // For purchased assets - the specific unit ID
  iconKey?: string;             // Auto-detected icon name (Material Symbols)
  name: string;
  serialNumber: string;
  category: AssetCategory | string;
  brand?: string;
  model?: string;
  color?: string;
  status: AssetStatus;
  assignedTo?: string;
  assignedUser?: AssignedUser;
  assignmentDate?: string;
  purchaseDate?: string;
  purchaseCost: number;
  purchasePrice?: number;
  totalAmount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  paymentStatus?: string;
  value?: number;
  supplier?: string;
  purchaseNumber?: string;
  purchaseId?: string;
  invoiceNumber?: string;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  warrantyStatus?: string;
  department?: string;
  location?: string;
  currentEmployee?: string;
  techSpecs?: TechSpecs;
  salvageValue?: number;
  usefulLifeYears?: number;
  depreciationMethod?: string;
  financials?: Financials;
  assignmentHistory?: AssignmentHistoryItem[];
  units?: AssetUnit[];
  totalQuantity?: number;
  availableQuantity?: number;
  assignedQuantity?: number;
  maintenanceQuantity?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── AssetCreate ──────────────────────────────────────────────────────────────
export interface AssetCreate {
  name: string;
  serialNumber?: string;      // optional — inventory assets have no serial
  categoryId: string;
  category?: string;
  brand?: string;
  model?: string;
  color?: string;
  status?: AssetStatus;
  assignedTo?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  supplier?: string;
  purchaseNumber?: string;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  department?: string;
  location?: string;
}

// ─── AssetUpdate ──────────────────────────────────────────────────────────────
export interface AssetUpdate {
  name?: string;
  serialNumber?: string;
  categoryId?: string;
  category?: string;
  brand?: string;
  model?: string;
  color?: string;
  status?: AssetStatus;
  assignedTo?: string;
  assignmentDate?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  supplier?: string;
  techSpecs?: TechSpecs;
}

// ─── InventoryGroup ───────────────────────────────────────────────────────────
// Aggregated view of inventory assets grouped by name + brand + model.
// Used in the Inventory view of the assets page.
export interface InventoryGroup {
  id: string;                 // composite key: `${name}-${brand}-${model}`
  name: string;
  category: AssetCategory | string;
  brand?: string;
  model?: string;
  unitCost: number;
  totalStock: number;
  availableStock: number;
  assignedStock: number;
  maintenanceStock: number;
  assetIds: string[];         // individual asset IDs in this group
}

// ─── PurchaseGroup ────────────────────────────────────────────────────────────
// Aggregated view of purchased assets grouped by product (name + brand + model).
// Multiple POs of the same product are merged into one row.
// Used in the Purchased view of the assets page.
export interface PurchaseGroup {
  id: string;                 // composite key: `${name}-${brand}-${model}`
  purchaseNumber: string;     // most recent PO number (for display in the table)
  purchaseNumbers: string[];  // all PO numbers that contributed units to this group
  assetName: string;
  category: AssetCategory | string;
  brand?: string;
  model?: string;
  supplier?: string;          // if all units share one supplier; empty if mixed
  suppliers: string[];        // all unique supplier names across all units
  quantity: number;
  availableCount: number;
  assignedCount: number;
  maintenanceCount: number;
  totalAmount: number;
  assets: Asset[];            // all individual asset records in this group
}

export interface AssetRequest {
  id: string;
  displayId?: string;
  requestNumber: string;
  employeeId: string;
  employeeName: string;
  department: string;
  categoryName: string;
  requestedAsset: string;
  model?: string;
  color?: string;
  reason: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ASSIGNED' | 'RECEIVED' | 'CANCELLED';
  rejectionReason?: string;
  assignedUnitId?: string;
  assignedUnitSerial?: string;
  assignedUnitName?: string;
  approvedAt?: string;
  assignedAt?: string;
  receivedAt?: string;
  createdAt: string;
}
