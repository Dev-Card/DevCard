import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PLATFORMS } from '@devcard/shared';
import { BORDER_RADIUS, COLORS, FONT_SIZE, SPACING } from '../theme/tokens';

export type ProfileLinkStatus = 'idle' | 'loading' | 'success' | 'error';

type ProfileLinkProps = {
  platform: string;
  username: string;
  onPress: () => void;
  actionLabel?: string;
  status?: ProfileLinkStatus;
};

export default function ProfileLink({
  platform,
  username,
  onPress,
  actionLabel = 'Open',
  status = 'idle',
}: ProfileLinkProps) {
  const platformDef = PLATFORMS[platform];
  const platformName = platformDef?.name || platform;
  const isLoading = status === 'loading';

  return (
    <TouchableOpacity
      testID="profile-link"
      style={[styles.container, status === 'success' && styles.containerDone]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={isLoading}>
      <View
        style={[
          styles.icon,
          { backgroundColor: platformDef?.color || COLORS.primary },
        ]}>
        <Text style={styles.iconText}>{platformName.charAt(0) || '?'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.platform}>{platformName}</Text>
        <Text style={styles.username}>{username}</Text>
      </View>
      <View
        style={[
          styles.action,
          status === 'success' && styles.actionDone,
          isLoading && styles.actionLoading,
        ]}>
        {isLoading ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <Text
            style={[
              styles.actionText,
              status === 'success' && styles.actionTextDone,
            ]}>
            {actionLabel}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  containerDone: {
    borderColor: COLORS.success,
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: FONT_SIZE.md,
  },
  info: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  platform: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  username: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  action: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    minWidth: 72,
    alignItems: 'center',
  },
  actionDone: {
    backgroundColor: COLORS.success,
  },
  actionLoading: {
    backgroundColor: COLORS.primaryDark,
  },
  actionText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: FONT_SIZE.sm,
  },
  actionTextDone: {},
});
