'use client';

import * as React from 'react';

const KEY = 'tny:recent';
const MAX = 12;

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/** Ids of recently viewed products, newest first. Read after mount to avoid SSR mismatch. */
export function useRecentlyViewed(): string[] {
  const [ids, setIds] = React.useState<string[]>([]);
  React.useEffect(() => setIds(read()), []);
  return ids;
}

export function recordView(productId: string) {
  try {
    const next = [productId, ...read().filter((id) => id !== productId)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: ignore */
  }
}
