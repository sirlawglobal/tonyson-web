'use client';

import * as React from 'react';

export type Theme = 'system' | 'light' | 'dark';

const KEY = 'tonyson-theme';
const QUERY = '(prefers-color-scheme: dark)';

type Ctx = { theme: Theme; setTheme: (t: Theme) => void; ready: boolean };
const ThemeContext = React.createContext<Ctx | null>(null);

function apply(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia(QUERY).matches);
  const el = document.documentElement;
  el.classList.toggle('dark', dark);
  el.style.colorScheme = dark ? 'dark' : 'light';
}

function readStored(): Theme {
  try {
    const s = localStorage.getItem(KEY);
    return s === 'light' || s === 'dark' ? s : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Server and first client render both start at "system"; the real value is read after mount.
  const [theme, setThemeState] = React.useState<Theme>('system');
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setThemeState(readStored());
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setThemeState(readStored());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    apply(theme);
    if (theme !== 'system') return;
    const mq = window.matchMedia(QUERY);
    const onChange = () => apply('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme, ready]);

  const setTheme = React.useCallback((t: Theme) => {
    setThemeState(t);
    try {
      if (t === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, t);
    } catch {
      /* storage unavailable: preference lasts for this session only */
    }
  }, []);

  const value = React.useMemo(() => ({ theme, setTheme, ready }), [theme, setTheme, ready]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
