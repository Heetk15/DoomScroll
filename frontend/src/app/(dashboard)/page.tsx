"use client";

import { Cpu } from "lucide-react";
import { useState } from "react";
import { DoomAnalytics } from "@/components/DoomAnalytics";
import { RawIntelFeed } from "@/components/RawIntelFeed";
import { SentimentMonitor } from "@/components/SentimentMonitor";

export default function DashboardPage() {
  const [panicScore, setPanicScore] = useState<number | null>(null);

  const isFiniteScore = panicScore !== null && Number.isFinite(panicScore);
  const defcon = isFiniteScore && panicScore >= 80;
  const edge = defcon ? "border-red-600" : "border-zinc-800";

  let signalBanner = {
    text: "[i] SYSTEM STATUS: MARKET SENTIMENT NORMAL.",
    classes: "border-zinc-800 bg-zinc-900/40 text-zinc-400",
  };

  if (isFiniteScore && panicScore >= 80) {
    signalBanner = {
      text: "[!] SYSTEM ALERT: PEAK PANIC DETECTED. CONTRARIAN BUY SIGNAL GENERATED.",
      classes: "border-red-700 bg-red-950/60 text-red-300 animate-pulse",
    };
  } else if (isFiniteScore && panicScore <= 20) {
    signalBanner = {
      text: "[!] SYSTEM ALERT: EXTREME GREED DETECTED. CONTRARIAN SELL SIGNAL GENERATED.",
      classes: "border-emerald-700 bg-emerald-950/40 text-emerald-300 animate-pulse",
    };
  } else if (isFiniteScore && panicScore > 20 && panicScore < 80) {
    signalBanner = {
      text: "[i] SYSTEM STATUS: MARKET SENTIMENT NORMAL.",
      classes: "border-zinc-800 bg-zinc-900/40 text-zinc-400",
    };
  }

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
            Macro terminal / Behavioral finance core
          </h1>
          <span className="flex items-center gap-2 font-mono text-[10px] text-zinc-600">
            <Cpu className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            CONTRARIAN ENGINE ONLINE
          </span>
        </div>

        <div className={`mb-4 border px-4 py-3 font-mono text-xs tracking-wide ${signalBanner.classes}`}>
          {signalBanner.text}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <SentimentMonitor onPanicScore={setPanicScore} alert={defcon} />
            <div
              className={`flex min-h-[160px] flex-col justify-center border bg-zinc-950 p-6 ${edge}`}
            >
              <span className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                Contrarian matrix
              </span>
              <p className="font-mono text-sm text-zinc-400">
                BUY zone: <span className="text-red-300">panic_score &gt;= 80</span>
              </p>
              <p className="mt-2 font-mono text-sm text-zinc-400">
                SELL zone: <span className="text-emerald-300">panic_score &lt;= 20</span>
              </p>
            </div>
            <DoomAnalytics alert={defcon} />
          </div>
          <RawIntelFeed />
        </div>
      </div>
    </div>
  );
}
