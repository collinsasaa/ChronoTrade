import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light';

interface ThemeState {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const THEME_KEY = 'chronotrade_theme';

export const useThemeStore = create<ThemeState>((set) => {
  const savedTheme = (localStorage.getItem(THEME_KEY) as ThemeMode) || 'dark';
  
  // Apply initial theme attribute to root HTML tag
  if (typeof document !== 'undefined') {
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }

  return {
    theme: savedTheme,
    setTheme: (theme) => {
      localStorage.setItem(THEME_KEY, theme);
      if (theme === 'light') {
        document.documentElement.classList.add('light-theme');
      } else {
        document.documentElement.classList.remove('light-theme');
      }
      set({ theme });
    },
    toggleTheme: () => {
      set((state) => {
        const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem(THEME_KEY, nextTheme);
        if (nextTheme === 'light') {
          document.documentElement.classList.add('light-theme');
        } else {
          document.documentElement.classList.remove('light-theme');
        }
        return { theme: nextTheme };
      });
    }
  };
});
