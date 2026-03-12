import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme/tokens';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/MainTabs';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

export default function ScanScreen({ navigation }: Props) {
  const [manualUrl, setManualUrl] = useState('');

  // Extract username from DevCard URL
  const parseDevCardUrl = (url: string): string | null => {
    const match = url.match(/\/u\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const handleManualEntry = () => {
    const username = parseDevCardUrl(manualUrl) || manualUrl.trim();
    if (username) {
      navigation.navigate('DevCardView', { username });
      setManualUrl('');
    } else {
      Alert.alert('Invalid', 'Please enter a valid DevCard username or URL');
    }
  };

  // NOTE: Camera QR scanning requires react-native-camera-kit
  // which needs native setup. For now, we provide manual entry.
  // Camera integration will be added when building on device.

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan DevCard</Text>
          <Text style={styles.subtitle}>Scan a QR code or enter a username</Text>
        </View>

        {/* Camera Placeholder */}
        <View style={styles.cameraArea}>
          <View style={styles.cameraPlaceholder}>
            <Text style={styles.cameraEmoji}>📷</Text>
            <Text style={styles.cameraText}>Camera QR Scanner</Text>
            <Text style={styles.cameraSubtext}>
              Point your camera at a DevCard QR code
            </Text>
          </View>
          {/* Corner markers */}
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>

        {/* Manual Entry */}
        <View style={styles.manualSection}>
          <Text style={styles.orDividerText}>— or enter manually —</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Username or DevCard URL"
              placeholderTextColor={COLORS.textMuted}
              value={manualUrl}
              onChangeText={setManualUrl}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleManualEntry}
            />
            <TouchableOpacity style={styles.goButton} onPress={handleManualEntry}>
              <Text style={styles.goButtonText}>→</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  content: { flex: 1, padding: SPACING.lg },
  header: { alignItems: 'center', marginBottom: SPACING.lg },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  cameraArea: {
    flex: 1, maxHeight: 350,
    backgroundColor: COLORS.bgCard, borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden', marginBottom: SPACING.lg, position: 'relative',
  },
  cameraPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  cameraEmoji: { fontSize: 48, marginBottom: SPACING.md },
  cameraText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textPrimary },
  cameraSubtext: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: SPACING.xs },
  corner: {
    position: 'absolute', width: 30, height: 30,
    borderColor: COLORS.primary, borderWidth: 3,
  },
  topLeft: { top: 12, left: 12, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  topRight: { top: 12, right: 12, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  bottomLeft: { bottom: 12, left: 12, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  bottomRight: { bottom: 12, right: 12, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  manualSection: { gap: SPACING.md },
  orDividerText: { textAlign: 'center', color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  inputRow: { flexDirection: 'row', gap: SPACING.sm },
  input: {
    flex: 1, backgroundColor: COLORS.bgCard, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, color: COLORS.textPrimary, fontSize: FONT_SIZE.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  goButton: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md,
    width: 48, alignItems: 'center', justifyContent: 'center',
  },
  goButtonText: { color: COLORS.white, fontSize: FONT_SIZE.xl, fontWeight: '700' },
});
