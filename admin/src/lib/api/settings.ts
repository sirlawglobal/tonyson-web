import { audit, db, simulate, type StoreSettings } from './db';

export function getSettings(): Promise<StoreSettings> {
  return simulate(() => ({ ...db.settings }));
}

export function saveSettings(next: StoreSettings): Promise<StoreSettings> {
  return simulate(() => {
    const changed = (Object.keys(next) as (keyof StoreSettings)[]).filter((k) => db.settings[k] !== next[k]);
    db.settings = { ...next };
    audit('settings.updated', 'Store settings', changed.length ? changed.join(', ') : 'no changes');
    return { ...db.settings };
  });
}
