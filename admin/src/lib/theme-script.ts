/**
 * Runs in <head> before first paint so the page never flashes the wrong theme.
 * Keep in sync with lib/theme.tsx (same storage key and class logic).
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('tonyson-theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light'}catch(_){}})();`;
