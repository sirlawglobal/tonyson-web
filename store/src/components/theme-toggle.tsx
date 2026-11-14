'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type Theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

const ORDER: Theme[] = ['system', 'light', 'dark'];
const LABEL: Record<Theme, string> = { system: 'System', light: 'Light', dark: 'Dark' };
const ICON = { system: Monitor, light: Sun, dark: Moon } as const;

/** Cycles System → Light → Dark. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, ready } = useTheme();
  const current: Theme = ready ? theme : 'system';
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const Icon = ICON[current];
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${LABEL[current]}. Switch to ${LABEL[next].toLowerCase()}`}
      title={`Theme: ${LABEL[current]}`}
      className={cn('grid h-11 w-11 place-items-center rounded-full hover:bg-muted', className)}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
}
