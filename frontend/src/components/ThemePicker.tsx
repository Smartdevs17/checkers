import React, { useState, useEffect } from "react";
import {
  themeList,
  applyTheme,
  storeThemeId,
  getStoredThemeId,
  Theme,
} from "../themes";

/** Renders a tiny 3x3 board preview with 2 sample pieces to showcase a theme. */
const MiniBoard: React.FC<{ theme: Theme }> = ({ theme }) => {
  const cells: { dark: boolean; piece?: "red" | "black" }[] = [];

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const dark = (r + c) % 2 !== 0;
      let piece: "red" | "black" | undefined;
      // Place a red piece at (0,1) and a black piece at (2,0) for preview
      if (r === 0 && c === 1) piece = "red";
      if (r === 2 && c === 0) piece = "black";
      cells.push({ dark, piece });
    }
  }

  return (
    <div
      className="rounded-md overflow-hidden"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        width: 72,
        height: 72,
        border: `1px solid ${theme.surfaceHover}`,
      }}
    >
      {cells.map((cell, i) => (
        <div
          key={i}
          className="flex items-center justify-center"
          style={{
            background: cell.dark ? theme.boardDark : theme.boardLight,
            aspectRatio: "1",
          }}
        >
          {cell.piece && (
            <div
              className="rounded-full"
              style={{
                width: "70%",
                height: "70%",
                background:
                  cell.piece === "red" ? theme.pieceRed : theme.pieceBlack,
                border: `1.5px solid ${
                  cell.piece === "red"
                    ? theme.pieceRedBorder
                    : theme.pieceBlackBorder
                }`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

const ThemePicker: React.FC = () => {
  const [activeId, setActiveId] = useState(getStoredThemeId);

  useEffect(() => {
    const saved = getStoredThemeId();
    setActiveId(saved);
  }, []);

  const handleSelect = (theme: Theme) => {
    applyTheme(theme);
    storeThemeId(theme.id);
    setActiveId(theme.id);
  };

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
    >
      {themeList.map((theme) => {
        const isActive = theme.id === activeId;

        return (
          <button
            key={theme.id}
            onClick={() => handleSelect(theme)}
            className="flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer transition-all duration-200"
            style={{
              background: isActive
                ? "var(--surface-hover)"
                : "var(--surface)",
              border: isActive
                ? "2px solid var(--accent)"
                : "2px solid transparent",
              boxShadow: isActive
                ? "0 0 12px var(--highlight)"
                : "none",
            }}
          >
            <MiniBoard theme={theme} />
            <span
              className="text-xs font-medium"
              style={{
                color: isActive ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              {theme.name}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default ThemePicker;
