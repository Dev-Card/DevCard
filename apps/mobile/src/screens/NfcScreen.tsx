import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';
import { get } from '../services/api';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../theme/tokens';
import type { NfcPayload } from '../types';

/**
 * NfcScreen — NFC tag write/read UI.
 *
 * NOTE: Actual NFC hardware interaction requires `react-native-nfc-manager`
 * which needs a dev build (not Expo Go). This screen provides the UI and
 * fetches the NDEF payload from the backend. The NFC write call is stubbed
 * with a TODO for native module integration.
 */
export default function NfcScreen() {
  const { token } = useAuth();
  const [payload, setPayload] = useState<NfcPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [written, setWritten] = useState(false);

  const fetchPayload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await get<NfcPayload>('/api/nfc/payload', token);
      setPayload(data);
    } catch {
      Alert.alert('Error', 'Failed to fetch NFC payload from server.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleWriteTag = async () => {
    if (!payload) {
      await fetchPayload();
      return;
    }

    // TODO: Integrate react-native-nfc-manager here
    // import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
    // await NfcManager.requestTechnology(NfcTech.Ndef);
    // const bytes = Ndef.encodeMessage([Ndef.uriRecord(payload.payload)]);
    // await NfcManager.ndefHandler.writeNdefMessage(bytes);
    // await NfcManager.cancelTechnologyRequest();

    Alert.alert(
      'NFC Not Available',
      'NFC write requires a dev build with react-native-nfc-manager. The payload URL has been prepared.',
      [{ text: 'OK' }],
    );
    setWritten(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon name="nfc" size={64} color={COLORS.primary} />
        </View>

        <Text style={styles.title}>NFC Tag Writer</Text>
        <Text style={styles.subtitle}>
          Write your DevCard URL to an NFC tag so anyone can tap to view your profile.
        </Text>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Icon name="link-variant" size={18} color={COLORS.textSecondary} />
            <Text style={styles.cardLabel}>Payload URL</Text>
          </View>
          <Text style={styles.payloadUrl} selectable numberOfLines={2}>
            {payload?.payload || 'Tap "Prepare" to generate'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.prepareBtn}
          onPress={fetchPayload}
          disabled={loading}
          activeOpacity={0.7}>
          <Icon name="refresh" size={18} color={COLORS.white} />
          <Text style={styles.prepareBtnText}>
            {loading ? 'Loading…' : 'Prepare Payload'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.writeBtn, !payload && styles.writeBtnDisabled]}
          onPress={handleWriteTag}
          disabled={!payload}
          activeOpacity={0.7}>
          <Icon name="nfc-tap" size={20} color={payload ? COLORS.white : COLORS.textMuted} />
          <Text style={[styles.writeBtnText, !payload && styles.writeBtnTextDisabled]}>
            Write to NFC Tag
          </Text>
        </TouchableOpacity>

        {written && (
          <View style={styles.successBanner}>
            <Icon name="check-circle" size={18} color={COLORS.success} />
            <Text style={styles.successText}>Tag written successfully!</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  content: { flex: 1, padding: SPACING.lg, alignItems: 'center', justifyContent: 'center' },
  iconContainer: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: COLORS.bgCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.primary + '44', marginBottom: SPACING.lg,
  },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: {
    fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textAlign: 'center',
    marginTop: SPACING.xs, marginBottom: SPACING.xl, lineHeight: 20, maxWidth: 300,
  },
  card: {
    width: '100%', backgroundColor: COLORS.bgCard, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.lg,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.sm },
  cardLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, fontWeight: '500' },
  payloadUrl: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontFamily: 'monospace' },
  prepareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.bgElevated, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, paddingHorizontal: SPACING.lg, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  prepareBtnText: { color: COLORS.textPrimary, fontWeight: '600', fontSize: FONT_SIZE.md },
  writeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, paddingHorizontal: SPACING.xl, ...SHADOWS.button,
  },
  writeBtnDisabled: { backgroundColor: COLORS.bgElevated },
  writeBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZE.md },
  writeBtnTextDisabled: { color: COLORS.textMuted },
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginTop: SPACING.lg, backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: BORDER_RADIUS.md, padding: SPACING.md,
  },
  successText: { color: COLORS.success, fontWeight: '600', fontSize: FONT_SIZE.sm },
});
