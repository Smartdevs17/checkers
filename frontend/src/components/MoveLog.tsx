import React, { useRef, useEffect } from "react";
import { MoveLogEntry } from "../utils/constants";

function formatMove(entry: MoveLogEntry): string {
  const from = entry.from + 1;
  const to = entry.to + 1;
  if (entry.captured.length > 0) {
    return `${from}\u00D7${to}`;
  }
  return `${from}-${to}`;
}

/* ------------------------------------------------------------------ */
/*  Full panel (desktop sidebar)                                       */
/* ------------------------------------------------------------------ */
export const MoveLogPanel: React.FC<{ entries: MoveLogEntry[] }> = ({ entries }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  return (
    <div className="flex flex-col h-full">
      <div
        className="text-xs font-bold uppercase tracking-wider px-3 py-2 shrink-0"
        style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--surface-hover)" }}
      >
        Moves
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-1.5"
        style={{ scrollbarWidth: "thin" }}
      >
        {entries.length === 0 && (
          <p className="text-xs py-4 text-center" style={{ color: "var(--text-muted)" }}>
            No moves yet
          </p>
        )}

        {entries.map((entry, i) => {
          const isCapture = entry.captured.length > 0;
          return (
            <div
              key={i}
              className="flex items-center gap-2 py-0.5"
            >
              <span
                className="text-[10px] font-mono w-5 text-right shrink-0"
                style={{ color: "var(--text-muted)" }}
              >
                {i + 1}
              </span>
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  background: entry.color === "red" ? "var(--piece-red)" : "var(--piece-black)",
                  border: `1.5px solid ${entry.color === "red" ? "var(--piece-red-border)" : "var(--piece-black-border)"}`,
                }}
              />
              <span
                className="text-xs font-mono"
                style={{
                  color: isCapture ? "var(--accent)" : "var(--text)",
                  fontWeight: isCapture ? 600 : 400,
                }}
              >
                {formatMove(entry)}
              </span>
              {entry.promoted && (
                <span className="text-[9px] font-bold" style={{ color: "var(--accent)" }}>
                  K
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Compact strip (mobile bottom)                                      */
/* ------------------------------------------------------------------ */
export const MoveLogStrip: React.FC<{ entries: MoveLogEntry[] }> = ({ entries }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [entries.length]);

  if (entries.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      className="flex items-center gap-2 px-3 py-1.5 overflow-x-auto shrink-0"
      style={{
        background: "var(--surface)",
        borderTop: "1px solid var(--surface-hover)",
        scrollbarWidth: "none",
        height: 38,
      }}
    >
      <span
        className="text-[10px] font-bold uppercase shrink-0 tracking-wider"
        style={{ color: "var(--text-muted)" }}
      >
        Moves
      </span>
      {entries.map((entry, i) => {
        const isCapture = entry.captured.length > 0;
        const isLast = i === entries.length - 1;
        return (
          <div
            key={i}
            className="flex items-center gap-1.5 shrink-0 px-1.5 py-0.5 rounded"
            style={{
              background: isLast ? "var(--surface-hover)" : "transparent",
            }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                background: entry.color === "red" ? "var(--piece-red)" : "var(--piece-black)",
                border: `1px solid ${entry.color === "red" ? "var(--piece-red-border)" : "var(--piece-black-border)"}`,
              }}
            />
            <span
              className="text-xs font-mono"
              style={{
                color: isCapture ? "var(--accent)" : isLast ? "var(--text)" : "var(--text-muted)",
                fontWeight: isCapture || isLast ? 600 : 400,
              }}
            >
              {formatMove(entry)}
            </span>
            {entry.promoted && (
              <span className="text-[9px] font-bold" style={{ color: "var(--accent)" }}>K</span>
            )}
          </div>
        );
      })}
    </div>
  );
};
