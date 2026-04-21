import type { RateConfig } from "@/lib/calc";

type Props = { rates: RateConfig; onChange: (r: RateConfig) => void; project: string; onProject: (s: string) => void };

export const RatesPanel = ({ rates, onChange, project, onProject }: Props) => {
  const set = <K extends keyof RateConfig>(k: K, v: RateConfig[K]) => onChange({ ...rates, [k]: v });
  return (
    <div className="bg-carbon border border-border rounded-2xl p-6 space-y-5">
      <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Project & Rates</h3>
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Production Title</label>
        <input value={project} onChange={(e) => onProject(e.target.value.slice(0, 80))}
          className="w-full bg-obsidian border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary/60" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumField label="Day rate £" value={rates.dayRate} onChange={(v) => set("dayRate", v)} step={5} />
        <NumField label="Hourly £" value={rates.hourlyRate} onChange={(v) => set("hourlyRate", v)} step={0.5} />
        <NumField label="Basic hrs/day" value={rates.basicHours} onChange={(v) => set("basicHours", v)} />
        <NumField label="OT 1.5x hrs" value={rates.ot15Hours} onChange={(v) => set("ot15Hours", v)} />
        <NumField label="Night premium £" value={rates.nightPremium} onChange={(v) => set("nightPremium", v)} />
        <NumField label="VAT rate" value={rates.vatRate} onChange={(v) => set("vatRate", v)} step={0.01} />
        <NumField label="Kit £/day" value={rates.kitRentalPerDay || 0} onChange={(v) => set("kitRentalPerDay", v)} />
      </div>
      <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
        Set day rate &gt; 0 to charge a flat daily fee in place of basic-hour pay (pro-rated by hours worked). OT 1.5x / 2x and night premium still apply on top. Stored locally in your browser.
      </p>
    </div>
  );
};

const NumField = ({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</label>
    <input type="number" min={0} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      className="w-full bg-obsidian border border-border rounded-lg px-3 py-2 text-foreground font-mono tabular-nums focus:outline-none focus:border-primary/60" />
  </div>
);
