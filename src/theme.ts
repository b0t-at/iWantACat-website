import { STORAGE_KEYS, storage } from './storage.ts';

type Theme = 'light' | 'dark';

const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

function storedTheme(): Theme | null {
  const value = storage.get(STORAGE_KEYS.theme);
  return value === 'light' || value === 'dark' ? value : null;
}

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme: Theme, toggle: HTMLButtonElement): void {
  document.documentElement.dataset.theme = theme;
  const next = theme === 'dark' ? 'light' : 'dark';
  toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  toggle.setAttribute('aria-label', `Switch to ${next} mode`);
  toggle.title = `Switch to ${next} mode`;
}

/**
 * The initial theme is set by an inline script in <head> to avoid a flash; this wires up the toggle.
 * Returns a function that re-applies the stored or system theme.
 */
export function initThemeToggle(toggle: HTMLButtonElement): () => void {
  const refresh = () => applyTheme(storedTheme() ?? (systemDark.matches ? 'dark' : 'light'), toggle);
  refresh();

  toggle.addEventListener('click', () => {
    const theme = currentTheme() === 'dark' ? 'light' : 'dark';
    storage.set(STORAGE_KEYS.theme, theme);
    applyTheme(theme, toggle);
  });

  systemDark.addEventListener('change', () => {
    if (!storedTheme()) refresh();
  });

  return refresh;
}
