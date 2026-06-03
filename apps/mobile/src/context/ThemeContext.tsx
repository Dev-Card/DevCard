import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, LIGHT_COLORS } from '../theme/tokens';

const THEME_KEY = 'devcard.theme.mode';
type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  colors: typeof COLORS;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: COLORS,
  isDark: true,
  mode: 'dark',
  setMode: async () => {},
  toggleTheme: async () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then(value => {
        if (value === 'light' || value === 'dark') setModeState(value);
      })
      .catch(() => {});
  }, []);

  const setMode = async (nextMode: ThemeMode) => {
    setModeState(nextMode);
    await AsyncStorage.setItem(THEME_KEY, nextMode);
  };

  const toggleTheme = async () => {
    await setMode(mode === 'dark' ? 'light' : 'dark');
  };

  const colors = mode === 'dark' ? COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{ colors, isDark: mode === 'dark', mode, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
