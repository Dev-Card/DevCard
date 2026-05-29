import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme/tokens';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/MainTabs';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

type NfcStatus = 'idle' | 'checking' | 'unsupported' | 'supported' | 'fetching' | 'ready' | 'writing' | 'success' | 'error';

export default function NFCWriteScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [status, setStatus] = useState<NfcStatus>('idle');
  const [payloadUrl, setPayloadUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const checkNfc = useCallback(async () => {
    setStatus('checking');
    try {
      await NfcManager.start();
      const isSupported = await NfcManager.isSupported();
      if (!isSupported) {
        setStatus('unsupported');
        return;
      }
      const isEnabled = await NfcManager.isEnabled();
      if (!isEnabled) {
        setErrorMessage('NFC is disabled. Please enable NFC in your device settings.');
        setStatus('unsupported');
        return;
      }
      setStatus('supported');
    } catch {
      setStatus('unsupported');
      setErrorMessage('Failed to check NFC availability.');
    }
  }, []);

  const fetchPayload = useCallback(async () => {
    setStatus('fetching');
    try {
      const res = await fetch(`${API_BASE_URL}/api/nfc/payload`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch NFC payload');
      }
      const data = await res.json();
      setPayloadUrl(data.payload);
      setStatus('ready');
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to fetch NFC payload');
      setStatus('error');
    }
  }, [token]);

  useEffect(() => {
    checkNfc();
  }, [checkNfc]);

  useEffect(() => {
    if (status === 'supported') {
      fetchPayload();
    }
  }, [status, fetchPayload]);

  const handleWriteTag = async () => {
    if (!payloadUrl) return;
    setStatus('writing');
    try {
      const bytes = Ndef.encodeMessage([Ndef.uriRecord(payloadUrl)]);
      if (!bytes) {
        throw new Error('Failed to encode NDEF message');
      }

      await NfcManager.requestTechnology(NfcTech.Ndef);
      await NfcManager.writeTag(bytes);
      await NfcManager.setAlertMessage('DevCard written to tag!');
      await NfcManager.cleanTechnology();

      setStatus('success');
    } catch (error: any) {
      await NfcManager.cancelTechnologyRequest().catch(() => {});
      const message = error.message || 'Failed to write NFC tag';
      setErrorMessage(message);
      setStatus('error');
    }
  };

  const handleRetry = () => {
    setStatus('idle');
    setErrorMessage('');
    checkNfc();
  };

  const handleDone = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <Text style={styles.title}>Write NFC Tag</Text>
        <Text style={styles.subtitle}>
          Write your DevCard URL to a physical NFC tag
        </Text>

        {/* NFC Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.nfcIcon}>📶</Text>
        </View>

        {/* Status Area */}
        <View style={styles.statusArea}>
          {status === 'checking' && (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.statusText}>Checking NFC...</Text>
            </View>
          )}

          {status === 'unsupported' && (
            <View style={styles.statusRow}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <View style={styles.errorContent}>
                <Text style={styles.errorTitle}>NFC Not Available</Text>
                <Text style={styles.errorDetail}>
                  {errorMessage || (Platform.OS === 'ios'
                    ? 'NFC writing requires an iPhone XR/XS or newer with the NFC entitlement enabled.'
                    : 'Your device does not support NFC or NFC is disabled.')}
                </Text>
              </View>
            </View>
          )}

          {status === 'fetching' && (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.statusText}>Preparing payload...</Text>
            </View>
          )}

          {status === 'ready' && (
            <View style={styles.readyContainer}>
              <View style={styles.urlPreview}>
                <Text style={styles.urlLabel}>URL to write:</Text>
                <Text style={styles.urlText} numberOfLines={2}>
                  {payloadUrl}
                </Text>
              </View>
              <Text style={styles.readyHint}>
                Hold your NFC tag near the top of your device
              </Text>
            </View>
          )}

          {status === 'writing' && (
            <View style={styles.statusRow}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.statusText}>Writing to tag...</Text>
            </View>
          )}

          {status === 'success' && (
            <View style={styles.statusRow}>
              <Text style={styles.successIcon}>✅</Text>
              <View style={styles.errorContent}>
                <Text style={styles.successTitle}>Success!</Text>
                <Text style={styles.successDetail}>
                  Your DevCard has been written to the NFC tag.
                </Text>
              </View>
            </View>
          )}

          {status === 'error' && (
            <View style={styles.statusRow}>
              <Text style={styles.errorIcon}>❌</Text>
              <View style={styles.errorContent}>
                <Text style={styles.errorTitle}>Write Failed</Text>
                <Text style={styles.errorDetail}>
                  {errorMessage || 'An unexpected error occurred.'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {status === 'ready' && (
            <TouchableOpacity
              style={styles.writeButton}
              onPress={handleWriteTag}
              activeOpacity={0.85}>
              <Text style={styles.writeButtonText}>Write to NFC Tag</Text>
            </TouchableOpacity>
          )}

          {(status === 'error' || status === 'unsupported') && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              activeOpacity={0.85}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          )}

          {status === 'success' && (
            <TouchableOpacity
              style={styles.doneButton}
              onPress={handleDone}
              activeOpacity={0.85}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nfcIcon: {
    fontSize: 48,
  },
  statusArea: {
    width: '100%',
    marginBottom: SPACING.xl,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  statusText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  readyContainer: {
    gap: SPACING.md,
  },
  urlPreview: {
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  urlLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  urlText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.primary,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  readyHint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorContent: {
    flex: 1,
  },
  errorTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: SPACING.xs,
  },
  errorDetail: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  errorIcon: {
    fontSize: 24,
  },
  successIcon: {
    fontSize: 24,
  },
  successTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.success,
    marginBottom: SPACING.xs,
  },
  successDetail: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  actions: {
    width: '100%',
    gap: SPACING.md,
  },
  writeButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  writeButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  retryButton: {
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  retryButtonText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: COLORS.success,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
  },
});
