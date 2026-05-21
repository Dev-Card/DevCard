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
import { Skeleton } from '../components/Skeleton';
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

// ─── Platform Emoji Icon Map ───
const PLATFORM_EMOJI: Record<string, string> = {
  github: '🐙',
  linkedin: 'in',
  twitter: '𝕏',
  gitlab: '🦊',
  devfolio: '🏗️',
  npm: '📦',
  devto: '👩‍💻',
  hashnode: '📝',
  medium: 'M',
  leetcode: '🏆',
  hackerrank: '⚔️',
  stackoverflow: '💬',
  discord: '🎮',
  telegram: '✈️',
  email: '✉️',
  portfolio: '🌐',
  custom: '🔗',
};

// ─── Brand-colored action buttons ───
const PLATFORM_BTN_COLOR: Record<string, string> = {
  github: '#238636',
  linkedin: '#0A66C2',
  twitter: '#1D9BF0',
  gitlab: '#FC6D26',
  devfolio: '#3770FF',
  npm: '#CB3837',
  devto: '#3B49DF',
  leetcode: '#FFA116',
  hackerrank: '#00B86B',
  stackoverflow: '#F58025',
  discord: '#5865F2',
  telegram: '#26A5E4',
  email: '#EA4335',
  portfolio: '#6366F1',
};

