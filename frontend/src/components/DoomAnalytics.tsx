"use client";

import { motion } from "framer-motion";
import { Mountain, Timer } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE, parseHistoryPayload, type HistoryRow } from "@/lib/api";

function formatPeakTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "NO DATA";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(d);
}

function peakFromRows(rows: HistoryRow[]): {
  score: number | null;
  headline: string;
  when: string;
} {
  if (rows.length === 0) {
    return { score: null, headline: "NO DATA", when: "NO DATA" };
  }
  let best = rows[0];
  for (const r of rows) {
    if (r.panic_score > best.panic_score) best = r;
  }
  return {
    score: best.panic_score,
    headline: best.top_headline.trim() || "NO DATA",
    when: formatPeakTimestamp(best.timestamp),
  };
}

interface DoomAnalyticsProps {
  alert?: boolean;
}

export function DoomAnalytics({ alert = false }: DoomAnalyticsProps) {
  const edge = alert ? "border-red-600" : "border-zinc-800";
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/history?ticker=ALL`, { cache: "no-store" });
      if (!res.ok) {
        setFetchError(`HTTP ${res.status}`);
        setRows([]);
        return;
      }
      const json: unknown = await res.json();
      setRows(parseHistoryPayload(json));
      setFetchError(null);
    } catch {
      setFetchError("UNAVAILABLE");
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const peak = useMemo(() => peakFromRows(rows), [rows]);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, delay: 0.05 }}
      className={`flex h-full min-h-[220px] flex-col border bg-zinc-950 p-6 ${edge}`}
    >
      <div className="mb-4 flex items-center gap-2 text-zinc-500">
        <Mountain className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        <span className="text-xs uppercase tracking-[0.2em]">
          Historical max
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-3">
        <span className="text-[10px] uppercase tracking-widest text-zinc-500">
          Peak panic
        </span>
        <div className="flex items-baseline gap-2">
          {peak.score !== null ? (
            <span className="font-mono text-4xl font-semibold tabular-nums text-[#f97316] sm:text-5xl">
              {peak.score.toFixed(2)}
            </span>
          ) : (
            <span className="font-mono text-4xl text-zinc-600 sm:text-5xl">
              NO DATA
            </span>
          )}
        </div>

        <p className="max-w-prose font-mono text-sm leading-relaxed text-zinc-400">
          {peak.headline === "NO DATA" ? (
            <span className="text-zinc-600">NO DATA</span>
          ) : (
            peak.headline
          )}
        </p>

        <div className="mt-2 flex items-start gap-2 text-zinc-500">
          <Timer className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          <span className="font-mono text-xs tabular-nums">
            {peak.when === "NO DATA" ? (
              <span className="text-zinc-600">NO DATA</span>
            ) : (
              peak.when
            )}
          </span>
        </div>
      </div>

      {fetchError && (
        <p className="mt-4 font-mono text-xs text-zinc-600">
          [{fetchError}]
        </p>
      )}
    </motion.section>
  );
}
