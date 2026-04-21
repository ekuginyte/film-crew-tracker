// Hours & charge calculations for UK film crew (BECTU-style defaults).
// All times in "HH:mm". Wrap may cross midnight (next day).

export const DAY_TYPES = ["shoot", "travel", "prep", "rig", "rehearsal", "hold"] as const;
export type DayType = (typeof DAY_TYPES)[number];

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  shoot: "Shoot",
  travel: "Travel",
  prep: "Prep",
  rig: "Rig",
  rehearsal: "Rehearsal",
  hold: "Hold",
};

export type DayEntry = {
  id: string;
  date: string;           // YYYY-MM-DD
  dayType: DayType;
  location?: string;
  call: string;           // "07:00"
  wrap: string;           // "20:30" (may be next-day)
  mealMinutes: number;    // unpaid meal break
  travelMinutes: number;
  isNight?: boolean;      // night-shoot flag → night premium
  notes?: string;
};

export type RateConfig = {
  dayRate: number;          // £ flat day rate; if > 0, used in place of basic-hours × hourly
  basicHours: number;       // contracted basic per day, e.g. 10
  hourlyRate: number;       // £ hourly rate (used for OT and when day rate = 0)
  ot15Hours: number;        // hours after basic that count at 1.5x, e.g. 2
  // remaining hours count at 2x
  nightPremium: number;     // £ flat per night-shoot day
  vatRate: number;          // 0.20
  kitRentalPerDay?: number; // optional
};

export const DEFAULT_RATES: RateConfig = {
  dayRate: 0,
  basicHours: 10,
  hourlyRate: 35,
  ot15Hours: 2,
  nightPremium: 100,
  vatRate: 0.2,
  kitRentalPerDay: 0,
};

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export function workedHours(entry: DayEntry): number {
  if (!entry.call || !entry.wrap) return 0;
  let start = toMinutes(entry.call);
  let end = toMinutes(entry.wrap);
  if (end <= start) end += 24 * 60; // crossed midnight
  const worked = end - start - (entry.mealMinutes || 0);
  return Math.max(0, worked / 60);
}

export type DayBreakdown = {
  worked: number;
  basic: number;
  ot15: number;
  ot2: number;
  travelHours: number;
  basicPay: number;
  ot15Pay: number;
  ot2Pay: number;
  travelPay: number;
  nightPay: number;
  kitRental: number;
  total: number;
};

export function breakdown(entry: DayEntry, rates: RateConfig): DayBreakdown {
  const worked = workedHours(entry);
  const basic = Math.min(worked, rates.basicHours);
  const overtime = Math.max(0, worked - rates.basicHours);
  const ot15 = Math.min(overtime, rates.ot15Hours);
  const ot2 = Math.max(0, overtime - rates.ot15Hours);
  const travelHours = (entry.travelMinutes || 0) / 60;

  // Day rate (if set) replaces hourly basic pay; pro-rated when worked < basic.
  const basicPay = rates.dayRate > 0
    ? rates.dayRate * (rates.basicHours > 0 ? basic / rates.basicHours : 1)
    : basic * rates.hourlyRate;
  const ot15Pay = ot15 * rates.hourlyRate * 1.5;
  const ot2Pay = ot2 * rates.hourlyRate * 2;
  const travelPay = travelHours * rates.hourlyRate;
  const nightPay = entry.isNight ? rates.nightPremium : 0;
  const kitRental = rates.kitRentalPerDay || 0;

  const total = basicPay + ot15Pay + ot2Pay + travelPay + nightPay + kitRental;
  return { worked, basic, ot15, ot2, travelHours, basicPay, ot15Pay, ot2Pay, travelPay, nightPay, kitRental, total };
}

export type Totals = {
  days: number;
  basicHours: number;
  ot15Hours: number;
  ot2Hours: number;
  travelHours: number;
  subtotal: number;
  vat: number;
  grand: number;
};

export function totals(entries: DayEntry[], rates: RateConfig): Totals {
  const acc: Totals = {
    days: entries.length,
    basicHours: 0, ot15Hours: 0, ot2Hours: 0, travelHours: 0,
    subtotal: 0, vat: 0, grand: 0,
  };
  for (const e of entries) {
    const b = breakdown(e, rates);
    acc.basicHours += b.basic;
    acc.ot15Hours += b.ot15;
    acc.ot2Hours += b.ot2;
    acc.travelHours += b.travelHours;
    acc.subtotal += b.total;
  }
  acc.vat = acc.subtotal * rates.vatRate;
  acc.grand = acc.subtotal + acc.vat;
  return acc;
}

export const fmtGBP = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n || 0);

export const fmtHours = (n: number) => (n || 0).toFixed(2);
