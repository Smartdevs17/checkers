import React from "react";

interface QueueSpinnerProps {
  onCancel: () => void;
}

/** Animated checkerboard icon used in the searching spinner. */
const CheckerboardIcon: React.FC = () => {
  const cells = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        width: 64,
        height: 64,
        animation: "pulse-glow 2s ease-in-out infinite",
        boxShadow: "0 0 12px var(--accent)",
      }}
    >
      {cells.map((i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const dark = (row + col) % 2 !== 0;

        return (
          <div
            key={i}
            style={{
              background: dark ? "var(--board-dark)" : "var(--board-light)",
              aspectRatio: "1",
            }}
          />
        );
      })}
    </div>
  );
};

const QueueSpinner: React.FC<QueueSpinnerProps> = ({ onCancel }) => {
  return (
    <div className="flex flex-col items-center gap-6 animate-fade-in">
      {/* Pulsing checkerboard */}
      <div className="relative">
        <CheckerboardIcon />
        {/* Pulsing ring */}
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            border: "2px solid var(--accent)",
            opacity: 0.4,
            animation: "pulse-glow 2s ease-in-out infinite",
          }}
        />
      </div>

      {/* Searching text with animated dots */}
      <div className="flex items-center gap-1">
        <span
          className="text-sm font-medium"
          style={{ color: "var(--text)" }}
        >
          Searching for opponent
        </span>
        <span className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="text-sm font-medium"
              style={{
                color: "var(--accent)",
                animation: `searching-dots 1.4s infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            >
              .
            </span>
          ))}
        </span>
      </div>

      {/* Cancel button */}
      <button
        onClick={onCancel}
        className="px-6 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200"
        style={{
          background: "transparent",
          color: "var(--text-muted)",
          border: "1px solid var(--surface-hover)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--surface-hover)";
          e.currentTarget.style.color = "var(--danger)";
          e.currentTarget.style.borderColor = "var(--danger)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--text-muted)";
          e.currentTarget.style.borderColor = "var(--surface-hover)";
        }}
      >
        Cancel
      </button>
    </div>
  );
};

export default QueueSpinner;
