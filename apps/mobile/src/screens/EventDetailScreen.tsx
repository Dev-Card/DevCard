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
import { get, post, del } from '../services/api';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../theme/tokens';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/MainTabs';

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetail'>;

interface Attendee {
  id: string; username: string; displayName: string;
  bio: string | null; avatarUrl: string | null; accentColor: string;
}

export default function EventDetailScreen({ route, navigation }: Props) {
  const { slug, name } = route.params;
  const { token } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const fetchEvent = useCallback(async () => {
    setLoading(true);
    try {
      const [detail, atts] = await Promise.all([
        get<any>(`/api/events/${slug}`, token),
        get<any>(`/api/events/${slug}/attendees`, token),
      ]);
      setEvent(detail);
      setAttendees(atts?.attendees || []);
    } catch { Alert.alert('Error', 'Failed to load event'); }
    finally { setLoading(false); }
  }, [slug, token]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      await post(`/api/events/${slug}/join`, undefined, token);
      Alert.alert('Joined!', 'You are now part of this event.');
      fetchEvent();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      Alert.alert(msg.includes('409') ? 'Already Joined' : 'Error',
        msg.includes('409') ? 'You are already part of this event.' : 'Failed to join.');
    } finally { setJoining(false); }
  };

  const handleLeave = () => {
    Alert.alert('Leave Event', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: async () => {
        try { await del(`/api/events/${slug}/leave`, undefined, token); fetchEvent(); }
        catch { Alert.alert('Error', 'Failed to leave event'); }
      }},
    ]);
  };

  const fmtDate = (s: string) => new Date(s).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />
      <LoadingPlaceholder rows={5} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />
      <FlatList
        data={attendees}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.infoCard}>
              <Text style={styles.eventName}>{event?.name || name}</Text>
              {event?.location && (
                <View style={styles.metaRow}>
                  <Icon name="map-marker" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.metaText}>{event.location}</Text>
                </View>
              )}
              <View style={styles.metaRow}>
                <Icon name="calendar" size={16} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>
                  {event ? `${fmtDate(event.startDate)} – ${fmtDate(event.endDate)}` : ''}
                </Text>
              </View>
              {event?.description && (
                <Text style={styles.description}>{event.description}</Text>
              )}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.joinBtn} onPress={handleJoin}
                  disabled={joining} activeOpacity={0.7}>
                  <Text style={styles.joinBtnText}>
                    {joining ? 'Joining…' : 'Join Event'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}
                  activeOpacity={0.7}>
                  <Text style={styles.leaveBtnText}>Leave</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.sectionTitle}>
              Attendees ({event?.attendeesCount || attendees.length})
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.attendeeRow}
            onPress={() => navigation.navigate('DevCardView', { username: item.username })}
            activeOpacity={0.7}>
            <Avatar uri={item.avatarUrl ?? undefined} name={item.displayName}
              size={40} style={styles.avatar} />
            <View style={styles.attendeeInfo}>
              <Text style={styles.attendeeName}>{item.displayName}</Text>
              <Text style={styles.attendeeUser}>@{item.username}</Text>
            </View>
            <Icon name="chevron-right" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState emoji="👥" title="No attendees yet"
            description="Be the first to join this event!" />
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
  eventName: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 4 },
  metaText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  description: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: SPACING.sm, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  joinBtn: {
    flex: 1, backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, alignItems: 'center', ...SHADOWS.button,
  },
  joinBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZE.md },
  leaveBtn: {
    backgroundColor: COLORS.bgElevated, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, paddingHorizontal: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  leaveBtnText: { color: COLORS.error, fontWeight: '600', fontSize: FONT_SIZE.md },
  sectionTitle: {
    fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  attendeeRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: SPACING.md },
  attendeeInfo: { flex: 1 },
  attendeeName: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textPrimary },
  attendeeUser: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: 1 },
});
