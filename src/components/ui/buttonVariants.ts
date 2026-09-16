export const BUTTON_VARIANTS = {
  // Neutral button on panel backgrounds (header, toolbars, dropdowns, menus).
  // Theme-aware via CSS vars: no light/dark branches needed at call sites.
  neutral:
    'border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:brightness-110',
  // Neutral button on surface backgrounds (cell headers).
  neutralOnSurface:
    'border-[var(--border-color)] bg-[var(--panel-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:brightness-110',
  presetActive:
    'bg-[var(--primary-blue)] text-[var(--primary-foreground)] border-[var(--primary-blue)] shadow-sm hover:brightness-110',
  // Muted disabled treatment for accent buttons: flat neutrals instead of
  // opacity-on-accent, which turns muddy on saturated dark themes.
  disabledMuted:
    'disabled:border-[var(--border-color)] disabled:bg-[var(--surface-bg)] disabled:text-[var(--text-secondary)] disabled:opacity-70 disabled:cursor-not-allowed',
} as const;
