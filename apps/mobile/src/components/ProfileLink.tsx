// components/ProfileLink.tsx

import React from 'react';
import {
  Linking,
  Pressable,
  Text,
  View,
  StyleSheet,
} from 'react-native';

type ProfileLinkProps = {
  platform: string;
  username: string;
  url: string;
  onPress?: () => void;
};
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  BORDER_RADIUS,
} from '../theme/tokens';
export default function ProfileLink({
  platform,
  username,
  url,
  onPress,
}: ProfileLinkProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    Linking.openURL(url);
  };

  return (
    <Pressable style={styles.card} onPress={handlePress}>
      <View>
        <Text style={styles.platform}>{platform}</Text>
        <Text style={styles.username}>{username}</Text>
      </View>

      <Text style={styles.link}>Open</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.bgCard,
    marginBottom: SPACING.sm,
  },

  platform: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  username: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },

  link: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
});