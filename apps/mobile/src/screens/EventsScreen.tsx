import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { get } from '../services/api';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../theme/tokens';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/MainTabs';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList> };

export default function EventsScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [slugInput, setSlugInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLookup = async () => {
    const slug = slugInput.trim().toLowerCase();
    if (!slug) { Alert.alert('Enter a slug', 'Please enter the event slug or code.'); return; }
    setLoading(true);
    try {
      const event = await get<any>(`/api/events/${slug}`, token);
      if (event) navigation.navigate('EventDetail', { slug: event.slug, name: event.name });
    } catch { Alert.alert('Not Found', 'No event found with that code.'); }
    finally { setLoading(false); setSlugInput(''); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />
      <View style={styles.header}>
        <Text style={styles.title}>Events</Text>
        <Text style={styles.subtitle}>Join an event to network with attendees</Text>
      </View>
      <View style={styles.joinSection}>
        <View style={styles.inputRow}>
          <TextInput style={styles.input} placeholder="Event slug or code"
            placeholderTextColor={COLORS.textMuted} value={slugInput}
            onChangeText={setSlugInput} autoCapitalize="none" autoCorrect={false}
            returnKeyType="search" onSubmitEditing={handleLookup} />
          <TouchableOpacity style={[styles.searchBtn, loading && styles.disabled]}
            onPress={handleLookup} disabled={loading} activeOpacity={0.7}>
            <Icon name="magnify" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>
      <EmptyState emoji="🎪" title="Find an event"
        description="Enter an event slug above to look up and join hackathons, meetups, and conferences." />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  header: { padding: SPACING.lg, paddingBottom: SPACING.sm },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  joinSection: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg },
  inputRow: { flexDirection: 'row', gap: SPACING.sm },
  input: {
    flex: 1, backgroundColor: COLORS.bgCard, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, color: COLORS.textPrimary, fontSize: FONT_SIZE.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchBtn: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md,
    width: 48, alignItems: 'center', justifyContent: 'center', ...SHADOWS.button,
  },
  disabled: { opacity: 0.5 },
});
