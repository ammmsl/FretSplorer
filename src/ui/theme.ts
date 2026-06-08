// Theme (/ui) — light-first, dark optional (docs/08 §1j; ADR 0005). The degree
// palette is theme-aware via CSS; here we only track the active mode and expose the
// next-mode toggle. Light is the default (context-aware skim/scan).

export type Theme = 'light' | 'dark';

export const DEFAULT_THEME: Theme = 'light';

export function nextTheme(theme: Theme): Theme {
  return theme === 'light' ? 'dark' : 'light';
}
