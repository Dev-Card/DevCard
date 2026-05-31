import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme/tokens';
import Avatar from '../components/Avatar';
import ColorPicker from '../components/ColorPicker';
import { useAuth } from '../context/AuthContext';
import { put } from '../services/api';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, token, refreshUser, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [pronouns, setPronouns] = useState(user?.pronouns || '');
  const [role, setRole] = useState(user?.role || '');
  const [company, setCompany] = useState(user?.company || '');
  const [accentColor, setAccentColor] = useState(user?.accentColor || '#6366F1');
  const [saving, setSaving] = useState(false);

  const handleAvatarTap = () => {
    // TODO: Integrate react-native-image-picker when building on device
    // import { launchImageLibrary } from 'react-native-image-picker';
    // const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    // Upload via multipart/form-data to PUT /api/profiles/me/avatar
    Alert.alert(
      'Change Avatar',
      'Avatar upload requires react-native-image-picker in a dev build. Coming soon!',
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || null,
        pronouns: pronouns.trim() || null,
        role: role.trim() || null,
        company: company.trim() || null,
        accentColor,
      };

      await put('/api/profiles/me', payload, token);
      await refreshUser();
      Alert.alert('Success', 'Profile updated!');
    } catch {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Profile Settings</Text>

        {/* Avatar */}
        <TouchableOpacity style={styles.avatarSection} onPress={handleAvatarTap} activeOpacity={0.7}>
          <Avatar uri={user?.avatarUrl} name={user?.displayName} size={80} style={styles.avatar} />
          <Text style={styles.avatarHint}>Tap to change</Text>
          <Text style={styles.usernameDisplay}>@{user?.username}</Text>
        </TouchableOpacity>

        {/* Accent Color */}
        <View style={styles.colorSection}>
          <Text style={styles.sectionSubtitle}>Card Accent Color</Text>
          <ColorPicker selected={accentColor} onSelect={setAccentColor} />
        </View>

        {/* Form */}
        <View style={styles.form}>
          <FormField label="Display Name" value={displayName} onChangeText={setDisplayName} />
          <FormField label="Bio" value={bio} onChangeText={setBio} multiline placeholder="Tell people about yourself..." />
          <FormField label="Pronouns" value={pronouns} onChangeText={setPronouns} placeholder="e.g. they/them" />
          <FormField label="Role" value={role} onChangeText={setRole} placeholder="e.g. Senior Engineer" />
          <FormField label="Company" value={company} onChangeText={setCompany} placeholder="e.g. OpenSource Inc." />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}>
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>

        {/* Integration Settings */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionSubtitle}>Integrations</Text>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => (navigation as any).navigate('ConnectPlatforms')}>
            <View style={styles.settingRowLeft}>
              <Text style={styles.settingRowIcon}>🔌</Text>
              <Text style={styles.settingRowText}>Connected Platforms</Text>
            </View>
            <Text style={styles.settingRowArrow}>→</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>DevCard v1.0.0</Text>
          <Text style={styles.appInfoText}>Open Source • Apache 2.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  multiline = false,
  placeholder = '',
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  placeholder?: string;
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  scrollContent: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.lg },
  avatarSection: { alignItems: 'center', marginBottom: SPACING.xl },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarHint: { fontSize: FONT_SIZE.xs, color: COLORS.primary, marginTop: SPACING.xs, fontWeight: '500' },
  avatarPlaceholder: {
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FONT_SIZE.xxl, fontWeight: '700', color: COLORS.white },
  usernameDisplay: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, marginTop: SPACING.sm },
  colorSection: { marginBottom: SPACING.lg },
  form: { gap: SPACING.md, marginBottom: SPACING.lg },
  field: {},
  fieldLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING.xs, fontWeight: '500' },
  fieldInput: {
    backgroundColor: COLORS.bgCard, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, color: COLORS.textPrimary, fontSize: FONT_SIZE.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  fieldInputMultiline: { height: 80, textAlignVertical: 'top' },
  saveButton: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, alignItems: 'center', marginBottom: SPACING.md,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZE.md },
  logoutButton: {
    borderRadius: BORDER_RADIUS.md, padding: SPACING.md,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.error,
  },
  logoutButtonText: { color: COLORS.error, fontWeight: '600', fontSize: FONT_SIZE.md },
  sectionContainer: { marginBottom: SPACING.xl },
  sectionSubtitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.sm },
  settingRow: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.bgCard, padding: SPACING.md, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border
  },
  settingRowLeft: { flexDirection: 'row', alignItems: 'center' },
  settingRowIcon: { fontSize: 20, marginRight: SPACING.sm },
  settingRowText: { fontSize: FONT_SIZE.md, color: COLORS.textPrimary, fontWeight: '500' },
  settingRowArrow: { fontSize: 20, color: COLORS.textMuted },
  appInfo: { alignItems: 'center', marginTop: SPACING.xl, gap: 4 },
  appInfoText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
});
