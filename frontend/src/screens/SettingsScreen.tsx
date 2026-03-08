import React from "react";
import { useGameStore } from "../store/gameStore";
import { getRatingTier } from "../utils/constants";
import {
  themeList,
  applyTheme,
  storeThemeId,
  getStoredThemeId,
  Theme,
} from "../themes";

/* ------------------------------------------------------------------ */
/*  Icons                                                             */
/* ------------------------------------------------------------------ */
const BackArrow: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const VolumeOnIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);

const VolumeOffIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                   */
/* ------------------------------------------------------------------ */
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="flex flex-col gap-4">
    <h3
      className="text-xs font-semibold uppercase tracking-wider"
      style={{ color: "var(--text-muted)" }}
    >
      {title}
    </h3>
    {children}
  </div>
);

/* ------------------------------------------------------------------ */
/*  Theme card with 1:1 mini board                                    */
/* ------------------------------------------------------------------ */
const ThemeCard: React.FC<{
  theme: Theme;
  isActive: boolean;
  onSelect: () => void;
}> = ({ theme, isActive, onSelect }) => (
  <button
    className="flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer transition-colors duration-200"
    style={{
      background: isActive ? "var(--surface-hover)" : "var(--surface)",
      border: isActive ? "2px solid var(--accent)" : "2px solid var(--surface-hover)",
    }}
    onClick={onSelect}
  >
    {/* Mini 4x4 preview -- fills available width */}
    <div
      className="w-full aspect-square rounded-lg overflow-hidden"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
      }}
    >
      {Array.from({ length: 16 }, (_, i) => {
        const r = Math.floor(i / 4);
        const c = i % 4;
        const dark = (r + c) % 2 !== 0;
        return (
          <div
            key={i}
            style={{ background: dark ? theme.boardDark : theme.boardLight }}
          >
            {dark && (r === 0 || r === 3) && c % 2 === (r === 0 ? 1 : 0) && (
              <div className="w-full h-full flex items-center justify-center">
                <div
                  className="rounded-full"
                  style={{
                    width: "55%",
                    height: "55%",
                    background: r === 0 ? theme.pieceBlack : theme.pieceRed,
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>

    {/* Theme name */}
    <span
      className="text-xs font-semibold"
      style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }}
    >
      {theme.name}
    </span>
  </button>
);

/* ------------------------------------------------------------------ */
/*  Toggle switch                                                     */
/* ------------------------------------------------------------------ */
const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (val: boolean) => void;
}> = ({ checked, onChange }) => (
  <button
    className="relative w-11 h-6 rounded-full cursor-pointer transition-colors duration-300"
    style={{
      background: checked ? "var(--accent)" : "var(--surface-hover)",
      border: `1px solid ${checked ? "var(--accent)" : "var(--text-muted)"}`,
    }}
    onClick={() => onChange(!checked)}
  >
    <div
      className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300"
      style={{
        left: checked ? "calc(100% - 20px)" : "2px",
        background: checked ? "var(--bg)" : "var(--text-muted)",
      }}
    />
  </button>
);

/* ------------------------------------------------------------------ */
/*  SettingsScreen                                                    */
/* ------------------------------------------------------------------ */
const SettingsScreen: React.FC = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const player = useGameStore((s) => s.player);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const setSoundEnabled = useGameStore((s) => s.setSoundEnabled);

  const [activeThemeId, setActiveThemeId] = React.useState(getStoredThemeId());

  const handleThemeSelect = (theme: Theme) => {
    applyTheme(theme);
    storeThemeId(theme.id);
    setActiveThemeId(theme.id);
  };

  const tier = player ? getRatingTier(player.rating) : null;

  return (
    <div className="screen animate-fade-in">
      {/* Header */}
      <div className="screen-header">
        <button
          className="p-2 -ml-1 rounded-lg transition-colors duration-200 btn-touch"
          style={{ color: "var(--text-muted)" }}
          onClick={() => setScreen("menu")}
        >
          <BackArrow />
        </button>
        <h2
          className="text-lg font-bold"
          style={{ fontFamily: "var(--font-display)", color: "var(--text)" }}
        >
          Settings
        </h2>
      </div>

      {/* Content */}
      <div className="screen-body">
        <div className="max-w-md mx-auto flex flex-col gap-8 animate-slide-up">
          {/* Theme picker */}
          <Section title="Theme">
            <div className="grid grid-cols-2 gap-3">
              {themeList.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  isActive={theme.id === activeThemeId}
                  onSelect={() => handleThemeSelect(theme)}
                />
              ))}
            </div>
          </Section>

          {/* Audio */}
          <Section title="Audio">
            <div
              className="flex items-center justify-between p-4 rounded-xl"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--surface-hover)",
              }}
            >
              <div className="flex items-center gap-3">
                <span style={{ color: soundEnabled ? "var(--accent)" : "var(--text-muted)" }}>
                  {soundEnabled ? <VolumeOnIcon /> : <VolumeOffIcon />}
                </span>
                <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                  Sound Effects
                </span>
              </div>
              <ToggleSwitch checked={soundEnabled} onChange={setSoundEnabled} />
            </div>
          </Section>

          {/* Profile */}
          <Section title="Profile">
            <div
              className="flex items-center gap-3 p-4 rounded-xl"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--surface-hover)",
              }}
            >
              {player ? (
                <>
                  {/* Avatar */}
                  <div
                    className="flex items-center justify-center rounded-full font-bold text-sm shrink-0"
                    style={{
                      width: 40,
                      height: 40,
                      background: "var(--accent)",
                      color: "var(--bg)",
                    }}
                  >
                    {player.username.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                      {player.username}
                    </span>
                    <span className="text-xs" style={{ color: tier?.color || "var(--text-muted)" }}>
                      {player.rating} ELO
                    </span>
                  </div>

                  {/* W/L/D */}
                  <div className="flex items-center gap-1 text-xs shrink-0">
                    <span style={{ color: "var(--success)" }}>{player.wins}W</span>
                    <span style={{ color: "var(--danger)" }}>{player.losses}L</span>
                    <span style={{ color: "var(--text-muted)" }}>{player.draws}D</span>
                  </div>
                </>
              ) : (
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Not registered
                </span>
              )}
            </div>
          </Section>

          {/* Back button */}
          <button
            className="w-full rounded-xl font-semibold text-sm cursor-pointer transition-colors duration-200 btn-touch"
            style={{
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--surface-hover)",
            }}
            onClick={() => setScreen("menu")}
          >
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;
