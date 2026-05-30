import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, StatusBar, Alert,
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

export default function TeamsScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [slugInput, setSlugInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLookup = async () => {
    const slug = slugInput.trim().toLowerCase();
    if (!slug) { Alert.alert('Enter a slug', 'Enter the team slug.'); return; }
    setLoading(true);
    try {
      const team = await get<any>(`/api/teams/${slug}`, token);
      if (team) navigation.navigate('TeamDetail', { slug: team.slug, name: team.name });
    } catch { Alert.alert('Not Found', 'No team found with that slug.'); }
    finally { setLoading(false); setSlugInput(''); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />
      <View style={styles.header}>
        <Text style={styles.title}>Teams</Text>
        <Text style={styles.subtitle}>Look up a team to view their group DevCard</Text>
      </View>
      <View style={styles.joinSection}>
        <View style={styles.inputRow}>
          <TextInput style={styles.input} placeholder="Team slug"
            placeholderTextColor={COLORS.textMuted} value={slugInput}
            onChangeText={setSlugInput} autoCapitalize="none" autoCorrect={false}
            returnKeyType="search" onSubmitEditing={handleLookup} />
          <TouchableOpacity style={[styles.searchBtn, loading && styles.disabled]}
            onPress={handleLookup} disabled={loading} activeOpacity={0.7}>
            <Icon name="magnify" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>
      <EmptyState emoji="👥" title="Find a team"
        description="Enter a team slug to view members and their DevCards." />
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
