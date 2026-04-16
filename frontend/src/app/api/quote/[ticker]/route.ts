import { NextResponse } from "next/server";

type YahooChartResult = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
        }>;
      };
    }>;
  };
};

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

function normalizeTicker(rawTicker: string): string {
  const normalized = rawTicker.trim().toUpperCase();
  if (!normalized || normalized === "ALL") {
    return "SPY";
  }
  return normalized;
}

export async function GET(
  _request: Request,
  context: { params: { ticker: string } },
) {
  const resolvedTicker = normalizeTicker(context.params.ticker);
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(resolvedTicker)}?interval=5m&range=1d`;

  try {
    const upstream = await fetch(yahooUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DoomScroll/1.0)" },
      next: { revalidate: 60 },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Failed to fetch ${resolvedTicker} data from Yahoo Finance.` },
        { status: 502 },
      );
    }

    const json = (await upstream.json()) as YahooChartResult;
    const result = json.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const quote = result?.indicators?.quote?.[0];

    if (!quote || timestamps.length === 0) {
      return NextResponse.json([] satisfies Candle[]);
    }

    const candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i += 1) {
      const time = timestamps[i];
      const open = quote.open?.[i];
      const high = quote.high?.[i];
      const low = quote.low?.[i];
      const close = quote.close?.[i];

      if (
        typeof time !== "number" ||
        typeof open !== "number" ||
        typeof high !== "number" ||
        typeof low !== "number" ||
        typeof close !== "number"
      ) {
        continue;
      }

      if (
        !Number.isFinite(time) ||
        !Number.isFinite(open) ||
        !Number.isFinite(high) ||
        !Number.isFinite(low) ||
        !Number.isFinite(close)
      ) {
        continue;
      }

      candles.push({ time, open, high, low, close });
    }

    return NextResponse.json(candles);
  } catch {
    return NextResponse.json(
      { error: `Unable to process ${resolvedTicker} market data.` },
      { status: 500 },
    );
  }
}
