  "use client";

  import {
    ColorType,
    createChart,
    type IChartApi,
    type UTCTimestamp,
  } from "lightweight-charts";
  import { useEffect, useRef } from "react";
  import type { HistoryRow } from "@/lib/api";

  interface AnalyticsChartProps {
    history: HistoryRow[];
    className?: string;
  }

  function toUtcTimestamp(iso: string): UTCTimestamp | null {
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return null;
    return Math.floor(t / 1000) as UTCTimestamp;
  }

  export function AnalyticsChart({ history, className = "" }: AnalyticsChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const chart = createChart(el, {
        layout: {
          background: { type: ColorType.Solid, color: "#09090b" },
          textColor: "#a1a1aa",
          fontFamily: "ui-monospace, monospace",
        },
        grid: {
          vertLines: { color: "#27272a" },
          horzLines: { color: "#27272a" },
        },
        width: el.clientWidth,
        height: 420,
        rightPriceScale: {
          borderColor: "#27272a",
          scaleMargins: { top: 0.12, bottom: 0.28 },
        },
        leftPriceScale: {
          borderColor: "#27272a",
          visible: true,
          scaleMargins: { top: 0.72, bottom: 0.02 },
        },
        timeScale: {
          borderColor: "#27272a",
          timeVisible: true,
          secondsVisible: false,
        },
      });

      const candle = chart.addCandlestickSeries({
        upColor: "#f97316",
        downColor: "#a1a1aa",
        borderVisible: false,
        wickUpColor: "#f97316",
        wickDownColor: "#a1a1aa",
        priceScaleId: "right",
      });

      const area = chart.addAreaSeries({
        lineColor: "#dc2626",
        topColor: "rgba(220, 38, 38, 0.35)",
        bottomColor: "rgba(220, 38, 38, 0)",
        lineWidth: 2,
        priceScaleId: "left",
        priceFormat: { type: "price", precision: 2, minMove: 0.01 },
      });

      chartRef.current = chart;

      const ro = new ResizeObserver(() => {
        if (!containerRef.current || !chartRef.current) return;
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      });
      ro.observe(el);

      let cancelled = false;

      async function load() {
        const res = await fetch("/api/spy", { cache: "no-store" });
        const json: unknown = await res.json();
        const candles =
          json &&
          typeof json === "object" &&
          "candles" in json &&
          Array.isArray((json as { candles: unknown }).candles)
            ? (json as { candles: unknown[] }).candles
            : [];

        if (cancelled) return;

        const candleData: {
          time: UTCTimestamp;
          open: number;
          high: number;
          low: number;
          close: number;
        }[] = [];

        for (const c of candles) {
          if (c === null || typeof c !== "object") continue;
          const o = c as Record<string, unknown>;
          const time = o.time;
          if (typeof time !== "number") continue;
          const open = o.open;
          const high = o.high;
          const low = o.low;
          const close = o.close;
          if (
            typeof open !== "number" ||
            typeof high !== "number" ||
            typeof low !== "number" ||
            typeof close !== "number"
          ) {
            continue;
          }
          candleData.push({
            time: time as UTCTimestamp,
            open,
            high,
            low,
            close,
          });
        }

        candleData.sort((a, b) => a.time - b.time);
        candle.setData(candleData);

        const panicData: { time: UTCTimestamp; value: number }[] = [];
        for (const row of history) {
          const tm = toUtcTimestamp(row.timestamp);
          if (tm === null) continue;
          panicData.push({ time: tm, value: row.panic_score });
        }
        panicData.sort((a, b) => a.time - b.time);
        area.setData(panicData);

        if (candleData.length > 0) {
          chart.timeScale().fitContent();
        }
      }

      void load();

      return () => {
        cancelled = true;
        ro.disconnect();
        chart.remove();
        chartRef.current = null;
      };
    }, [history]);

    return (
      <div
        ref={containerRef}
        className={`w-full min-h-[420px] border border-zinc-800 bg-zinc-950 ${className}`}
      />
    );
  }
