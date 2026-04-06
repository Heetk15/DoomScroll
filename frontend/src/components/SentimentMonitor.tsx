"use client";

import { motion } from "framer-motion";
import { Activity, Radio } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  API_BASE,
  parseFullSentimentPayload,
} from "@/lib/api";
import { PanicGauge } from "@/components/PanicGauge";

const POLL_MS = 15_000;

interface SentimentMonitorProps {
  onPanicScore?: (score: number | null) => void;
  alert?: boolean;
}

export function SentimentMonitor({
  onPanicScore,
  alert = false,
}: SentimentMonitorProps) {
  const edge = alert ? "border-red-600" : "border-zinc-800";
  const [panicScore, setPanicScore] = useState<number | null>(null);
  const [headline, setHeadline] = useState<string>("NO DATA");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sentiment`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        setPanicScore(null);
        setHeadline("NO DATA");
        onPanicScore?.(null);
        return;
      }
      const json: unknown = await res.json();
      const full = parseFullSentimentPayload(json);
      setError(null);
      setPanicScore(full.panic_score);
      if (full.headlines.length > 0) {
        setHeadline(full.headlines[0]);
      } else {
        setHeadline("NO DATA");
      }
      onPanicScore?.(full.panic_score);
    } catch {
      setError("UNAVAILABLE");
      setPanicScore(null);
      setHeadline("NO DATA");
      onPanicScore?.(null);
    }
  }, [onPanicScore]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className={`flex h-full min-h-[280px] flex-col border bg-zinc-950 p-6 ${edge}`}
    >
      <div className="mb-4 flex items-center gap-2 text-zinc-500">
        <Radio className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        <span className="text-xs uppercase tracking-[0.2em]">
          Live sentiment
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center gap-4">
        <PanicGauge score={panicScore} alert={alert} />
        {error && (
          <p className="font-mono text-xs text-zinc-600">[{error}]</p>
        )}
        <p className="w-full max-w-prose font-mono text-sm leading-relaxed text-zinc-400">
          {headline === "NO DATA" ? (
            <span className="text-zinc-600">NO DATA</span>
          ) : (
            headline
          )}
        </p>
      </div>

      <div
        className={`mt-6 flex items-center gap-2 border-t pt-4 text-zinc-600 ${edge}`}
      >
        <Activity className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
        <span className="font-mono text-[10px] uppercase tracking-wider">
          Interval {POLL_MS / 1000}s
        </span>
      </div>
    </motion.section>
  );
}
