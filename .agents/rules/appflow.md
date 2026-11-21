---
trigger: always_on
---

# Quorum — Application Flow & Domain Model

## Purpose

This document describes the business domain, the relationship between all modules, and the user flows across the application. It is the source of truth for understanding **what the app does and why**, not how it is built technically.

---

## Application Overview

Quorum is an **Enterprise Asset Management** system. It allows organisations to track physical assets — from the moment they are defined in the catalogue, through purchasing, assignment to employees, maintenance, and eventual retirement or sale.

---

## The Four-Layer Model

```
Inventory Asset   →   defines the product (what it is)
Purchased Asset   →   a physical unit of that product (what we own)
Assignment        →   who is using that physical unit right now
Maintenance       →   what repair work is being done on that unit
```

Every feature in the app maps to one of these four layers.

---

## Layer 1 — Inventory Assets (Product Catalogue)

Inventory assets are **product definitions**. They represent a type of asset the organisation tracks — not a physical unit.

- Think of it as: "We have Dell Latitude 7420 as a product in our catalogue"
- Defined by: name, category, brand, model, color
- No serial number — serial numbers belong to physical units
- No purchase info — inventory assets are defined, not purchased
- No assignment — you cannot assign a product definition to a person
- No maintenance — a definition cannot break down

**Example:** `Dell Latitude 7420 | Laptop | Lenovo | Black`

An inventory asset is the **template** from which physical units are purchased.

### What you can do with an Inventory Asset

| Action | Allowed | Notes |
|---|---|---|
| View details | Yes | Shows stock summary and all units |
| Edit | Yes | Name, brand, model, category, color only |
| Add Unit | Yes | Creates a new asset record of this type |
| Delete | Only if no purchased stock | Cannot delete if purchased units exist |
| Assign | No | Only purchased units can be assigned |
| Maintenance | No | Only purchased units can go to maintenance |

---

## Layer 2 — Purchased Assets (Physical Stock)

Purchased assets are **real physical units** bought via a Purchase Order.

- Think of it as: "We bought 5 Dell Latitude 7420 units from TechCorp on 2026-01-15"
- Each unit has: serial number, purchase date, purchase cost, supplier, PO number
- Linked to an inventory asset by **asset name** (same name = same product)
- Multiple units can exist across multiple POs for the same product

**Example:** `Dell Latitude 7420 | PO-1001 | SN-4250 | Available | TechCorp`

### The Relationship Between Inventory and Purchased

```
Inventory Asset (Dell Latitude 7420)
       ↓  "purchased stock of this product"
Purchased Assets:
  - Dell Latitude 7420 | PO-1001 | SN-4250 | Available
  - Dell Latitude 7420 | PO-1001 | SN-4251 | Assigned → Ahmed
  - Dell Latitude 7420 | PO-1002 | SN-4300 | Maintenance
```

The link is the **asset name**. When creating a purchase, the user searches for an existing inventory asset by name and purchases units of it.

**Critical rule:** If an inventory asset has purchased stock, it must NOT be deleted. Deleting it would orphan all purchased units of that product. The delete button is disabled when purchased stock exists.

### What you can do with a Purchased Asset

| Action | Allowed | Notes |
|---|---|---|
| View details | Yes | Shows full unit info, history, tabs |
| Edit | Yes | All fields including financial info |
| Assign | Yes, if AVAILABLE | Assigns unit to an employee |
| Return | Yes, if ASSIGNED | Returns unit to available inventory |
| Send to Maintenance | Yes, if not in MAINTENANCE | Logs a maintenance ticket |
| Mark as Sold | Yes, if not SOLD | Records sale info |
| Delete | Yes | Removes the unit record |

### Purchased Asset Status Lifecycle

```
AVAILABLE → ASSIGNED → AVAILABLE (after return)
AVAILABLE → MAINTENANCE → AVAILABLE (after repair)
AVAILABLE → SOLD
AVAILABLE → SCRAPPED
```

---

## Layer 3 — Assignments

Assignments track **which employee is currently using a specific physical unit**.

- Only **purchased assets** can be assigned — they are real physical units
- Inventory assets cannot be assigned
- One unit → one active assignment at a time
- When returned, the asset status goes back to AVAILABLE

### Assignment Fields

- Asset (purchased unit, identified by serial number)
- Employee name and ID
- Assignment date
- Expected return date
- Notes

### Business Rules

- Only assets with status `AVAILABLE` can be assigned
- Only purchased assets appear in the assignment dropdown
- Returning an asset sets its status back to `AVAILABLE`

---

## Layer 4 — Maintenance

Maintenance tracks **repair and servicing work on a specific physical unit**.

- Only **purchased assets** can go to maintenance — physical units break down
- Inventory assets cannot go to maintenance
- A maintenance ticket is created when a unit is sent for repair

### Maintenance Ticket Fields

- Asset (purchased unit, identified by serial number)
- Issue description
- Maintenance type (Corrective / Preventive)
- Priority (Low / Medium / High / Critical)
- Assigned technician
- Status (Pending / In Progress / Completed / Cancelled)
- Timeline / history log

### Business Rules

- Only purchased assets appear in the maintenance asset dropdown
- Assets already in `MAINTENANCE` status cannot be sent to maintenance again
- Only the Operations Manager can create and assign tickets
- Only the assigned Technician can update ticket status

---

## The Complete Asset Journey

```
1. Define the product
   → Create an Inventory Asset (Dell Latitude 7420)

2. Purchase stock
   → Create a Purchase Order for 5 units
   → 5 Purchased Asset records are created, each with a serial number

3. Assign a unit to an employee
   → Pick one available unit (e.g. SN-4250)
   → Assign to Ahmed → status becomes ASSIGNED

4. Unit needs repair
   → Return from Ahmed → status becomes AVAILABLE
   → Send to maintenance → status becomes MAINTENANCE
   → Repair completed → status becomes AVAILABLE

5. End of life
   → Mark as Sold or Scrapped
```

---

## How the Code Distinguishes Inventory from Purchased

```typescript
// This single check drives all view filtering, action availability,
// form field visibility, and dropdown filtering across the entire app.
const isPurchasedAsset = !!(asset.purchaseId || asset.purchaseNumber);
const isInventoryAsset = !isPurchasedAsset;
```

---

---

## Page-by-Page Summary

| Page | What it does | Works with |
|---|---|---|
| Assets — Inventory View | Browse and manage product definitions | Inventory Assets |
| Assets — Purchased View | Browse physical stock grouped by PO | Purchased Assets |
| Inventory Asset Detail | Inspect a product — stock counts and units | Inventory Assets |
| Asset Detail | Inspect a single physical unit — full history | Purchased Assets |
| Asset Create | Define a new product in the catalogue | Inventory Assets |
| Asset Edit | Update product or unit details | Both (different fields shown) |
| Purchase | Buy units of an existing inventory product | Purchased Assets |
| Assignments | Track who is using which unit | Purchased Assets only |
| Maintenance | Track repair work on units | Purchased Assets only |
| Audit Logs | Immutable change history | All assets |
| Depreciation | Financial depreciation schedules | Purchased Assets |
