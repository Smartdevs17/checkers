import React, { useState, useCallback } from "react";

interface RoomCodeDisplayProps {
  code: string;
}

const RoomCodeDisplay: React.FC<RoomCodeDisplayProps> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for insecure contexts
      const textarea = document.createElement("textarea");
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  return (
    <button
      onClick={handleCopy}
      className="flex flex-col items-center gap-2 px-8 py-5 rounded-xl cursor-pointer transition-all duration-200"
      style={{
        background: "var(--surface)",
        border: "1.5px solid var(--surface-hover)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--accent)";
        e.currentTarget.style.boxShadow = "0 0 12px var(--highlight)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--surface-hover)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <span
        className="text-xs uppercase tracking-widest font-medium"
        style={{ color: "var(--text-muted)" }}
      >
        Room Code
      </span>

      <span
        className="text-3xl font-mono font-bold tracking-[0.3em]"
        style={{ color: "var(--accent)" }}
      >
        {code}
      </span>

      <span
        className="text-xs font-medium transition-colors duration-200"
        style={{
          color: copied ? "var(--success)" : "var(--text-muted)",
        }}
      >
        {copied ? "Copied!" : "Click to copy"}
      </span>
    </button>
  );
};

export default RoomCodeDisplay;
