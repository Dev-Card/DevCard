import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from './Skeleton';
import { SPACING, BORDER_RADIUS, COLORS } from '../theme/tokens';

interface LoadingPlaceholderProps {
  rows?: number;
}

export const LoadingPlaceholder: React.FC<LoadingPlaceholderProps> = ({ rows = 3 }) => (
  <View style={styles.container}>
    {Array.from({ length: rows }).map((_, index) => (
      <View key={index} style={styles.item}>
        <Skeleton width={52} height={52} borderRadius={16} />
        <View style={styles.textColumn}>
          <Skeleton width="65%" height={16} />
          <Skeleton width="45%" height={14} style={styles.secondLine} />
        </View>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  textColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  secondLine: {
    marginTop: SPACING.xs,
  },
});
