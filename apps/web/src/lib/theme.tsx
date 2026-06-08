import {
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import {
  ThemeContext,
} from './theme.context';

import {
  getInitialTheme,
  type Theme,
} from './theme.utils';

export function ThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    localStorage.setItem('devcard-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (
      prev === 'dark' ? 'light' : 'dark'
    ));
  };

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}