import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Share,
  Platform,
  Alert,
  View,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../theme/tokens';
import { getProfileVCard, encodeBase64 } from '../utils/vcard';
import { APP_URL } from '../config';

interface PlatformLink {
  id: string;
  platform: string;
  username: string;
  url: string;
  displayOrder: number;
}

interface ProfileData {
  username: string;
  displayName: string;
  bio: string | null;
  pronouns: string | null;
  role: string | null;
  company: string | null;
  avatarUrl: string | null;
  accentColor: string;
  links: PlatformLink[];
}

interface SaveContactButtonProps {
  profile: ProfileData;
}

export function SaveContactButton({ profile }: SaveContactButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleSaveContact = async () => {
    setLoading(true);
    try {
      const devcardUrl = `${APP_URL}/u/${profile.username}`;
      
      const vcardContent = getProfileVCard({
        displayName: profile.displayName,
        username: profile.username,
        bio: profile.bio,
        pronouns: profile.pronouns,
        role: profile.role,
        company: profile.company,
        avatarUrl: profile.avatarUrl,
        links: profile.links,
        devcardUrl,
      });

      if (Platform.OS === 'ios') {
        const base64Vcf = encodeBase64(vcardContent);
        const fileUri = `data:text/vcard;charset=utf-8;base64,${base64Vcf}`;
        
        await Share.share({
          url: fileUri,
          message: `Save contact info for ${profile.displayName}`,
        });
      } else {
        // Android and others: Share the vCard content directly as message text
        await Share.share({
          message: vcardContent,
          title: `Save ${profile.displayName}'s Contact`,
        });
      }
    } catch (err) {
      console.error('Failed to share contact:', err);
      Alert.alert('Error', 'Failed to export contact card.');
    } finally {
      setLoading(false);
    }
  };

  const accentColor = profile.accentColor || COLORS.primary;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          borderColor: accentColor,
          shadowColor: accentColor,
        },
      ]}
      onPress={handleSaveContact}
      disabled={loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Save ${profile.displayName}'s contact info to your phone`}
    >
      {loading ? (
        <View style={styles.content}>
          <ActivityIndicator size="small" color={COLORS.white} style={styles.spinner} />
          <Text style={styles.text}>Saving...</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.icon}>📥</Text>
          <Text style={styles.text}>Save Contact</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.md,
    width: '100%',
    ...SHADOWS.button,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: FONT_SIZE.md,
    color: COLORS.white,
    marginRight: SPACING.sm,
  },
  text: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  spinner: {
    marginRight: SPACING.sm,
  },
});
