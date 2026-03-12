// ─── DevCard Design Tokens ───

export const COLORS = {
  // Primary palette
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',

  // Accent
  accent: '#8B5CF6',
  accentLight: '#A78BFA',

  // Background (dark mode)
  bgPrimary: '#0F0F1A',
  bgSecondary: '#1A1A2E',
  bgCard: '#16213E',
  bgCardGlass: 'rgba(22, 33, 62, 0.8)',
  bgElevated: '#1E293B',

  // Text
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0F172A',

  // Status
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Border
  border: '#334155',
  borderLight: '#475569',

  // Platform colors (from shared package)
  github: '#181717',
  linkedin: '#0A66C2',
  twitter: '#000000',
  gitlab: '#FC6D26',
  devfolio: '#3770FF',
  npm: '#CB3837',
  devto: '#0A0A0A',
  hashnode: '#2962FF',
  medium: '#000000',
  leetcode: '#FFA116',
  hackerrank: '#00EA64',
  discord: '#5865F2',
  telegram: '#26A5E4',
  email: '#EA4335',

  // Utility
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONT_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const SHADOWS = {
  card: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  button: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
};
