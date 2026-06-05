import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { put } from '../services/api';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { logout } = useAuth();
  const { colors, isDark, mode, toggleTheme } = useTheme();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY)
      .then(raw => setSettings(raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS))
      .catch(() => setSettings(DEFAULT_SETTINGS));
  }, []);

  const updateSettings = async (patch: Partial<LocalSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  };

  const deleteAllData = () => {
    Alert.alert('Delete all my data?', 'This clears local app data and signs you out.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.clear();
          await logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bgPrimary} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            accessibilityLabel="Go back"
            accessibilityRole="button"
            style={[styles.backButton, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
            onPress={() => navigation.goBack()}>
            <Text style={[styles.backIcon, { color: colors.textSecondary }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Section title="ACCOUNT">
          <SettingRow label="Connected Platforms" onPress={() => navigation.navigate('ConnectPlatforms')} />
        </Section>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          accessibilityLabel={saving ? 'Saving profile changes' : 'Save profile changes'}
          accessibilityRole="button"
          accessibilityState={{ disabled: saving, busy: saving }}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>

        {/* Integration Settings */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionSubtitle}>Integrations</Text>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => (navigation as any).navigate('ConnectPlatforms')}
            accessibilityLabel="Connected Platforms"
            accessibilityRole="button"
            accessibilityHint="Opens the screen to manage your connected developer platforms"
          >
            <View style={styles.settingRowLeft}>
              <Text style={styles.settingRowIcon}>🔌</Text>
              <Text style={styles.settingRowText}>Connected Platforms</Text>
            </View>
            <Text style={styles.settingRowArrow}>→</Text>
          </TouchableOpacity>
        </Section>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          accessibilityLabel="Log out of DevCard"
          accessibilityRole="button"
        >
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Self-hosting: devcard.dev/self-host</Text>
          <Text style={styles.footerText}>Docker Compose - Apache 2.0 - community-owned</Text>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SettingRow({
  label,
  detail,
  subtitle,
  right,
  onPress,
}: {
  label: string;
  detail?: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        accessibilityLabel={label}
        accessibilityHint={placeholder ? `Example: ${placeholder}` : undefined}
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
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  backIcon: {
    fontSize: 30,
    lineHeight: 34,
    marginTop: -2,
  },
  headerSpacer: { width: 38, height: 38 },
  title: { color: COLORS.textPrimary, fontSize: FONT_SIZE.xl, fontWeight: '800', textAlign: 'center' },
  section: { marginBottom: SPACING.md },
  sectionTitle: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, fontWeight: '700', marginBottom: SPACING.xs },
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  rowText: { flex: 1 },
  rowLabel: { color: COLORS.textPrimary, fontSize: FONT_SIZE.sm },
  rowDetail: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  rowSubtitle: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginTop: 2 },
  swatches: { flexDirection: 'row', gap: 5 },
  swatch: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: COLORS.transparent },
  swatchActive: { borderColor: COLORS.white },
  deleteButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  deleteText: { color: COLORS.error, fontSize: FONT_SIZE.sm },
  signOutButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgSecondary,
  },
  signOutText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },
  footer: { alignItems: 'center', marginTop: SPACING.md },
  footerText: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
});
