"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE, parseHistoryPayload, type HistoryRow } from "@/lib/api";

const FEED_POLL_MS = 60_000;

const listVariants = {
  show: {
    transition: {
      staggerChildren: 0.035,
    },
  },
};

const rowVariants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.18 } },
};

function formatTimestamp(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) {
    return "INVALID TIME";
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(dt);
}

function badgeClasses(score: number): string {
  if (score > 60) {
    return "border-red-700/70 bg-red-950/50 text-red-300";
  }
  if (score < 40) {
    return "border-emerald-700/70 bg-emerald-950/40 text-emerald-300";
  }
  return "border-zinc-700 bg-zinc-900 text-zinc-300";
}

function byNewest(a: HistoryRow, b: HistoryRow): number {
  return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
}

export function RawIntelFeed() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);
  const [nowTs, setNowTs] = useState<number>(Date.now());

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/history?ticker=ALL`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        setRows([]);
        return;
      }
      const payload: unknown = await res.json();
      setRows(parseHistoryPayload(payload));
      setLastRefreshAt(Date.now());
      setError(null);
    } catch {
      setError("UNAVAILABLE");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), FEED_POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowTs(Date.now());
    }, 1_000);
    return () => window.clearInterval(id);
  }, []);

  const sortedRows = useMemo(() => {
    const clone = [...rows];
    clone.sort(byNewest);
    return clone;
  }, [rows]);

  const refreshLabel = useMemo(() => {
    if (loading && lastRefreshAt === null) {
      return "SYNCING";
    }
    if (lastRefreshAt === null) {
      return "NO SYNC";
    }
    const elapsedSeconds = Math.max(0, Math.floor((nowTs - lastRefreshAt) / 1000));
    if (elapsedSeconds < 60) {
      return `${elapsedSeconds}s AGO`;
    }
    const mins = Math.floor(elapsedSeconds / 60);
    return `${mins}m AGO`;
  }, [lastRefreshAt, loading, nowTs]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex h-full min-h-[520px] flex-col border border-zinc-800 bg-zinc-950"
    >
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">
          Raw Intel Feed
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
          LIVE / ALL / {refreshLabel}
        </span>
      </div>

      <div className="h-full overflow-y-auto px-4 py-3">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={`skeleton-${idx}`} className="animate-pulse border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="mb-2 h-3 w-24 bg-zinc-800" />
                <div className="h-3 w-full bg-zinc-800" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="border border-red-900/60 bg-red-950/40 p-3 font-mono text-xs text-red-300">
            [{error}] RAW INTEL UNAVAILABLE
          </div>
        )}

        {!loading && !error && sortedRows.length === 0 && (
          <div className="border border-zinc-800 bg-zinc-900/30 p-3 font-mono text-xs text-zinc-500">
            NO RECORDS RECEIVED
          </div>
        )}

        {!loading && !error && sortedRows.length > 0 && (
          <motion.ul
            initial="hidden"
            animate="show"
            variants={listVariants}
            className="space-y-3"
          >
            {sortedRows.map((row) => (
              <motion.li
                key={row.id}
                variants={rowVariants}
                className="border border-zinc-800 bg-zinc-900/30 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${badgeClasses(row.panic_score)}`}>
                    {row.panic_score.toFixed(1)}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500">
                    {formatTimestamp(row.timestamp)}
                  </span>
                </div>
                <p className="font-mono text-xs leading-relaxed text-zinc-300">
                  {row.top_headline.trim() || "NO HEADLINE"}
                </p>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>
    </motion.section>
  );
}
