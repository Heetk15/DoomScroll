"use client";

import { motion } from "framer-motion";

const CX = 100;
const CY = 100;
const NEEDLE_LEN = 72;

interface PanicGaugeProps {
  score: number | null;
  alert?: boolean;
  className?: string;
}

function needleRotateDeg(score: number): number {
  const s = Math.min(100, Math.max(0, score));
  return 180 * (1 - s / 100);
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
          <path
            d="M 24 100 A 76 76 0 0 1 176 100"
            fill="none"
            stroke="rgb(39 39 42)"
            strokeWidth="2"
          />
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
                stroke={alert ? "rgb(220 38 38)" : "rgb(249 115 22)"}
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
        <span className={alert ? "text-red-500" : "text-[#f97316]"}>
          {displayScore}
        </span>
      </p>
    </div>
  );
}
