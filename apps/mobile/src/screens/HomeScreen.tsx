import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  StatusBar,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { PLATFORMS } from '@devcard/shared';
import { APP_URL, API_BASE_URL } from '../config';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/MainTabs';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

interface PlatformLink {
  id: string;
  platform: string;
  username: string;
  url: string;
  displayOrder: number;
}

export default function HomeScreen({ navigation }: Props) {
  const { user, token } = useAuth();
  const [links, setLinks] = useState<PlatformLink[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [showQR, setShowQR] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const profileUrl = user?.defaultCardId 
    ? `${APP_URL}/devcard/${user.defaultCardId}`
    : `${APP_URL}/u/${user?.username}`;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, analyticsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/profiles/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/analytics/overview`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setLinks(data.platformLinks || []);
      }
      if (analyticsRes.ok) {
        setAnalytics(await analyticsRes.json());
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out my DevCard: ${profileUrl}`,
        url: profileUrl,
      });
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.displayName}>{user?.displayName || 'Developer'} 👋</Text>
        </View>

        {/* Profile Card Preview */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {(user?.displayName || 'D').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.displayName}</Text>
              {user?.pronouns && (
                <Text style={styles.pronouns}>{user.pronouns}</Text>
              )}
              {user?.role && (
                <Text style={styles.profileRole}>
                  {user.role}
                  {user.company ? ` @ ${user.company}` : ''}
                </Text>
              )}
            </View>
          </View>

          {user?.bio && <Text style={styles.bio}>{user.bio}</Text>}

          {/* Platform Links Summary */}
          <View style={styles.linksSummary}>
            {links.slice(0, 4).map(link => {
              const platform = PLATFORMS[link.platform];
              return (
                <View key={link.id} style={styles.linkBadge}>
                  <Text style={styles.linkBadgeText}>
                    {platform?.name || link.platform}
                  </Text>
                </View>
              );
            })}
            {links.length > 4 && (
              <View style={styles.linkBadge}>
                <Text style={styles.linkBadgeText}>+{links.length - 4}</Text>
              </View>
            )}
          </View>
        </View>

        {/* QR Code Section */}
        <TouchableOpacity
          style={styles.qrSection}
          onPress={() => setShowQR(!showQR)}
          activeOpacity={0.85}>
          {showQR ? (
            <View style={styles.qrContainer}>
              <QRCode
                value={profileUrl}
                size={200}
                color={COLORS.textPrimary}
                backgroundColor={COLORS.bgCard}
              />
              <Text style={styles.qrHint}>Scan to open your DevCard</Text>
            </View>
          ) : (
            <View style={styles.qrToggle}>
              <Text style={styles.qrToggleEmoji}>📱</Text>
              <Text style={styles.qrToggleText}>Tap to show QR code</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShare}
            activeOpacity={0.85}>
            <Text style={styles.actionEmoji}>📤</Text>
            <Text style={styles.actionText}>Share Card</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => (navigation as any).navigate('Views')}
            activeOpacity={0.85}>
            <Text style={styles.actionEmoji}>📈</Text>
            <Text style={styles.actionText}>Analytics</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => (navigation as any).navigate('DevCardView', { username: user?.username || '' })}
            activeOpacity={0.85}>
            <Text style={styles.actionEmoji}>👁️</Text>
            <Text style={styles.actionText}>Preview</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{links.length}</Text>
            <Text style={styles.statLabel}>Links</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{analytics?.totalViews || 0}</Text>
            <Text style={styles.statLabel}>Views</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{analytics?.followsCount || 0}</Text>
            <Text style={styles.statLabel}>Follows</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  scrollContent: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  header: { marginBottom: SPACING.lg },
  greeting: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
  displayName: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.textPrimary },
  profileCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
    marginBottom: SPACING.lg,
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  avatar: { width: 56, height: 56, borderRadius: 28, marginRight: SPACING.md },
  avatarPlaceholder: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.white },
  profileInfo: { flex: 1 },
  profileName: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.textPrimary },
  pronouns: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  profileRole: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  bio: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.md },
  linksSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  linkBadge: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  linkBadgeText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontWeight: '500' },
  qrSection: {
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  qrContainer: { alignItems: 'center', gap: SPACING.md },
  qrHint: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },
  qrToggle: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  qrToggleEmoji: { fontSize: 24 },
  qrToggleText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionEmoji: { fontSize: 24, marginBottom: SPACING.xs },
  actionText: { fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, fontWeight: '600' },
  stats: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: COLORS.border },
});
