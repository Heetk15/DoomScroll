"use client";

import dynamic from "next/dynamic";
import { Share2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE, parseFullSentimentPayload } from "@/lib/api";
import { buildKeywordGraph } from "@/lib/keywords";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[480px] items-center justify-center border border-zinc-800 bg-zinc-950 font-mono text-xs text-zinc-600">
      Loading graph…
    </div>
  ),
});

type GraphData = {
  nodes: { id: string; name: string }[];
  links: { source: string; target: string }[];
};

const EMPTY: GraphData = { nodes: [], links: [] };

const GRAPH_H = 480;

export default function NodesPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [data, setData] = useState<GraphData>(EMPTY);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(320, el.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sentiment`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setErr(`HTTP ${res.status}`);
        setData(EMPTY);
        return;
      }
      const json: unknown = await res.json();
      const full = parseFullSentimentPayload(json);
      const g = buildKeywordGraph(full.headlines);
      setData(
        g.nodes.length > 0 ? { nodes: g.nodes, links: g.links } : EMPTY,
      );
      setErr(null);
    } catch {
      setErr("UNAVAILABLE");
      setData(EMPTY);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2 text-zinc-500">
          <Share2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          <h1 className="font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-600">
            Contagion web / keyword co-occurrence
          </h1>
        </div>
        {err && (
          <span className="font-mono text-xs text-zinc-600">[{err}]</span>
        )}
      </div>
      <p className="mb-4 max-w-2xl font-mono text-xs leading-relaxed text-zinc-500">
        Keywords tokenized from current /api/sentiment headlines. Edges connect
        terms that appear in the same headline (matte zinc/silver nodes).
      </p>
      <div
        ref={containerRef}
        className="w-full border border-zinc-800 bg-zinc-950"
      >
        {data.nodes.length === 0 ? (
          <div
            className="flex items-center justify-center font-mono text-sm text-zinc-600"
            style={{ height: GRAPH_H }}
          >
            NO DATA — empty headlines
          </div>
        ) : (
          <ForceGraph2D
            width={width}
            height={GRAPH_H}
            graphData={data}
            nodeLabel="name"
            nodeRelSize={5}
            linkColor={() => "#3f3f46"}
            linkWidth={1}
            backgroundColor="#09090b"
            nodeCanvasObjectMode={() => "after"}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const label = (node as { name?: string }).name ?? "";
              const fontSize = 11 / globalScale;
              ctx.font = `${fontSize}px ui-monospace, monospace`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillStyle = "#d4d4d8";
              ctx.fillText(
                label,
                node.x ?? 0,
                (node.y ?? 0) + 14 / globalScale,
              );
            }}
            nodeColor={() => "#71717a"}
          />
        )}
      </div>
    </div>
  );
}
