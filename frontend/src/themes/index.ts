export interface Theme {
  id: string;
  name: string;
  boardDark: string;
  boardLight: string;
  pieceRed: string;
  pieceRedBorder: string;
  pieceBlack: string;
  pieceBlackBorder: string;
  kingAccent: string;
  bg: string;
  bgGradient: string;
  surface: string;
  surfaceHover: string;
  text: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  highlight: string;
  validMove: string;
  lastMove: string;
  selectedPiece: string;
  danger: string;
  success: string;
  boardShadow: string;
  pieceStyle: "glossy" | "matte" | "neon" | "wood";
}

import { luxeDark } from "./luxeDark";
import { neonRetro } from "./neonRetro";
import { cleanModern } from "./cleanModern";
import { warmWood } from "./warmWood";

export const themes: Record<string, Theme> = {
  luxeDark,
  neonRetro,
  cleanModern,
  warmWood,
};

export const themeList = [luxeDark, neonRetro, cleanModern, warmWood];

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme.id);
  const entries = Object.entries(theme) as [string, string][];
  for (const [key, value] of entries) {
    if (key === "id" || key === "name" || key === "pieceStyle") continue;
    root.style.setProperty(`--${camelToKebab(key)}`, value);
  }
}

function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, "-$1").toLowerCase();
}

export function getStoredThemeId(): string {
  return localStorage.getItem("checkers-theme") || "luxeDark";
}

export function storeThemeId(id: string) {
  localStorage.setItem("checkers-theme", id);
}
