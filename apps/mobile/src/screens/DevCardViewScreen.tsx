import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Clipboard,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../theme/tokens';
import { PLATFORMS, getProfileUrl, getWebViewUrl } from '@devcard/shared';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/MainTabs';
import type { FollowStrategy } from '@devcard/shared';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DevCardView'>;
  route: RouteProp<RootStackParamList, 'DevCardView'>;
};

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

type FollowState = Record<string, 'idle' | 'loading' | 'success' | 'error'>;

export default function DevCardViewScreen({ navigation, route }: Props) {
  const { username } = route.params;
  const { token } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [followStates, setFollowStates] = useState<FollowState>({});

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/u/${username}`);
      if (res.ok) {
        setProfile(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Hybrid Follow Engine ───

  const handlePlatformAction = async (link: PlatformLink) => {
    const platform = PLATFORMS[link.platform];
    if (!platform) return;

    const strategy: FollowStrategy = platform.followStrategy;

    switch (strategy) {
      case 'api':
        // Layer 1: Silent API follow
        await handleApiFollow(link);
        break;

      case 'webview':
        // Layer 2: WebView connect
        handleWebViewConnect(link);
        break;

      case 'copy':
        // Copy to clipboard (Discord)
        Clipboard.setString(link.username);
        Alert.alert('Copied!', `${link.username} copied to clipboard`);
        setFollowStates(prev => ({ ...prev, [link.id]: 'success' }));
        break;

      case 'link':
      default:
        // Layer 3: Open in browser/app
        const url = link.url || getProfileUrl(link.platform, link.username);
        if (url) {
          Linking.openURL(url).catch(() =>
            Alert.alert('Error', 'Could not open link')
          );
        }
        break;
    }
  };

  // Layer 1: API-based follow
  const handleApiFollow = async (link: PlatformLink) => {
    setFollowStates(prev => ({ ...prev, [link.id]: 'loading' }));
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/follow/${link.platform}/${link.username}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        setFollowStates(prev => ({ ...prev, [link.id]: 'success' }));
      } else {
        const data = await res.json();
        if (data.requiresAuth) {
          // Fall back to WebView if token missing
          handleWebViewConnect(link);
        } else {
          setFollowStates(prev => ({ ...prev, [link.id]: 'error' }));
        }
      }
    } catch {
      setFollowStates(prev => ({ ...prev, [link.id]: 'error' }));
    }
  };

  // Layer 2: WebView-based connect
  const handleWebViewConnect = (link: PlatformLink) => {
    const webViewUrl = getWebViewUrl(link.platform, link.username);
    const profileUrl = link.url || getProfileUrl(link.platform, link.username);
    const url = webViewUrl || profileUrl;

    if (url) {
      navigation.navigate('WebViewConnect', {
        platform: link.platform,
        profileUrl: url,
        displayName: PLATFORMS[link.platform]?.name || link.platform,
      });
    }
  };

  // ─── Button Label & Style ───

  const getButtonLabel = (link: PlatformLink): string => {
    const state = followStates[link.id];
    if (state === 'loading') return '...';
    if (state === 'success') return '✓ Done';
    if (state === 'error') return 'Retry';

    const platform = PLATFORMS[link.platform];
    switch (platform?.followStrategy) {
      case 'api': return 'Follow';
      case 'webview': return 'Connect';
      case 'copy': return 'Copy';
      case 'link': return 'View';
      default: return 'Open';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorState}>
          <Text style={styles.errorEmoji}>😕</Text>
          <Text style={styles.errorText}>User not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backLink}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />

      {/* Close Button */}
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={[styles.profileCard, { borderColor: profile.accentColor }]}>
          <View style={styles.profileHeader}>
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: profile.accentColor }]}>
                <Text style={styles.avatarText}>
                  {profile.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.displayName}>{profile.displayName}</Text>
            {profile.pronouns && (
              <Text style={styles.pronouns}>{profile.pronouns}</Text>
            )}
            {profile.role && (
              <Text style={styles.role}>
                {profile.role}{profile.company ? ` @ ${profile.company}` : ''}
              </Text>
            )}
            {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
          </View>
        </View>

        {/* Platform Tiles — THE CORE PRODUCT */}
        <View style={styles.tilesSection}>
          <Text style={styles.tilesLabel}>Connect on</Text>
          {profile.links.map(link => {
            const platform = PLATFORMS[link.platform];
            const state = followStates[link.id] || 'idle';
            return (
              <TouchableOpacity
                key={link.id}
                style={[
                  styles.platformTile,
                  state === 'success' && styles.tileDone,
                ]}
                onPress={() => handlePlatformAction(link)}
                activeOpacity={0.8}
                disabled={state === 'loading'}>
                <View style={[styles.tileIcon, { backgroundColor: platform?.color || COLORS.primary }]}>
                  <Text style={styles.tileIconText}>
                    {platform?.name.charAt(0) || '?'}
                  </Text>
                </View>
                <View style={styles.tileInfo}>
                  <Text style={styles.tilePlatform}>{platform?.name || link.platform}</Text>
                  <Text style={styles.tileUsername}>{link.username}</Text>
                </View>
                <View style={[
                  styles.tileAction,
                  state === 'success' && styles.tileActionDone,
                  state === 'loading' && styles.tileActionLoading,
                ]}>
                  {state === 'loading' ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={[
                      styles.tileActionText,
                      state === 'success' && styles.tileActionTextDone,
                    ]}>
                      {getButtonLabel(link)}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by DevCard ⚡</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  closeBtn: {
    position: 'absolute', top: 50, right: 20, zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.bgElevated, alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md },
  scrollContent: { padding: SPACING.lg, paddingTop: SPACING.xxl },
  profileCard: {
    backgroundColor: COLORS.bgCard, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl, borderWidth: 2, ...SHADOWS.card, marginBottom: SPACING.lg,
  },
  profileHeader: { alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: SPACING.md },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FONT_SIZE.xxl, fontWeight: '700', color: COLORS.white },
  displayName: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.textPrimary },
  pronouns: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: 2 },
  role: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, marginTop: SPACING.xs },
  bio: {
    fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textAlign: 'center',
    marginTop: SPACING.md, lineHeight: 20,
  },
  tilesSection: { gap: SPACING.sm },
  tilesLabel: {
    fontSize: FONT_SIZE.sm, color: COLORS.textMuted, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACING.xs,
  },
  platformTile: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  tileDone: { borderColor: COLORS.success, backgroundColor: 'rgba(34, 197, 94, 0.05)' },
  tileIcon: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  tileIconText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZE.md },
  tileInfo: { flex: 1, marginLeft: SPACING.md },
  tilePlatform: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textPrimary },
  tileUsername: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: 1 },
  tileAction: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    minWidth: 72, alignItems: 'center',
  },
  tileActionDone: { backgroundColor: COLORS.success },
  tileActionLoading: { backgroundColor: COLORS.primaryDark },
  tileActionText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZE.sm },
  tileActionTextDone: {},
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorEmoji: { fontSize: 48, marginBottom: SPACING.md },
  errorText: { fontSize: FONT_SIZE.lg, color: COLORS.textPrimary, fontWeight: '600' },
  backLink: { color: COLORS.primary, fontSize: FONT_SIZE.md, marginTop: SPACING.md },
  footer: { alignItems: 'center', paddingVertical: SPACING.xl },
  footerText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
});
