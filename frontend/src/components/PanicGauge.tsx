"use client";

import { motion } from "framer-motion";

const CX = 100;
const CY = 100;
const NEEDLE_LEN = 70;
const ARC_RADIUS = 76;

const ZONE_COLORS = [
  "rgb(16 185 129)",
  "rgb(52 211 153)",
  "rgb(113 113 122)",
  "rgb(249 115 22)",
  "rgb(220 38 38)",
];

interface PanicGaugeProps {
  score: number | null;
  alert?: boolean;
  className?: string;
}

function needleRotateDeg(score: number): number {
  const s = Math.min(100, Math.max(0, score));
  return 180 * (1 - s / 100);
}

function polarPoint(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = (Math.PI / 180) * angleDeg;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function arcPath(startDeg: number, endDeg: number) {
  const start = polarPoint(CX, CY, ARC_RADIUS, startDeg);
  const end = polarPoint(CX, CY, ARC_RADIUS, endDeg);
  return `M ${start.x} ${start.y} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${end.x} ${end.y}`;
}

function scoreColor(score: number | null, alert: boolean): string {
  if (alert) {
    return "rgb(220 38 38)";
  }
  if (score === null || !Number.isFinite(score)) {
    return "rgb(161 161 170)";
  }
  const s = Math.min(100, Math.max(0, score));
  if (s <= 20) return ZONE_COLORS[0];
  if (s <= 40) return ZONE_COLORS[1];
  if (s <= 60) return ZONE_COLORS[2];
  if (s <= 80) return ZONE_COLORS[3];
  return ZONE_COLORS[4];
}

export function PanicGauge({
  score,
  alert = false,
  className = "",
}: PanicGaugeProps) {
  const rotate =
    score === null || !Number.isFinite(score)
      ? 180
      : needleRotateDeg(score);

  const displayScore =
    score !== null && Number.isFinite(score) ? score.toFixed(2) : "—";

  const needleColor = scoreColor(score, alert);

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      <motion.div
        className={`relative border bg-zinc-950 p-4 ${
          alert ? "border-red-600" : "border-zinc-800"
        }`}
        animate={
          alert
            ? {
                borderColor: [
                  "rgb(220 38 38)",
                  "rgb(127 29 29)",
                  "rgb(220 38 38)",
                ],
              }
            : { borderColor: "rgb(39 39 42)" }
        }
        transition={
          alert
            ? { duration: 1.2, repeat: Infinity, ease: "linear" }
            : { duration: 0.2 }
        }
      >
        <svg
          width="220"
          height="130"
          viewBox="0 0 200 120"
          className="block"
          aria-hidden
        >
          {ZONE_COLORS.map((color, idx) => {
            const start = 180 - idx * 36;
            const end = 180 - (idx + 1) * 36;
            return (
              <path
                key={color}
                d={arcPath(start, end)}
                fill="none"
                stroke={color}
                strokeWidth="8"
                strokeLinecap="butt"
              />
            );
          })}

          {Array.from({ length: 6 }).map((_, idx) => {
            const angle = 180 - idx * 36;
            const outer = polarPoint(CX, CY, ARC_RADIUS + 2, angle);
            const inner = polarPoint(CX, CY, ARC_RADIUS - 10, angle);
            return (
              <line
                key={`tick-${idx}`}
                x1={outer.x}
                y1={outer.y}
                x2={inner.x}
                y2={inner.y}
                stroke="rgb(63 63 70)"
                strokeWidth="1"
              />
            );
          })}

          <line
            x1="24"
            y1="100"
            x2="40"
            y2="100"
            stroke="rgb(82 82 91)"
            strokeWidth="1"
          />
          <line
            x1="176"
            y1="100"
            x2="160"
            y2="100"
            stroke="rgb(82 82 91)"
            strokeWidth="1"
          />
          <text
            x="20"
            y="112"
            fill="rgb(113 113 122)"
            fontSize="8"
            fontFamily="ui-monospace, monospace"
          >
            0
          </text>
          <text
            x="168"
            y="112"
            fill="rgb(113 113 122)"
            fontSize="8"
            fontFamily="ui-monospace, monospace"
          >
            100
          </text>
          <g transform={`translate(${CX} ${CY})`}>
            <motion.g
              initial={false}
              animate={{ rotate }}
              transition={{
                type: "spring",
                stiffness: 120,
                damping: 24,
                mass: 0.85,
              }}
            >
              <line
                x1={0}
                y1={0}
                x2={NEEDLE_LEN}
                y2={0}
                stroke={needleColor}
                strokeWidth="2"
                strokeLinecap="square"
              />
            </motion.g>
          </g>
          <circle
            cx={CX}
            cy={CY}
            r="4"
            fill="rgb(24 24 27)"
            stroke="rgb(63 63 70)"
            strokeWidth="1"
          />
        </svg>
      </motion.div>
      <p className="mt-3 font-mono text-xs tabular-nums text-zinc-500">
        SCORE{" "}
        <span style={{ color: needleColor }}>
          {displayScore}
        </span>
      </p>
    </div>
  );
}
