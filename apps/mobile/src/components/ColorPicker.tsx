import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme/tokens';

// ── Predefined Accent Color Palette ───────────────────────────────────────────
// 8 curated colors that work well as card accent on the dark DevCard theme.

export const ACCENT_COLORS = [
  '#6366F1', // Indigo (default)
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#22C55E', // Green
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
] as const;

export type AccentColor = (typeof ACCENT_COLORS)[number];

interface ColorPickerProps {
  selected: string;
  onSelect: (color: string) => void;
}

export default function ColorPicker({ selected, onSelect }: ColorPickerProps) {
  return (
    <View style={styles.container}>
      {ACCENT_COLORS.map((color) => {
        const isActive = selected === color;
        return (
          <TouchableOpacity
            key={color}
            style={[
              styles.swatch,
              { backgroundColor: color },
              isActive && styles.swatchActive,
            ]}
            onPress={() => onSelect(color)}
            activeOpacity={0.7}
            accessibilityLabel={`Select accent color ${color}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.transparent,
  },
  swatchActive: {
    borderColor: COLORS.white,
    transform: [{ scale: 1.15 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
});
