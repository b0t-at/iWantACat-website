import '@fontsource-variable/inter';
import './styles.css';
import { STORAGE_KEYS, storage } from './storage.ts';
import { initThemeToggle } from './theme.ts';

const toggle = document.getElementById('theme-toggle') as HTMLButtonElement;
const refreshTheme = initThemeToggle(toggle);

document.getElementById('reset-preferences')?.addEventListener('click', () => {
  for (const key of Object.values(STORAGE_KEYS)) storage.remove(key);
  refreshTheme();
  const status = document.getElementById('reset-status');
  if (status) status.textContent = 'Your preferences have been removed.';
});
