import { useEffect, useState } from "react";
import type { DayEntry, RateConfig } from "@/lib/calc";
import { DEFAULT_RATES } from "@/lib/calc";

const ENTRIES_KEY = "slatetrack.entries.v1";
const RATES_KEY = "slatetrack.rates.v1";
const PROJECT_KEY = "slatetrack.project.v1";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useEntries() {
  const [entries, setEntries] = useState<DayEntry[]>(() => load(ENTRIES_KEY, []));
  const [rates, setRates] = useState<RateConfig>(() => {
    const stored = load<Partial<RateConfig>>(RATES_KEY, {});
    // Merge with defaults so older saves get new fields (perDiem, dayTypeRates).
    return {
      ...DEFAULT_RATES,
      ...stored,
      dayTypeRates: { ...DEFAULT_RATES.dayTypeRates, ...(stored.dayTypeRates || {}) },
    };
  });
  const [project, setProject] = useState<string>(() => load(PROJECT_KEY, "Untitled Production"));

  useEffect(() => { localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries)); }, [entries]);
  useEffect(() => { localStorage.setItem(RATES_KEY, JSON.stringify(rates)); }, [rates]);
  useEffect(() => { localStorage.setItem(PROJECT_KEY, JSON.stringify(project)); }, [project]);

  const addEntry = (e: Omit<DayEntry, "id">) =>
    setEntries((prev) => [{ ...e, id: crypto.randomUUID() }, ...prev]);
  const updateEntry = (id: string, patch: Partial<DayEntry>) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const removeEntry = (id: string) =>
    setEntries((prev) => prev.filter((e) => e.id !== id));
  const clearAll = () => setEntries([]);

  return { entries, addEntry, updateEntry, removeEntry, clearAll, rates, setRates, project, setProject };
}
