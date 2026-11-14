'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type Theme } from '@/lib/theme';
import { Button } from '@/components/ui/button';

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
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${LABEL[current]}. Switch to ${LABEL[next].toLowerCase()}`}
      title={`Theme: ${LABEL[current]}`}
    >
      <Icon />
    </Button>
  );
}
