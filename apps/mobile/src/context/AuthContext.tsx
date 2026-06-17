import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { get } from '../services/api';
import { DEMO_TOKEN } from '../services/api';

// ── Storage Keys ──────────────────────────────────────────────────────────────

const TOKEN_KEY = 'devcard.auth.token';
const FIRST_LAUNCH_KEY = 'devcard.firstLaunch';

// ── Types ─────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
  pronouns: string | null;
  role: string | null;
  company: string | null;
  avatarUrl: string | null;
  accentColor: string;
  defaultCardId: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isFirstLaunch: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  enterDemoMode: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);

  // ── Hydrate token from AsyncStorage on mount ──

  useEffect(() => {
    const hydrate = async () => {
      try {
        const [storedToken, launchFlag] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(FIRST_LAUNCH_KEY),
        ]);

        if (launchFlag === null) {
          setIsFirstLaunch(true);
          await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'false');
        }

        if (storedToken) {
          setToken(storedToken);
          // Validate token by fetching profile
          const userData = await get<User>('/api/profiles/me', storedToken).catch(() => null);
          if (userData) {
            setUser(userData);
          } else {
            // Token expired or invalid — clear it
            await AsyncStorage.removeItem(TOKEN_KEY);
            setToken(null);
          }
        }
      } catch (error) {
        console.error('Auth hydration failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    hydrate();
  }, []);

  // ── Login ──

  const login = useCallback(async (newToken: string) => {
    setToken(newToken);
    try {
      await AsyncStorage.setItem(TOKEN_KEY, newToken);
      const userData = await get<User>('/api/profiles/me', newToken).catch(() => null);
      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to persist token or fetch user:', error);
    }
  }, []);

  // ── Logout ──

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to clear stored token:', error);
    }
  }, []);

  // ── Refresh User ──

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const userData = await get<User>('/api/profiles/me', token).catch(() => null);
      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, [token]);

  const enterDemoMode = useCallback(async () => {
    await login(DEMO_TOKEN);
  }, [login]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        isFirstLaunch,
        login,
        logout,
        refreshUser,
        enterDemoMode,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