export default function DevCardViewScreen({ navigation, route }: Props) {
  const { username } = route.params;
  const { token } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [followStates, setFollowStates] = useState<FollowState>({});

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const successLinkId = route.params?.followSuccessLinkId;
  useEffect(() => {
    if (successLinkId) {
      setFollowStates(prev => ({ ...prev, [successLinkId]: 'success' }));
      navigation.setParams({ followSuccessLinkId: undefined } as any);
    }
  }, [successLinkId]);

  const fetchProfile = async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE_URL}/api/u/${username}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        const initialFollowStates: FollowState = {};
        if (data.links) {
          data.links.forEach((link: any) => {
            if (link.followed) {
              initialFollowStates[link.id] = 'success';
            }
          });
        }
        setFollowStates(initialFollowStates);
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
        await handleApiFollow(link);
        break;

      case 'webview':
        setFollowStates(prev => ({ ...prev, [link.id]: 'loading' }));
        try {
          const res = await fetch(
            `${API_BASE_URL}/api/follow/${link.platform}/${link.username}`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          setFollowStates(prev => ({ ...prev, [link.id]: 'idle' }));
          if (res.ok) {
            const data = await res.json();
            if (data.strategy === 'webview') {
              handleWebViewConnect(link, data.url);
            } else {
              setFollowStates(prev => ({ ...prev, [link.id]: 'success' }));
            }
          } else {
            handleWebViewConnect(link);
          }
        } catch {
          setFollowStates(prev => ({ ...prev, [link.id]: 'idle' }));
          handleWebViewConnect(link);
        }
        break;

      case 'copy':
        Clipboard.setString(link.username);
        Alert.alert('Copied!', `${link.username} copied to clipboard`);
        setFollowStates(prev => ({ ...prev, [link.id]: 'success' }));
        break;

      case 'link':
      default:
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
          // Reset loading BEFORE opening fallback so button doesn't get stuck
          setFollowStates(prev => ({ ...prev, [link.id]: 'idle' }));
          // For platforms without a webview URL (e.g. GitHub), open in system browser
          const webViewUrl = getWebViewUrl(link.platform, link.username);
          if (webViewUrl) {
            handleWebViewConnect(link);
          } else {
            // Open GitHub / other API-only platforms in the default browser
            const profileUrl = link.url || getProfileUrl(link.platform, link.username);
            if (profileUrl) {
              Linking.openURL(profileUrl).catch(() =>
                Alert.alert('Error', `Could not open ${link.platform} profile`)
              );
            }
          }
        } else {
          setFollowStates(prev => ({ ...prev, [link.id]: 'error' }));
        }
      }
    } catch {
      setFollowStates(prev => ({ ...prev, [link.id]: 'error' }));
    }
  };

  // Reset a "Done" tile — clears follow log from backend and resets local state
  const handleResetFollowState = async (link: PlatformLink) => {
    try {
      await fetch(
        `${API_BASE_URL}/api/follow/${link.platform}/${link.username}/log`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch {
      // Ignore network errors — still reset local state
    }
    setFollowStates(prev => ({ ...prev, [link.id]: 'idle' }));
  };

  // Layer 2: WebView-based connect
  const handleWebViewConnect = (link: PlatformLink, resolvedUrl?: string) => {
    const webViewUrl = getWebViewUrl(link.platform, link.username);
    const profileUrl = link.url || getProfileUrl(link.platform, link.username);
    const url = resolvedUrl || webViewUrl || profileUrl;

    if (url) {
      navigation.navigate('WebViewConnect', {
        platform: link.platform,
        url,
        platformName: PLATFORMS[link.platform]?.name || link.platform,
        username: link.username,
        linkId: link.id,
        cardOwnerUsername: username,
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

  const getButtonColor = (link: PlatformLink, state: string): string => {
    if (state === 'success') return COLORS.success;
    if (state === 'loading') return COLORS.primaryDark;
    if (state === 'error') return '#DC2626';
    return PLATFORM_BTN_COLOR[link.platform] || COLORS.primary;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.scrollContent}>
          {/* Header Skeleton */}
          <View style={[styles.premiumHeaderCard, { borderColor: COLORS.border }]}>
            <View style={styles.cardTop}>
              <Skeleton width={100} height={12} />
              <Skeleton width={20} height={20} borderRadius={10} />
            </View>
            <View style={styles.cardMid}>
              <Skeleton width={70} height={70} borderRadius={35} />
              <View style={styles.mainInfo}>
                <Skeleton width="80%" height={24} style={{ marginBottom: 8 }} />
                <Skeleton width="60%" height={16} />
              </View>
            </View>
            <View style={styles.cardBottom}>
              <Skeleton width="70%" height={10} />
              <Skeleton width={60} height={16} />
            </View>
          </View>

          {/* Tiles Skeleton */}
          <View style={styles.tilesSection}>
            <Skeleton width={120} height={14} style={{ marginBottom: 12 }} />
            {[1, 2, 3].map(i => (
              <View key={i} style={styles.platformTile}>
                <Skeleton width={44} height={44} borderRadius={12} />
                <View style={[styles.tileInfo, { marginLeft: 16 }]}>
                  <Skeleton width="50%" height={16} style={{ marginBottom: 6 }} />
                  <Skeleton width="30%" height={12} />
                </View>
                <Skeleton width={72} height={32} borderRadius={8} />
              </View>
            ))}
          </View>
        </View>
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
        {/* Profile Card */}
        <View style={[styles.premiumHeaderCard, { borderColor: (profile.accentColor || COLORS.primary) + 'AA' }]}>
          {/* Gradient layers */}
          <View style={styles.cardGlowTop} />
          <View style={styles.cardGlass} />

          {/* Top row: brand + contactless */}
          <View style={styles.cardTop}>
            <View style={styles.brandRow}>
              <View style={[styles.miniChip, { backgroundColor: profile.accentColor || '#94A3B8' }]} />
              <Text style={styles.brandText}>DevCard PRO</Text>
            </View>
            <View style={[styles.cardBadge, { borderColor: (profile.accentColor || '#FFD700') + '55', backgroundColor: (profile.accentColor || '#FFD700') + '11' }]}>
              <Text style={[styles.badgeText, { color: profile.accentColor || 'rgba(255,215,0,0.8)' }]}>PLATINUM</Text>
            </View>
          </View>

          {/* Middle: avatar + name/role */}
          <View style={styles.cardMid}>
            <View style={[styles.avatarRing, { borderColor: (profile.accentColor || COLORS.primary) + '88' }]}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: profile.accentColor || COLORS.primary }]}>
                  <Text style={styles.avatarText}>
                    {profile.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.mainInfo}>
              <Text style={styles.profileName} numberOfLines={1}>{profile.displayName}</Text>
              {(profile.role || profile.company) && (
                <Text style={styles.profileRole} numberOfLines={2}>
                  {profile.role}{profile.company ? ` @ ${profile.company}` : ''}
                </Text>
              )}
              {profile.pronouns && (
                <Text style={styles.pronouns}>{profile.pronouns}</Text>
              )}
            </View>
          </View>

          {/* Bottom: bio + divider */}
          {profile.bio ? (
            <View style={styles.cardBottom}>
              <View style={styles.cardDivider} />
              <Text style={styles.bioText} numberOfLines={2}>{profile.bio}</Text>
            </View>
          ) : null}
        </View>

        {/* Platform Tiles Section */}
        <View style={styles.tilesSection}>
          <View style={styles.tilesHeader}>
            <Text style={styles.tilesLabel}>Digital Touchpoints</Text>
            <View style={styles.tilesCount}>
              <Text style={styles.tilesCountText}>{profile.links.length}</Text>
            </View>
          </View>

          {profile.links.map(link => {
            const platform = PLATFORMS[link.platform];
            const state = followStates[link.id] || 'idle';
            const btnColor = getButtonColor(link, state);
            const isDone = state === 'success';
            return (
              <TouchableOpacity
                key={link.id}
                style={[styles.platformTile, isDone && styles.tileDone]}
                onPress={() => handlePlatformAction(link)}
                onLongPress={() => {
                  if (isDone) {
                    Alert.alert(
                      'Reset connection?',
                      `This will clear the "Done" status for ${platform?.name || link.platform}.`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Reset',
                          style: 'destructive',
                          onPress: () => handleResetFollowState(link),
                        },
                      ]
                    );
                  }
                }}
                activeOpacity={isDone ? 0.9 : 0.8}
                disabled={state === 'loading'}>

                {/* Icon */}
                <View style={[
                  styles.tileIcon,
                  styles.tileIconBorder,
                  {
                    backgroundColor: isDone
                      ? 'rgba(34,197,94,0.12)'
                      : (platform?.color || COLORS.primary) + '22',
                    borderColor: isDone
                      ? COLORS.success
                      : (platform?.color || COLORS.primary) + '66',
                  },
                ]}>
                  {isDone ? (
                    <Text style={styles.tileIconDoneText}>✓</Text>
                  ) : (
                    <Text style={[styles.tileIconText, { color: platform?.color || COLORS.white }]}>
                      {PLATFORM_EMOJI[link.platform] || platform?.name.charAt(0) || '?'}
                    </Text>
                  )}
                </View>

                {/* Info */}
                <View style={styles.tileInfo}>
                  <Text style={styles.tilePlatform}>{platform?.name || link.platform}</Text>
                  <Text style={styles.tileUsername} numberOfLines={1}>{link.username}</Text>
                </View>

                {/* Action Button */}
                <View style={[styles.tileAction, { backgroundColor: btnColor }]}>
                  {state === 'loading' ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.tileActionText}>{getButtonLabel(link)}</Text>
                  )}
                </View>

              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md },
  scrollContent: { padding: SPACING.lg, paddingTop: SPACING.xxl },
  premiumHeaderCard: {
    backgroundColor: '#0B1120',
    borderRadius: 20,
    padding: SPACING.lg,
    borderWidth: 1,
    ...SHADOWS.card,
    marginBottom: SPACING.xl,
    position: 'relative',
    overflow: 'hidden',
    gap: SPACING.md,
  },
  cardGlowTop: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(99,102,241,0.12)',
  },
  cardGlass: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.015)',
  },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  miniChip: { width: 28, height: 18, borderRadius: 4, opacity: 0.7 },
  brandText: { color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: '800', letterSpacing: 2.5 },
  cardMid: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  avatarRing: {
    borderRadius: 38,
    borderWidth: 2,
    padding: 2,
  },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '800', color: COLORS.white },
  mainInfo: { flex: 1, gap: 3 },
  profileName: {
    fontSize: 20, fontWeight: '800', color: COLORS.white, letterSpacing: 0.2,
  },
  profileRole: {
    fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '500', lineHeight: 15,
  },
  pronouns: { fontSize: 10, color: COLORS.textMuted, fontStyle: 'italic' },
  cardBottom: { gap: SPACING.xs },
  cardDivider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 2,
  },
  bioText: { fontSize: 10.5, color: 'rgba(255,255,255,0.38)', lineHeight: 15 },
  cardBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
    borderWidth: 1,
  },
  badgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },

  // ─── Tiles ───
  tilesSection: { gap: SPACING.sm },
  tilesHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: SPACING.xs,
  },
  tilesLabel: {
    fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1.5,
  },
  tilesCount: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  tilesCountText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  platformTile: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  tileDone: {
    borderColor: COLORS.success + '55',
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
  },
  tileIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  tileIconBorder: { borderWidth: 1 },
  tileIconText: { fontWeight: '800', fontSize: 16, letterSpacing: -0.5 },
  tileIconDoneText: { fontWeight: '800', fontSize: 18, color: COLORS.success },
  tileInfo: { flex: 1 },
  tilePlatform: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textPrimary },
  tileUsername: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: 1 },
  tileAction: {
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md, paddingVertical: 7,
    minWidth: 72, alignItems: 'center', justifyContent: 'center',
  },
  tileActionText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },

  // ─── Error / Footer ───
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorEmoji: { fontSize: 48, marginBottom: SPACING.md },
  errorText: { fontSize: FONT_SIZE.lg, color: COLORS.textPrimary, fontWeight: '600' },
  backLink: { color: COLORS.primary, fontSize: FONT_SIZE.md, marginTop: SPACING.md },
  footer: { alignItems: 'center', paddingVertical: SPACING.xl },
  footerDivider: {
    width: 40, height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: SPACING.md,
  },
  footerText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, letterSpacing: 0.5 },
});
