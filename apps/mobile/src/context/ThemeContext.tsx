import React, { createContext, useContext, ReactNode } from 'react';
import { COLORS } from '../theme/tokens';

interface ThemeContextType {
  colors: typeof COLORS;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: COLORS,
  isDark: true,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeContext.Provider value={{ colors: COLORS, isDark: true }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
