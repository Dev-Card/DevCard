import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { get } from '../services/api';
import { EmptyState } from '../components/EmptyState';
import Avatar from '../components/Avatar';
import { LoadingPlaceholder } from '../components/LoadingPlaceholder';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/MainTabs';

type Props = NativeStackScreenProps<RootStackParamList, 'Views'>;

export const ViewsScreen: React.FC<Props> = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [views, setViews] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);

  const fetchData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const [viewsData, overviewData] = await Promise.all([
        get<any>('/api/analytics/views', token).catch(() => null),
        get<any>('/api/analytics/overview', token).catch(() => null),
      ]);
      setViews(viewsData?.data || []);
      setOverview(overviewData);
    } catch (error) {
      console.error('Failed to fetch analytics', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'qr': return 'qrcode';
      case 'link': return 'link-variant';
      case 'web': return 'web';
      default: return 'eye';
    }
  };

  // Generate simple bar chart data for last 7 days
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { date: d.toLocaleDateString('en-US', { weekday: 'short' }), count: 0 };
    });

    views.forEach(v => {
      const d = new Date(v.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
      const day = last7Days.find(x => x.date === d);
      if (day) day.count++;
    });

    const max = Math.max(...last7Days.map(d => d.count), 1); // prevent division by zero
    return { data: last7Days, max };
  }, [views]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{overview?.totalViews || 0}</Text>
          <Text style={styles.statLabel}>Total Views</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{overview?.followsCount || 0}</Text>
          <Text style={styles.statLabel}>Connections</Text>
        </View>
      </View>
      
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Views (Last 7 Days)</Text>
        <View style={styles.chartContainer}>
          {chartData.data.map((item, idx) => {
            const heightPerc = (item.count / chartData.max) * 100;
            return (
              <View key={idx} style={styles.barWrapper}>
                <Text style={styles.barLabelTop}>{item.count > 0 ? item.count : ''}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: `${heightPerc}%` }]} />
                </View>
                <Text style={styles.barLabel}>{item.date}</Text>
              </View>
            );
          })}
        </View>
      </View>
      
      <Text style={styles.sectionTitle}>Recent Activity</Text>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    const isAnonymous = !item.viewer;
    
    return (
      <View style={styles.viewItem}>
        <View style={styles.avatarContainer}>
          {isAnonymous ? (
            <View style={[styles.avatar, styles.anonymousAvatar]}>
              <Icon name="incognito" size={24} color={COLORS.textSecondary} />
            </View>
          ) : item.viewer.avatarUrl ? (
            <Avatar uri={item.viewer.avatarUrl} name={item.viewer.displayName} size={48} style={styles.avatar} />
          ) : (
            <Avatar name={item.viewer.displayName} size={48} style={styles.avatar} />
          )}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.viewerName}>
            {isAnonymous ? 'Anonymous Viewer' : item.viewer.displayName}
          </Text>
          <Text style={styles.viewTarget}>
            {item.cardId ? `Viewed Card: ${item.card?.title || 'Unknown'}` : 'Viewed Main Profile'}
          </Text>
          <Text style={styles.timestamp}>{formatDate(item.createdAt)}</Text>
        </View>

        <View style={styles.sourceBadge}>
          <Icon name={getSourceIcon(item.source)} size={16} color={COLORS.primary} />
          <Text style={styles.sourceText}>{item.source.toUpperCase()}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingPlaceholder rows={4} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {views.length === 0 ? (
        <EmptyState
          emoji="📊"
          title="No views yet"
          description="Share your card or QR code to start collecting analytics."
        />
      ) : (
        <FlatList
          data={views}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: SPACING.md,
  },
  viewItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  avatarContainer: {
    marginRight: SPACING.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.bgElevated,
  },
  anonymousAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bgElevated,
  },
  placeholderAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  placeholderText: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  infoContainer: {
    flex: 1,
  },
  viewerName: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  viewTarget: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    marginTop: 2,
  },
  timestamp: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    marginTop: 4,
  },
  sourceBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
  },
  sourceText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    marginTop: SPACING.md,
  },
  emptyDesc: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  headerContainer: {
    paddingBottom: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 4,
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.xl,
  },
  chartTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingTop: 20,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    width: 24,
    height: 100,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  barLabelTop: {
    fontSize: 10,
    color: COLORS.primary,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
});
