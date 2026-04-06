import { NextResponse } from "next/server";

type YahooChartResult = {
  chart?: {
    result?: Array<{
      timestamp: number[];
      indicators?: {
        quote?: Array<{
          open: (number | null)[];
          high: (number | null)[];
          low: (number | null)[];
          close: (number | null)[];
        }>;
      };
    }>;
  };
};

export async function GET() {
  try {
    const url =
      "https://query1.finance.yahoo.com/v8/finance/chart/SPY?range=6mo&interval=1d";
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DoomScroll/1.0)",
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "upstream", candles: [] },
        { status: 502 },
      );
    }
    const data = (await res.json()) as YahooChartResult;
    const result = data.chart?.result?.[0];
    const ts = result?.timestamp;
    const q = result?.indicators?.quote?.[0];
    if (!ts || !q) {
      return NextResponse.json({ candles: [] });
    }

    const candles: {
      time: number;
      open: number;
      high: number;
      low: number;
      close: number;
    }[] = [];

    for (let i = 0; i < ts.length; i++) {
      const open = q.open[i];
      const high = q.high[i];
      const low = q.low[i];
      const close = q.close[i];
      if (
        open == null ||
        high == null ||
        low == null ||
        close == null ||
        !Number.isFinite(open + high + low + close)
      ) {
        continue;
      }
      candles.push({
        time: ts[i] as number,
        open,
        high,
        low,
        close,
      });
    }

    return NextResponse.json({ candles });
  } catch {
    return NextResponse.json(
      { error: "fetch_failed", candles: [] },
      { status: 500 },
    );
  }
}
