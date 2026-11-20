/**
 * Asset Icon Utility
 *
 * Resolves a Material Symbols icon name from:
 *   1. A backend-provided `iconKey` string (preferred — always use this first)
 *   2. Asset/category name string (fallback keyword matching)
 *
 * All icons are Material Symbols Outlined — no extra library needed.
 * To add new keywords: just extend ICON_KEYWORD_MAP below.
 */

// ── Keyword → Material Symbols icon map ──────────────────────────────────────
// Each entry: [keywords[], iconName]
// Checked in order — first match wins. Keywords are lowercase substrings.
const ICON_KEYWORD_MAP: [string[], string][] = [
  // Computers
  [['laptop', 'notebook'],                          'laptop_mac'],
  [['desktop', 'workstation', 'computer', ' pc'],  'computer'],
  [['server', 'rack'],                              'dns'],
  [['tablet', 'ipad', 'tab'],                       'tablet'],
  // Displays
  [['monitor', 'screen', 'display'],                'monitor'],
  [['projector'],                                   'video_projector'],
  // Mobile & communication
  [['phone', 'mobile', 'smartphone', 'iphone'],    'smartphone'],
  [['headphone', 'headset', 'earphone', 'earbuds'], 'headphones'],
  [['walkie'],                                      'radio'],
  // Printing & scanning
  [['printer', 'print'],                            'print'],
  [['scanner', 'scan'],                             'document_scanner'],
  [['copier', 'photocopy'],                         'content_copy'],
  // Audio & video
  [['speaker', 'audio', 'sound'],                  'speaker'],
  [['camera', 'webcam', 'cctv'],                   'photo_camera'],
  [['tv', 'television'],                            'tv'],
  // Input devices
  [['keyboard'],                                    'keyboard'],
  [['mouse'],                                       'mouse'],
  // Networking & power
  [['router', 'switch', 'network', 'wifi', 'hub'], 'router'],
  [['ups', 'battery', 'power supply'],             'battery_charging_full'],
  // Furniture
  [['chair', 'seat'],                               'chair'],
  [['desk', 'table'],                               'table_restaurant'],
  [['cabinet', 'locker', 'shelf', 'shelving'],     'shelves'],
  [['sofa', 'couch'],                               'weekend'],
  // Vehicles
  [['car', 'vehicle', 'truck', 'van', 'bike'],     'directions_car'],
  // Tools & appliances
  [['tool', 'drill', 'machine'],                   'handyman'],
  [['ac', 'air condition', 'hvac', 'heater', 'fan'], 'ac_unit'],
  [['refrigerator', 'fridge'],                     'kitchen'],
  // Storage & accessories
  [['hard disk', 'ssd', 'storage', 'usb', 'pen drive', 'flash drive'], 'storage'],
  [['cable', 'wire'],                               'cable'],
  // Safety
  [['security', 'alarm'],                          'security'],
  [['fire extinguisher'],                           'fire_extinguisher'],
  // Generic categories
  [['hardware', 'equipment', 'device'],            'devices'],
  [['software', 'license'],                        'code'],
  [['furniture'],                                   'chair'],
  [['network', 'it'],                               'router'],
];

const FALLBACK_ICON = 'inventory_2';

/**
 * Primary resolver — prefers backend iconKey, falls back to name matching.
 *
 * @param iconKeyOrName  Can be:
 *   - The `iconKey` string from API response (e.g. 'laptop_mac')
 *   - An asset/category name string (e.g. 'Dell Laptop')
 *   - undefined/null (returns fallback)
 */
export function getAssetIcon(iconKeyOrName?: string | null): string {
  if (!iconKeyOrName) return FALLBACK_ICON;

  const val = iconKeyOrName.trim();
  if (!val) return FALLBACK_ICON;

  // If it's already a known Material Symbol (no spaces, snake_case) return it directly
  if (/^[a-z][a-z0-9_]*$/.test(val) && val !== 'inventory_2') {
    // Validate it's actually in our map or matches a known icon pattern
    // Short-circuit: if backend sent 'laptop_mac', 'print', etc. — use as-is
    const isKnownIcon = ICON_KEYWORD_MAP.some(([, icon]) => icon === val);
    if (isKnownIcon) return val;
  }

  // Keyword match against the value (works for both asset names and category names)
  const lower = val.toLowerCase();
  for (const [keywords, icon] of ICON_KEYWORD_MAP) {
    if (keywords.some(kw => lower.includes(kw))) {
      return icon;
    }
  }

  return FALLBACK_ICON;
}

/**
 * Resolve icon from a full asset object — uses iconKey first, then name+category.
 * Works with any object that has these optional fields.
 */
export function getAssetIconFromObject(asset?: {
  iconKey?: string;
  name?: string;
  category?: string | { name?: string };
  brand?: string;
  model?: string;
} | null): string {
  if (!asset) return FALLBACK_ICON;

  // 1. Backend-provided iconKey (most reliable)
  if (asset.iconKey) return getAssetIcon(asset.iconKey);

  // 2. Combine name + category for keyword matching
  const catName = typeof asset.category === 'string'
    ? asset.category
    : (asset.category?.name ?? '');

  const combined = [asset.name, catName, asset.brand, asset.model]
    .filter(Boolean).join(' ');

  return getAssetIcon(combined);
}

/**
 * Legacy alias — keeps existing imports in assignment.service.ts working.
 * @deprecated Use getAssetIcon() or getAssetIconFromObject() instead.
 */
export function getCategoryIcon(category?: { name?: string } | string): string {
  if (!category) return FALLBACK_ICON;
  const name = typeof category === 'string' ? category : (category.name ?? '');
  return getAssetIcon(name);
}
