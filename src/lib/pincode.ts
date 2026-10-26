/**
 * Likely GST state code for an Indian PIN code, from India Post's postal-circle prefixes.
 * Offline and private (no lookup service). Compact logic to fit within strict first-load JS budget.
 */

const SPECIAL: Record<string, string> = {
  "160": "04", "194": "38", "396": "26", "403": "30", "605": "34", "609": "34",
  "737": "11", "744": "35", "795": "14", "796": "15", "799": "16",
  "11": "07", "17": "02", "49": "22", "50": "36", "78": "18", "83": "20",
};

export function stateFromPincode(pin: string): string | undefined {
  if (!/^[1-9]\d{5}$/.test(pin)) return undefined;
  const p3 = Number(pin.slice(0, 3));
  if (p3 === 244 || (p3 >= 246 && p3 <= 249) || p3 === 262 || p3 === 263) return "05";
  if (p3 >= 490 && p3 <= 497) return "22";
  if (p3 >= 790 && p3 <= 792) return "12";
  if (p3 === 793 || p3 === 794) return "17";
  if (p3 === 797 || p3 === 798) return "13";
  if ((p3 >= 814 && p3 <= 816) || (p3 >= 825 && p3 <= 829) || (p3 >= 831 && p3 <= 835) || p3 === 822) return "20";
  if (SPECIAL[pin.slice(0, 3)]) return SPECIAL[pin.slice(0, 3)];

  const p2 = Number(pin.slice(0, 2));
  if (p2 === 12 || p2 === 13) return "06";
  if (p2 >= 14 && p2 <= 16) return "03";
  if (p2 === 18 || p2 === 19) return "01";
  if (p2 >= 20 && p2 <= 28) return "09";
  if (p2 >= 30 && p2 <= 34) return "08";
  if (p2 >= 36 && p2 <= 39) return "24";
  if (p2 >= 40 && p2 <= 44) return "27";
  if (p2 >= 45 && p2 <= 48) return "23";
  if (p2 >= 51 && p2 <= 53) return "37";
  if (p2 >= 56 && p2 <= 59) return "29";
  if (p2 >= 60 && p2 <= 64) return "33";
  if (p2 >= 67 && p2 <= 69) return "32";
  if (p2 >= 70 && p2 <= 74) return "19";
  if (p2 >= 75 && p2 <= 77) return "21";
  if ((p2 >= 80 && p2 <= 82) || p2 === 84 || p2 === 85) return "10";
  return SPECIAL[pin.slice(0, 2)];
}
