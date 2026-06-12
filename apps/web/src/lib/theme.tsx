import { useEffect } from 'react';
import { useTheme as useThemeContext } from './themeContext';

type Theme = 'light' | 'dark';

export function useTheme() {
  const { theme, toggleTheme } = useThemeContext();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('devcard-theme', theme);
  }, [theme]);

  return { theme, toggleTheme };
}
