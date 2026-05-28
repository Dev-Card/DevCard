import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { EmptyState } from '../components/EmptyState';
import { LoadingPlaceholder } from '../components/LoadingPlaceholder';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/MainTabs';

type Props = NativeStackScreenProps<RootStackParamList, 'Views'>;

export const ViewsScreen: React.FC<Props> = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [views, setViews] = useState<any[]>([]);

  const fetchViews = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/views`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setViews(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch views analytics', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchViews();
  }, [fetchViews]);

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
            <Image source={{ uri: item.viewer.avatarUrl }} style={styles.avatar} />
          ) : (
             <View style={[styles.avatar, styles.placeholderAvatar]}>
              <Text style={styles.placeholderText}>{item.viewer.displayName.charAt(0)}</Text>
            </View>
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
});
