import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme/tokens';
import { get, put } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PLATFORMS } from '@devcard/shared';

type PlatformLink = {
  id: string;
  platform: string;
  username: string;
  url: string;
};

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, token, refreshUser } = useAuth();
  const { colors, isDark } = useTheme();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [pronouns, setPronouns] = useState(user?.pronouns || '');
  const [links, setLinks] = useState<PlatformLink[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(user?.displayName || '');
    setBio(user?.bio || '');
    setPronouns(user?.pronouns || '');
  }, [user]);

  useEffect(() => {
    const loadProfile = async () => {
      const data = await get<any>('/api/profiles/me', token).catch(() => null);
      setLinks(data?.platformLinks || []);
    };
    loadProfile();
  }, [token]);

  const shownLinks = useMemo(() => links.slice(0, 2), [links]);
  const hiddenCount = Math.max(links.length - shownLinks.length, 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      await put('/api/profiles/me', {
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || null,
        pronouns: pronouns.trim() || null,
      }, token);
      await refreshUser();
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch {
      Alert.alert('Error', 'Unable to save profile right now.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bgPrimary} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            accessibilityLabel="Open settings"
            accessibilityRole="button"
            style={[styles.settingsButton, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Settings')}>
            <Text style={[styles.settingsIcon, { color: colors.textSecondary }]}>⚙</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Edit Profile</Text>
          <TouchableOpacity disabled={saving} onPress={handleSave} style={styles.saveButtonInline}>
            <Text style={[styles.saveText, { color: colors.primaryLight }]}>{saving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.avatarCircle, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.avatarIcon, { color: colors.textSecondary }]}>Photo</Text>
          <Text style={[styles.avatarHint, { color: colors.textMuted }]}>tap to upload</Text>
        </View>

        <Field label="Display Name" value={displayName} onChangeText={setDisplayName} />
        <Field label="One-line Bio" value={bio} onChangeText={setBio} />
        <Field label="Pronouns (optional)" value={pronouns} onChangeText={setPronouns} />

        <View style={styles.platformHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Connected Platforms</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ConnectPlatforms')}>
            <Text style={[styles.addText, { color: colors.primaryLight }]}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {shownLinks.map(link => {
          const platform = PLATFORMS[link.platform];
          return (
            <View key={link.id} style={styles.platformCard}>
              <View style={[styles.platformDot, { backgroundColor: platform?.color || COLORS.primary }]} />
              <View style={styles.platformBody}>
                <Text style={styles.platformName}>{platform?.name || link.platform}</Text>
                <Text style={styles.platformHandle}>@{link.username}</Text>
              </View>
              <Text style={styles.checkMark}>✓</Text>
            </View>
          );
        })}

        <TouchableOpacity style={[styles.addMoreCard, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]} onPress={() => navigation.navigate('ConnectPlatforms')}>
          <Text style={[styles.addMoreText, { color: colors.textMuted }]}>
            {hiddenCount > 0
              ? `+ Add Devfolio, Twitter, Discord... (${hiddenCount} more linked)`
              : '+ Add Devfolio, Twitter, Discord...'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  settingsButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingsIcon: {
    fontSize: 20,
    lineHeight: 24,
  },
  headerTitle: { color: COLORS.textPrimary, fontSize: FONT_SIZE.xl, fontWeight: '800' },
  saveButtonInline: { minWidth: 38, alignItems: 'flex-end' },
  saveText: { color: COLORS.primaryLight, fontSize: FONT_SIZE.md, fontWeight: '600' },
  avatarCircle: {
    alignSelf: 'center',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  avatarIcon: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md, fontWeight: '600' },
  avatarHint: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginTop: 2 },
  fieldWrap: { marginBottom: SPACING.md },
  fieldLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, marginBottom: SPACING.xs },
  fieldInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.bgCard,
    fontSize: FONT_SIZE.md,
  },
  platformHeader: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { color: COLORS.textPrimary, fontSize: FONT_SIZE.md, fontWeight: '700' },
  addText: { color: COLORS.primaryLight, fontSize: FONT_SIZE.md, fontWeight: '600' },
  platformCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#5E8C3D',
    backgroundColor: '#223322',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
  },
  platformDot: { width: 20, height: 20, borderRadius: 6, marginRight: SPACING.sm },
  platformBody: { flex: 1 },
  platformName: { color: COLORS.textPrimary, fontSize: FONT_SIZE.lg, fontWeight: '500' },
  platformHandle: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  checkMark: { color: '#9EDB7B', fontSize: FONT_SIZE.xl, fontWeight: '700' },
  addMoreCard: {
    marginTop: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgSecondary,
  },
  addMoreText: { color: COLORS.textMuted, fontSize: FONT_SIZE.md },
});
