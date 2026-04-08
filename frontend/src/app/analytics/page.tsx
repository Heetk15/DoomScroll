"use client";

import { Activity, AlertTriangle, BarChart3 } from "lucide-react";
import { AnalyticsChart } from "@/components/AnalyticsChart";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2 text-zinc-500">
            <Activity className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            <h1 className="font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-500">
              Analytics / SPY vs panic signal
            </h1>
          </div>
          <span className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400">
            Real-time overlay
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="mb-2 flex items-center gap-2 text-zinc-500">
              <BarChart3 className="h-3.5 w-3.5" aria-hidden />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
                Market tape
              </span>
            </div>
            <p className="font-mono text-xs leading-relaxed text-zinc-400">
              SPY 5-minute candlesticks proxied from Yahoo Finance for
              responsive, zero-key market context.
            </p>
          </div>

          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="mb-2 flex items-center gap-2 text-zinc-500">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
                Panic engine
              </span>
            </div>
            <p className="font-mono text-xs leading-relaxed text-zinc-400">
              FinBERT-derived panic bars are pinned to the lower panel. Scores
              above 80 are highlighted in red.
            </p>
          </div>

          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="mb-2 flex items-center gap-2 text-zinc-500">
              <Activity className="h-3.5 w-3.5" aria-hidden />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
                Signal intel
              </span>
            </div>
            <p className="font-mono text-xs leading-relaxed text-zinc-400">
              Hover crosshair to inspect the exact headline that generated each
              historical panic datapoint.
            </p>
          </div>
        </div>
      </header>

      <AnalyticsChart />
    </div>
  );
}
