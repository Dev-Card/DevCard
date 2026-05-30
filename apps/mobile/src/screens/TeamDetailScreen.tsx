import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Avatar from '../components/Avatar';
import { LoadingPlaceholder } from '../components/LoadingPlaceholder';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { get } from '../services/api';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../theme/tokens';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/MainTabs';
import type { TeamMember } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'TeamDetail'>;

export default function TeamDetailScreen({ route, navigation }: Props) {
  const { slug, name } = route.params;
  const { token } = useAuth();
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    try {
      const data = await get<any>(`/api/teams/${slug}`, token);
      setTeam(data);
    } catch { Alert.alert('Error', 'Failed to load team'); }
    finally { setLoading(false); }
  }, [slug, token]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER': return { label: 'Owner', color: COLORS.warning };
      case 'ADMIN': return { label: 'Admin', color: COLORS.info };
      default: return { label: 'Member', color: COLORS.textMuted };
    }
  };

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />
      <LoadingPlaceholder rows={5} />
    </SafeAreaView>
  );

  const members: TeamMember[] = team?.members || [];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />
      <FlatList
        data={members}
        keyExtractor={(item) => item.username}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.infoCard}>
              <Text style={styles.teamName}>{team?.name || name}</Text>
              {team?.description && (
                <Text style={styles.description}>{team.description}</Text>
              )}
              <Text style={styles.memberCount}>
                {members.length} member{members.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <Text style={styles.sectionTitle}>Members</Text>
          </View>
        }
        renderItem={({ item }) => {
          const badge = getRoleBadge(item.teamRole);
          return (
            <TouchableOpacity style={styles.memberRow}
              onPress={() => navigation.navigate('DevCardView', { username: item.username })}
              activeOpacity={0.7}>
              <Avatar uri={item.avatarUrl ?? undefined} name={item.displayName}
                size={40} style={styles.avatar} />
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.displayName}</Text>
                {item.role && <Text style={styles.memberRole}>{item.role}</Text>}
              </View>
              <View style={[styles.roleBadge, { borderColor: badge.color }]}>
                <Text style={[styles.roleBadgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState emoji="👥" title="No members" description="This team has no members yet." />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  list: { padding: SPACING.lg },
  infoCard: {
    backgroundColor: COLORS.bgCard, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.lg, ...SHADOWS.card,
  },
  teamName: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  description: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.sm },
  memberCount: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '600' },
  sectionTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: SPACING.md },
  memberInfo: { flex: 1 },
  memberName: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textPrimary },
  memberRole: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: 1 },
  roleBadge: {
    borderWidth: 1, borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
  },
  roleBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: '600' },
});
