import { SIGNS, type ZodiacSign } from "@/config/zodiac";

/** Month (1-12) and day as a sortable number, e.g. 3 Apr → 403. */
const md = (month: number, day: number) => month * 100 + day;

/**
 * Western (tropical) sun sign for a birth date. Pure and client-safe: the finder never sends
 * a birth date to the server. Not the Vedic rashi (docs/02 §2).
 */
export function sunSignFor(month: number, day: number): ZodiacSign {
  if (month < 1 || month > 12 || day < 1 || day > 31) throw new RangeError("Invalid date");
  const v = md(month, day);
  for (const sign of SIGNS) {
    const start = md(...sign.start);
    const end = md(...sign.end);
    const inRange = start <= end ? v >= start && v <= end : v >= start || v <= end; // Capricorn wraps the year
    if (inRange) return sign;
  }
  throw new Error(`No sign found for ${month}/${day}`);
}

/** The sign whose season it is on the given date (IST calendar day). */
export function currentSeasonSign(now: Date): ZodiacSign {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return sunSignFor(ist.getUTCMonth() + 1, ist.getUTCDate());
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatSignDates(sign: ZodiacSign): string {
  const [sm, sd] = sign.start;
  const [em, ed] = sign.end;
  return `${sd} ${MONTHS[sm - 1]} – ${ed} ${MONTHS[em - 1]}`;
}
