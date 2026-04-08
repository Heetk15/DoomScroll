"use client";

import {
  ColorType,
  createChart,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import { API_BASE, parseHistoryPayload } from "@/lib/api";

type SpyCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type TooltipState = {
  visible: boolean;
  x: number;
  y: number;
  headline: string;
};

interface AnalyticsChartProps {
  className?: string;
  history?: unknown;
}

function timeToUnixSeconds(time: Time): number | null {
  if (typeof time === "number") {
    return time;
  }
  if ("year" in time && "month" in time && "day" in time) {
    const millis = Date.UTC(time.year, time.month - 1, time.day);
    return Math.floor(millis / 1000);
  }
  return null;
}

function toUTCTimestamp(value: string): UTCTimestamp | null {
  const millis = Date.parse(value);
  if (Number.isNaN(millis)) {
    return null;
  }
  return Math.floor(millis / 1000) as UTCTimestamp;
}

export function AnalyticsChart({ className = "" }: AnalyticsChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const histogramSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const historyHeadlineMapRef = useRef<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    headline: "",
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    const chart = createChart(el, {
      width: el.clientWidth,
      height: 460,
      layout: {
        background: { type: ColorType.Solid, color: "#09090b" },
        textColor: "#71717a",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      },
      grid: {
        vertLines: { color: "#18181b" },
        horzLines: { color: "#18181b" },
      },
      rightPriceScale: {
        borderColor: "#27272a",
        scaleMargins: { top: 0.08, bottom: 0.24 },
      },
      leftPriceScale: {
        visible: false,
      },
      timeScale: {
        borderColor: "#27272a",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: "#52525b" },
        horzLine: { color: "#52525b" },
      },
    });

    const candles = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      priceScaleId: "right",
    });

    const panicHistogram = chart.addHistogramSeries({
      priceScaleId: "panic",
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
      base: 0,
    });
    panicHistogram.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candles;
    histogramSeriesRef.current = panicHistogram;

    const onCrosshairMove = (param: MouseEventParams<Time>) => {
      if (!param.time || !param.point) {
        setTooltip((prev) => ({ ...prev, visible: false }));
        return;
      }

      const unixTime = timeToUnixSeconds(param.time);
      if (unixTime === null) {
        setTooltip((prev) => ({ ...prev, visible: false }));
        return;
      }

      const headline = historyHeadlineMapRef.current.get(unixTime);
      if (!headline) {
        setTooltip((prev) => ({ ...prev, visible: false }));
        return;
      }

      const maxX = el.clientWidth - 320;
      const x = Math.min(Math.max(8, param.point.x + 16), Math.max(8, maxX));
      const y = Math.max(8, param.point.y + 16);
      setTooltip({ visible: true, x, y, headline });
    };

    chart.subscribeCrosshairMove(onCrosshairMove);

    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || !chartRef.current) {
        return;
      }
      chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
    });
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
      chart.unsubscribeCrosshairMove(onCrosshairMove);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      histogramSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadData() {
      if (!candleSeriesRef.current || !histogramSeriesRef.current || !chartRef.current) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [spyRes, historyRes] = await Promise.all([
          fetch("/api/spy", { cache: "no-store" }),
          fetch(`${API_BASE}/api/history`, { cache: "no-store" }),
        ]);

        if (!spyRes.ok) {
          throw new Error(`SPY feed failed (${spyRes.status})`);
        }
        if (!historyRes.ok) {
          throw new Error(`History feed failed (${historyRes.status})`);
        }

        const spyJson: unknown = await spyRes.json();
        const historyJson: unknown = await historyRes.json();

        const rawSpy = Array.isArray(spyJson) ? spyJson : [];
        const spyCandles: CandlestickData<UTCTimestamp>[] = [];
        for (const item of rawSpy) {
          if (!item || typeof item !== "object") {
            continue;
          }
          const row = item as Record<string, unknown>;
          const time = row.time;
          const open = row.open;
          const high = row.high;
          const low = row.low;
          const close = row.close;
          if (
            typeof time !== "number" ||
            typeof open !== "number" ||
            typeof high !== "number" ||
            typeof low !== "number" ||
            typeof close !== "number"
          ) {
            continue;
          }
          spyCandles.push({
            time: time as UTCTimestamp,
            open,
            high,
            low,
            close,
          });
        }
        spyCandles.sort((a, b) => a.time - b.time);

        const historyRows = parseHistoryPayload(historyJson);
        const panicBars: HistogramData<UTCTimestamp>[] = [];
        const headlineMap = new Map<number, string>();

        for (const row of historyRows) {
          const ts = toUTCTimestamp(row.timestamp);
          if (ts === null) {
            continue;
          }
          panicBars.push({
            time: ts,
            value: row.panic_score,
            color: row.panic_score > 80 ? "#ef4444" : "rgba(113,113,122,0.5)",
          });
          headlineMap.set(ts, row.top_headline);
        }
        panicBars.sort((a, b) => a.time - b.time);

        if (!active) {
          return;
        }

        historyHeadlineMapRef.current = headlineMap;
        candleSeriesRef.current.setData(spyCandles);
        histogramSeriesRef.current.setData(panicBars);
        chartRef.current.timeScale().fitContent();
      } catch (err) {
        if (!active) {
          return;
        }
        const message =
          err instanceof Error ? err.message : "Failed to load analytics data";
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadData();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className={`relative w-full min-h-[460px] border border-zinc-800 bg-zinc-950 ${className}`}>
      <div ref={containerRef} className="h-[460px] w-full" />

      {tooltip.visible && (
        <div
          className="pointer-events-none absolute z-20 max-w-xs rounded border border-zinc-700 bg-zinc-900/95 p-2 font-mono text-xs text-zinc-200 shadow-xl"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.headline}
        </div>
      )}

      {loading && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/70 font-mono text-xs uppercase tracking-wider text-zinc-400">
          Loading analytics...
        </div>
      )}

      {error && (
        <div className="absolute bottom-3 left-3 right-3 z-10 rounded border border-red-900/60 bg-red-950/40 px-3 py-2 font-mono text-xs text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
