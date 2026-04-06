"use client";

import { Cpu } from "lucide-react";
import { useState } from "react";
import { DoomAnalytics } from "@/components/DoomAnalytics";
import { SentimentMonitor } from "@/components/SentimentMonitor";

export default function DashboardPage() {
  const [panicScore, setPanicScore] = useState<number | null>(null);

  const defcon = panicScore !== null && panicScore > 90;
  const edge = defcon ? "border-red-600" : "border-zinc-800";

  return (
    <div className="relative">
      {defcon && (
        <div
          className="fixed left-0 right-0 top-0 z-50 h-[10px] bg-red-600"
          aria-hidden
        />
      )}

      <div className={defcon ? "pt-[10px]" : ""}>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <h1 className="font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-600">
            Command center / Live monitor
          </h1>
          <span className="flex items-center gap-2 font-mono text-[10px] text-zinc-600">
            <Cpu className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            DEFCON if panic &gt; 90
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SentimentMonitor onPanicScore={setPanicScore} alert={defcon} />
          <DoomAnalytics alert={defcon} />
          <div
            className={`flex min-h-[280px] flex-col justify-center border bg-zinc-950 p-6 ${edge}`}
          >
            <span className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Alert threshold
            </span>
            <p className="font-mono text-sm text-zinc-400">
              DEFCON band:{" "}
              <span className="text-[#f97316]">panic_score &gt; 90</span>
            </p>
            <p className="mt-4 font-mono text-xs leading-relaxed text-zinc-600">
              Gauge border pulses red in band. Matte only — no gradients,
              glow, or shadows.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
