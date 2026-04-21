import type { DayEntry, RateConfig } from "@/lib/calc";
import { breakdown, fmtHours, workedHours } from "@/lib/calc";

type Props = { entry: DayEntry; rates: RateConfig };

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

type Segment = {
  key: string;
  label: string;
  startMin: number; // minutes from call
  endMin: number;
  className: string;
  swatch: string;
};

/**
 * Build linear segments across the day timeline (call → wrap), in minutes.
 * Order of layout: pre-meal worked → meal break (unpaid) → post-meal worked.
 * Worked time is split into Basic → OT 1.5x → OT 2x in sequence.
 */
function buildSegments(entry: DayEntry, rates: RateConfig): { segments: Segment[]; totalMin: number } {
  const start = toMinutes(entry.call);
  let end = toMinutes(entry.wrap);
  if (end <= start) end += 24 * 60;
  const totalMin = Math.max(0, end - start);

  // Place a single meal block roughly in the middle if mealMinutes > 0.
  const meal = Math.min(entry.mealMinutes || 0, totalMin);
  const workedTotal = Math.max(0, totalMin - meal);
  const mealStart = Math.max(0, Math.round((totalMin - meal) / 2));
  const mealEnd = mealStart + meal;

  // Split worked minutes into basic / ot1.5 / ot2 in order.
  const basicCap = Math.round(rates.basicHours * 60);
  const ot15Cap = Math.round(rates.ot15Hours * 60);

  const basicMin = Math.min(workedTotal, basicCap);
  const ot15Min = Math.min(Math.max(0, workedTotal - basicCap), ot15Cap);
  const ot2Min = Math.max(0, workedTotal - basicCap - ot15Cap);

  // Walk through timeline, emitting worked chunks split by the meal break.
  const workedBuckets = [
    { name: "Basic", remaining: basicMin, className: "bg-primary/80", swatch: "bg-primary" },
    { name: "OT 1.5x", remaining: ot15Min, className: "bg-accent/80", swatch: "bg-accent" },
    { name: "OT 2x", remaining: ot2Min, className: "bg-ruby/80", swatch: "bg-ruby" },
  ];

  const segments: Segment[] = [];
  let cursor = 0;
  let bIdx = 0;

  const consumeWorked = (untilMin: number) => {
    while (cursor < untilMin && bIdx < workedBuckets.length) {
      const bucket = workedBuckets[bIdx];
      if (bucket.remaining <= 0) { bIdx++; continue; }
      const room = untilMin - cursor;
      const take = Math.min(room, bucket.remaining);
      if (take > 0) {
        segments.push({
          key: `${bucket.name}-${cursor}`,
          label: bucket.name,
          startMin: cursor,
          endMin: cursor + take,
          className: bucket.className,
          swatch: bucket.swatch,
        });
        cursor += take;
        bucket.remaining -= take;
      }
      if (bucket.remaining <= 0) bIdx++;
    }
    cursor = Math.max(cursor, untilMin);
  };

  consumeWorked(mealStart);
  if (meal > 0) {
    segments.push({
      key: `meal-${mealStart}`,
      label: "Meal",
      startMin: mealStart,
      endMin: mealEnd,
      className: "bg-muted/60",
      swatch: "bg-muted",
    });
    cursor = mealEnd;
  }
  consumeWorked(totalMin);

  return { segments, totalMin };
}

const fmtClock = (startMins: number, offsetMin: number) => {
  const total = (startMins + offsetMin) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export const DayTimeline = ({ entry, rates }: Props) => {
  const callMin = toMinutes(entry.call);
  const { segments, totalMin } = buildSegments(entry, rates);
  const b = breakdown(entry, rates);

  if (totalMin <= 0) {
    return <p className="text-xs text-muted-foreground font-mono">Set call and wrap times to see the timeline.</p>;
  }

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((p) => ({
    pct: p * 100,
    label: fmtClock(callMin, Math.round(totalMin * p)),
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
        <span>{entry.call} call</span>
        <span>{fmtHours(workedHours(entry))} h worked · {(totalMin / 60).toFixed(2)} h elapsed</span>
        <span>{entry.wrap} wrap</span>
      </div>

      <div
        className="relative h-9 w-full rounded-md overflow-hidden border border-border bg-obsidian"
        role="img"
        aria-label={`Timeline from ${entry.call} to ${entry.wrap}`}
      >
        {segments.map((s) => {
          const left = (s.startMin / totalMin) * 100;
          const width = ((s.endMin - s.startMin) / totalMin) * 100;
          return (
            <div
              key={s.key}
              className={`absolute top-0 bottom-0 ${s.className} transition-colors`}
              style={{ left: `${left}%`, width: `${width}%` }}
              title={`${s.label} · ${fmtClock(callMin, s.startMin)}–${fmtClock(callMin, s.endMin)}`}
            />
          );
        })}
        {entry.isNight && (
          <div className="absolute inset-0 ring-1 ring-inset ring-accent/40 pointer-events-none" />
        )}
      </div>

      <div className="relative h-3">
        {ticks.map((t) => (
          <div key={t.pct} className="absolute -translate-x-1/2 text-[9px] font-mono text-muted-foreground" style={{ left: `${t.pct}%` }}>
            {t.label}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] uppercase tracking-widest text-muted-foreground font-mono pt-2">
        <Legend swatch="bg-primary" label={`Basic ${fmtHours(b.basic)}h`} />
        {b.ot15 > 0 && <Legend swatch="bg-accent" label={`OT 1.5x ${fmtHours(b.ot15)}h`} />}
        {b.ot2 > 0 && <Legend swatch="bg-ruby" label={`OT 2x ${fmtHours(b.ot2)}h`} />}
        {entry.mealMinutes > 0 && <Legend swatch="bg-muted" label={`Meal ${entry.mealMinutes}m`} />}
        {entry.isNight && <Legend swatch="bg-accent/40" label="Night premium" />}
      </div>
    </div>
  );
};

const Legend = ({ swatch, label }: { swatch: string; label: string }) => (
  <span className="flex items-center gap-2">
    <span className={`size-2.5 rounded-sm ${swatch}`} aria-hidden />
    {label}
  </span>
);
