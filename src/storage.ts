/** localStorage wrapper that tolerates disabled storage (e.g. strict privacy modes). */
export const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export const STORAGE_KEYS = {
  theme: 'theme',
  autoLocate: 'autoLocate',
} as const;
