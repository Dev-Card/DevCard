import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Skeleton } from '../components/Skeleton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { get } from '../services/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/MainTabs';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

export default function HomeScreen({ navigation }: Props) {
  const { user, token } = useAuth();
  const { colors, isDark } = useTheme();
  const themed = React.useMemo(() => createThemedStyles(colors), [colors]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchUsername, setSearchUsername] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      await get<any>('/api/profiles/me', token).catch(() => null);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={themed.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bgPrimary} />
        <View style={themed.loadingRoot}>
          <Skeleton width={140} height={28} borderRadius={12} />
          <Skeleton width="75%" height={20} borderRadius={12} style={styles.loadingSpacer} />
          <Skeleton width="100%" height={180} borderRadius={24} style={styles.loadingSection} />
          <Skeleton width="100%" height={120} borderRadius={24} style={styles.loadingSection} />
          <Skeleton width="100%" height={92} borderRadius={24} style={styles.loadingSection} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={themed.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bgPrimary} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }>
        {/* Header */}
        <View style={styles.header}>
          <Text style={themed.greeting}>Hello,</Text>
          <Text style={themed.displayName}>{user?.displayName || 'Developer'} 👋</Text>
        </View>

        <View style={[styles.searchSection, themed.lookupCard]}>
          <Text style={themed.searchLabel}>🔍 View a DevCard</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={themed.searchInput}
              placeholder="Enter username..."
              placeholderTextColor={colors.textMuted}
              value={searchUsername}
              onChangeText={setSearchUsername}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={() => {
                const u = searchUsername.trim();
                if (u) (navigation as any).navigate('DevCardView', { username: u });
              }}
            />
            <TouchableOpacity
              style={themed.searchBtn}
              onPress={() => {
                const u = searchUsername.trim();
                if (u) (navigation as any).navigate('DevCardView', { username: u });
              }}
            >
            <Text style={styles.searchBtnText}>Go →</Text>
            </TouchableOpacity>
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
  actionsGrid: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    paddingVertical: SPACING.md,
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
  loadingRoot: {
    flex: 1,
    padding: SPACING.lg,
    backgroundColor: COLORS.bgPrimary,
  },
  loadingSpacer: {
    marginTop: SPACING.sm,
  },
  loadingSection: {
    marginTop: SPACING.lg,
  },
  emptyHint: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    lineHeight: 20,
    marginTop: SPACING.sm,
    maxWidth: '70%',
  },
  // Search
  searchSection: {
    marginBottom: SPACING.lg,
  },
  searchLabel: {
    fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.textSecondary,
    marginBottom: SPACING.sm, letterSpacing: 0.3,
  },
  searchRow: {
    flexDirection: 'row', gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    color: COLORS.textPrimary, fontSize: FONT_SIZE.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center', alignItems: 'center',
  },
  searchBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZE.md },
});

function createThemedStyles(colors: typeof COLORS) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    loadingRoot: {
      flex: 1,
      padding: SPACING.lg,
      backgroundColor: colors.bgPrimary,
    },
    greeting: { fontSize: FONT_SIZE.md, color: colors.textSecondary },
    displayName: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: colors.textPrimary },
    qrSection: {
      backgroundColor: colors.bgCard,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.lg,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      marginBottom: SPACING.lg,
    },
    qrHint: { fontSize: FONT_SIZE.sm, color: colors.textMuted },
    qrToggleText: { fontSize: FONT_SIZE.md, color: colors.textSecondary, fontWeight: '500' },
    actionButton: {
      flex: 1,
      backgroundColor: colors.bgCard,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.sm,
      paddingVertical: SPACING.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionText: { fontSize: FONT_SIZE.sm, color: colors.textPrimary, fontWeight: '600' },
    searchLabel: {
      fontSize: FONT_SIZE.sm,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: SPACING.sm,
      letterSpacing: 0.3,
    },
    searchInput: {
      flex: 1,
      backgroundColor: colors.bgCard,
      borderRadius: BORDER_RADIUS.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: 12,
      color: colors.textPrimary,
      fontSize: FONT_SIZE.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchBtn: {
      backgroundColor: colors.primary,
      borderRadius: BORDER_RADIUS.md,
      paddingHorizontal: SPACING.lg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    lookupCard: {
      backgroundColor: colors.bgCard,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: SPACING.lg,
    },
    stats: {
      flexDirection: 'row',
      backgroundColor: colors.bgCard,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statNumber: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: colors.primary },
    statLabel: { fontSize: FONT_SIZE.xs, color: colors.textMuted, marginTop: 4 },
    statDivider: { width: 1, backgroundColor: colors.border },
  });
}
