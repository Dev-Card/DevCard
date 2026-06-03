import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  StatusBar,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Avatar from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { LoadingPlaceholder } from '../components/LoadingPlaceholder';
import { useContacts } from '../hooks/useContacts';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';
import type { SavedContact } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/MainTabs';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

export default function ContactsScreen({ navigation }: Props) {
  const { contacts, loading, removeContact, refetch } = useContacts();
  const { colors, isDark } = useTheme();
  const themed = React.useMemo(() => createContactsThemedStyles(colors), [colors]);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'week' | 'osd'>('all');

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
    const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    const weeks = Math.floor(diffDays / 7);
    if (weeks === 1) return '1 week ago';
    return `${weeks} weeks ago`;
  };

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts.filter((c) => {
      const haystack = [c.displayName, c.username, c.role, c.company, c.metAt, c.bio]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesQuery = q.length === 0 || haystack.includes(q);
      if (!matchesQuery) return false;

      if (activeFilter === 'all') return true;
      if (activeFilter === 'week') {
        const days = Math.floor((Date.now() - new Date(c.savedAt).getTime()) / (1000 * 60 * 60 * 24));
        return days <= 7;
      }
      return [c.metAt, c.company, c.bio].filter(Boolean).join(' ').toLowerCase().includes('osd');
    });
  }, [contacts, query, activeFilter]);

  const getTag = (contact: SavedContact) => {
    const source = `${contact.bio || ''} ${contact.company || ''}`.toLowerCase();
    if (source.includes('github')) return 'GitHub';
    if (source.includes('linkedin')) return 'LinkedIn';
    if (source.includes('devfolio')) return 'Devfolio';
    if (source.includes('twitter') || source.includes('x.com')) return 'Twitter';
    return contact.company || contact.role || 'Saved';
  };

  if (loading) {
    return (
      <SafeAreaView style={themed.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bgPrimary} />
        <LoadingPlaceholder rows={5} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={themed.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bgPrimary} />

      <View style={styles.header}>
        <Text style={themed.title}>Saved Cards</Text>
        <Text style={themed.headerIcon}>⊕</Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={themed.searchInput}
          placeholder="Search contacts..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <View style={styles.filtersRow}>
        <FilterChip label="All" active={activeFilter === 'all'} colors={colors} onPress={() => setActiveFilter('all')} />
        <FilterChip label="This week" active={activeFilter === 'week'} colors={colors} onPress={() => setActiveFilter('week')} />
        <FilterChip label="OSD 2026" active={activeFilter === 'osd'} colors={colors} onPress={() => setActiveFilter('osd')} />
      </View>

      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => item.username}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={themed.contactItem}
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
                <Text style={themed.name} numberOfLines={1}>
                {item.displayName}
              </Text>
              <Text style={themed.detail} numberOfLines={1}>
                {[item.metAt || item.company || item.role || 'Event', formatDate(item.savedAt)].join(' · ')}
              </Text>
              <View style={themed.tagPill}>
                <Text style={themed.tagText}>{getTag(item)}</Text>
              </View>
            </View>
            <Text style={themed.chevron}>›</Text>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <View style={themed.footerNote}>
            <Text style={themed.footerTitle}>↓ Tap contact to view</Text>
            <Text style={themed.footerSub}>Where met · note · re-share</Text>
          </View>
        }
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
  headerIcon: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },
  searchWrap: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  searchInput: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.textPrimary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.md,
  },
  filtersRow: {
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  list: { padding: SPACING.lg, gap: SPACING.sm, paddingTop: 0, paddingBottom: SPACING.xl },
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
  tagPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagText: { color: COLORS.primaryLight, fontSize: FONT_SIZE.xs },
  chevron: { color: COLORS.textMuted, fontSize: FONT_SIZE.lg, marginLeft: SPACING.sm },
  footerNote: {
    marginTop: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgSecondary,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  footerTitle: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md, fontWeight: '500' },
  footerSub: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, marginTop: 4 },
});

function FilterChip({
  label,
  active,
  colors,
  onPress,
}: {
  label: string;
  active: boolean;
  colors: typeof COLORS;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        stylesChip.chip,
        active
          ? { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary }
          : { backgroundColor: colors.bgCard, borderColor: colors.border },
      ]}>
      <Text style={[stylesChip.text, { color: active ? colors.textInverse : colors.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const stylesChip = StyleSheet.create({
  chip: {
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderWidth: 1,
  },
  text: { fontSize: FONT_SIZE.sm, fontWeight: '500' },
});

function createContactsThemedStyles(colors: typeof COLORS) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    title: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: colors.textPrimary },
    headerIcon: {
      color: colors.textSecondary,
      fontSize: FONT_SIZE.xl,
      fontWeight: '700',
    },
    searchInput: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.textPrimary,
      borderRadius: BORDER_RADIUS.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      fontSize: FONT_SIZE.md,
    },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgCard,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    name: { fontSize: FONT_SIZE.md, fontWeight: '600', color: colors.textPrimary },
    detail: { fontSize: FONT_SIZE.sm, color: colors.textSecondary, marginTop: 2 },
    tagPill: {
      alignSelf: 'flex-start',
      marginTop: 6,
      backgroundColor: colors.bgSecondary,
      borderRadius: BORDER_RADIUS.full,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tagText: { color: colors.primaryLight, fontSize: FONT_SIZE.xs },
    chevron: { color: colors.textMuted, fontSize: FONT_SIZE.lg, marginLeft: SPACING.sm },
    footerNote: {
      marginTop: SPACING.sm,
      borderRadius: BORDER_RADIUS.md,
      borderStyle: 'dashed',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgSecondary,
      paddingVertical: SPACING.lg,
      alignItems: 'center',
    },
    footerTitle: { color: colors.textSecondary, fontSize: FONT_SIZE.md, fontWeight: '500' },
    footerSub: { color: colors.textMuted, fontSize: FONT_SIZE.sm, marginTop: 4 },
  });
}
