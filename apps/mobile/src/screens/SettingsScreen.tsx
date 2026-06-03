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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

export default function SettingsScreen() {
  const { user, token, refreshUser, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [pronouns, setPronouns] = useState(user?.pronouns || '');
  const [role, setRole] = useState(user?.role || '');
  const [company, setCompany] = useState(user?.company || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/profiles/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: displayName.trim(),
          bio: bio.trim() || null,
          pronouns: pronouns.trim() || null,
          role: role.trim() || null,
          company: company.trim() || null,
        }),
      });
      if (res.ok) {
        await refreshUser();
        Alert.alert('Success', 'Profile updated!');
      } else {
        Alert.alert('Error', 'Failed to update profile');
      }
    } catch (err) {
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
        <View style={styles.avatarSection}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {(user?.displayName || 'D').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.usernameDisplay}>@{user?.username}</Text>
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
  avatarPlaceholder: {
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FONT_SIZE.xxl, fontWeight: '700', color: COLORS.white },
  usernameDisplay: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, marginTop: SPACING.sm },
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
