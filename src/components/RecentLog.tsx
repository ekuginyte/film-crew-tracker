import { Trash2 } from "lucide-react";
import type { DayEntry, RateConfig } from "@/lib/calc";
import { breakdown, fmtGBP, fmtHours, DAY_TYPE_LABELS } from "@/lib/calc";

type Props = { entries: DayEntry[]; rates: RateConfig; onRemove: (id: string) => void };

export const RecentLog = ({ entries, rates, onRemove }: Props) => {
  if (entries.length === 0) {
    return (
      <div className="bg-carbon/50 border border-border p-8 rounded-xl text-center text-muted-foreground text-sm">
        No entries yet — capture your first day above.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {entries.slice(0, 8).map((e) => {
        const b = breakdown(e, rates);
        return (
          <div key={e.id}
            className="group bg-carbon/50 border border-border p-4 rounded-xl flex items-center justify-between hover:bg-carbon transition-colors">
            <div className="flex items-center gap-4 min-w-0">
              <div className="text-xs font-mono py-1 px-2 bg-obsidian rounded border border-border whitespace-nowrap">
                {new Date(e.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-foreground font-medium truncate flex items-center gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                    {DAY_TYPE_LABELS[e.dayType ?? "shoot"]}
                  </span>
                  <span className="truncate">{e.location || "Unit base"}</span>
                  {e.isNight && <span className="text-accent text-[10px]">NIGHT</span>}
                </p>
                <p className="text-[10px] uppercase tracking-tighter text-muted-foreground font-mono">
                  {e.call} — {e.wrap} · {fmtHours(b.worked)}h
                  {b.ot15 + b.ot2 > 0 && <span className="text-primary"> · +{fmtHours(b.ot15 + b.ot2)} OT</span>}
                  {e.perDiem && <span className="text-primary"> · PD</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm text-accent font-mono tabular-nums">{fmtGBP(b.total)}</p>
              <button onClick={() => onRemove(e.id)}
                aria-label="Remove entry"
                className="size-8 grid place-items-center rounded-md text-muted-foreground hover:text-ruby hover:bg-ruby/10 transition-colors">
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
