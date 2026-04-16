"use client";

import { Activity, AlertTriangle, BarChart3 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { AnalyticsChart } from "@/components/AnalyticsChart";

const TICKER_PATTERN = /^[A-Z][A-Z0-9.-]{0,9}$/;

function normalizeTickerInput(raw: string): string {
  const cleaned = raw.trim().toUpperCase();
  if (!cleaned || cleaned === "ALL") {
    return "SPY";
  }
  return cleaned;
}

export default function AnalyticsPage() {
  const [tickerInput, setTickerInput] = useState("SPY");
  const [activeTicker, setActiveTicker] = useState("SPY");

  const normalizedInput = tickerInput.trim().toUpperCase();
  const isEmptyInput = normalizedInput.length === 0;
  const isAllAlias = normalizedInput === "ALL";
  const isTickerValid = isEmptyInput || isAllAlias || TICKER_PATTERN.test(normalizedInput);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isTickerValid) {
      return;
    }
    const nextTicker = normalizeTickerInput(tickerInput);
    setTickerInput(nextTicker);
    setActiveTicker(nextTicker);
  }

  const intelText = useMemo(
    () =>
      `${activeTicker} 5-minute candlesticks proxied from Yahoo Finance for responsive, zero-key market context.`,
    [activeTicker],
  );

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

        <form
          onSubmit={onSubmit}
          className="mb-4 flex flex-wrap items-center gap-2 border border-zinc-800 bg-zinc-900/40 p-3"
        >
          <label htmlFor="ticker-search" className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Ticker
          </label>
          <input
            id="ticker-search"
            name="ticker"
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setTickerInput("");
              }
            }}
            placeholder="SPY"
            autoComplete="off"
            className={`h-9 w-[160px] border bg-zinc-950 px-3 font-mono text-sm uppercase tracking-wide text-zinc-200 outline-none transition-colors placeholder:text-zinc-600 ${isTickerValid ? "border-zinc-700 focus:border-zinc-500" : "border-red-700 focus:border-red-500"}`}
          />
          <button
            type="submit"
            disabled={!isTickerValid}
            className="h-9 border border-zinc-700 bg-zinc-900 px-4 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600"
          >
            Load
          </button>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            Active: {activeTicker}
          </span>
          <span
            className={`w-full font-mono text-[10px] uppercase tracking-[0.14em] ${isTickerValid ? "text-zinc-600" : "text-red-400"}`}
            role="status"
          >
            {isTickerValid
              ? "Hint: Enter = load, Esc = clear, ALL maps to SPY"
              : "Invalid ticker format. Use letters/numbers/dot/dash (max 10)."}
          </span>
        </form>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="mb-2 flex items-center gap-2 text-zinc-500">
              <BarChart3 className="h-3.5 w-3.5" aria-hidden />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
                Market tape
              </span>
            </div>
            <p className="font-mono text-xs leading-relaxed text-zinc-400">
              {intelText}
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

      <AnalyticsChart ticker={activeTicker} />
    </div>
  );
}
