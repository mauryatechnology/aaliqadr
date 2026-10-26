import { stateFromPincode } from "./pincode";

/**
 * Delivery estimate by PIN code (plan.md §10.3), zone-based until a courier's serviceability
 * API is connected. Pure: the product page computes it in the browser from the store settings.
 */

export interface DeliveryZones {
  /** Working days to dispatch after the order. */
  dispatch: [number, number];
  /** Transit days by zone. */
  local: [number, number];
  metro: [number, number];
  rest: [number, number];
  remote: [number, number];
}

export const DEFAULT_ZONES: DeliveryZones = { dispatch: [1, 2], local: [1, 3], metro: [2, 4], rest: [3, 6], remote: [5, 9] };

/** Metro postal regions (first two digits). */
const METRO = new Set(["11", "40", "41", "56", "60", "70", "50", "38"]);
/** North-east, hill and island states: slower by surface. */
const REMOTE = new Set(["01", "38", "11", "12", "13", "14", "15", "16", "17", "18", "35", "31"]);

export type Zone = "local" | "metro" | "rest" | "remote";

export function zoneFor(pin: string, storeStateCode: string): Zone | null {
  const state = stateFromPincode(pin);
  if (!state) return null;
  if (REMOTE.has(state)) return "remote";
  if (state === storeStateCode) return "local";
  if (METRO.has(pin.slice(0, 2))) return "metro";
  return "rest";
}

/** Adds working days (Monday–Saturday; couriers don't deliver on Sundays). */
export function addWorkingDays(from: Date, days: number): Date {
  const d = new Date(from);
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() !== 0) left--;
  }
  return d;
}

export function estimate(pin: string, storeStateCode: string, zones: DeliveryZones = DEFAULT_ZONES, now = new Date()): { zone: Zone; earliest: Date; latest: Date } | null {
  const zone = zoneFor(pin, storeStateCode);
  if (!zone) return null;
  // Work in India time: an order after 2 pm IST is dispatched from the next working day.
  const ist = new Date(now.getTime() + 330 * 60_000);
  const start = ist.getUTCHours() >= 14 ? addWorkingDays(ist, 1) : ist;
  const [t1, t2] = zones[zone];
  return { zone, earliest: addWorkingDays(start, zones.dispatch[0] + t1), latest: addWorkingDays(start, zones.dispatch[1] + t2) };
}
