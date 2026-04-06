"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { AnalyticsChart } from "@/components/AnalyticsChart";
import {
  API_BASE,
  parseHistoryPayload,
  type HistoryRow,
} from "@/lib/api";

export default function AnalyticsPage() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/history`, { cache: "no-store" });
      if (!res.ok) {
        setErr(`HTTP ${res.status}`);
        setRows([]);
        return;
      }
      const json: unknown = await res.json();
      setRows(parseHistoryPayload(json));
      setErr(null);
    } catch {
      setErr("UNAVAILABLE");
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2 text-zinc-500">
          <Activity className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          <h1 className="font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-600">
            Analytics / SPY vs panic history
          </h1>
        </div>
        {err && (
          <span className="font-mono text-xs text-zinc-600">[{err}]</span>
        )}
      </div>
      <p className="mb-4 max-w-2xl font-mono text-xs leading-relaxed text-zinc-500">
        Candlesticks: SPY (Yahoo, proxied). Red area: panic_score from
        /api/history (left scale 0–100). Matte chart background matches
        zinc-950.
      </p>
      <AnalyticsChart history={rows} />
    </div>
  );
}
