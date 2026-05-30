import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Avatar from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { LoadingPlaceholder } from '../components/LoadingPlaceholder';
import { useContacts } from '../hooks/useContacts';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme/tokens';
import type { SavedContact } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/MainTabs';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

export default function ContactsScreen({ navigation }: Props) {
  const { contacts, loading, removeContact, refetch } = useContacts();

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const handlePress = (contact: SavedContact) => {
    navigation.navigate('DevCardView', { username: contact.username });
  };

  const handleRemove = (contact: SavedContact) => {
    Alert.alert(
      'Remove Contact',
      `Remove ${contact.displayName} from saved contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeContact(contact.username),
        },
      ],
    );
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />
        <LoadingPlaceholder rows={5} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />

      <View style={styles.header}>
        <Text style={styles.title}>Saved Contacts</Text>
        <Text style={styles.count}>{contacts.length}</Text>
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.username}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => handlePress(item)}
            onLongPress={() => handleRemove(item)}
            activeOpacity={0.7}>
            <Avatar
              uri={item.avatarUrl ?? undefined}
              name={item.displayName}
              size={48}
              style={styles.avatar}
            />
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {item.displayName}
              </Text>
              {item.role || item.company ? (
                <Text style={styles.detail} numberOfLines={1}>
                  {[item.role, item.company].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
              {item.metAt ? (
                <Text style={styles.metAt} numberOfLines={1}>
                  Met at {item.metAt}
                </Text>
              ) : null}
            </View>
            <View style={styles.meta}>
              <View style={[styles.accentDot, { backgroundColor: item.accentColor }]} />
              <Text style={styles.date}>{formatDate(item.savedAt)}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState
            emoji="📇"
            title="No saved contacts"
            description="When you view someone's DevCard, tap 'Save Contact' to add them here."
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.textPrimary },
  count: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.textMuted,
    backgroundColor: COLORS.bgElevated,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  list: { padding: SPACING.lg, gap: SPACING.sm, paddingTop: 0 },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: SPACING.md,
  },
  info: { flex: 1 },
  name: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textPrimary },
  detail: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  metAt: { fontSize: FONT_SIZE.xs, color: COLORS.primary, marginTop: 2 },
  meta: { alignItems: 'flex-end', gap: 4 },
  accentDot: { width: 10, height: 10, borderRadius: 5 },
  date: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
});
