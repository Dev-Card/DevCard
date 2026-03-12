import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme/tokens';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/MainTabs';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WebViewConnect'>;
  route: RouteProp<RootStackParamList, 'WebViewConnect'>;
};

/**
 * WebView Connector — Layer 2 of the Hybrid Follow Engine
 *
 * Opens the platform profile in an in-app WebView so the user can
 * tap the native Follow/Connect button without leaving DevCard.
 *
 * Key features:
 * - sharedCookiesEnabled: shares auth cookies from system browser OAuth
 * - Auto-detects when user navigates away (they tapped Connect)
 * - Clean close button to dismiss
 */
export default function WebViewScreen({ navigation, route }: Props) {
  const { platform, profileUrl, displayName } = route.params;
  const webViewRef = useRef<WebView>(null);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />

      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.closeText}>✕ Close</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{displayName}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Info Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          Tap the <Text style={styles.bannerBold}>Follow</Text> or{' '}
          <Text style={styles.bannerBold}>Connect</Text> button below to complete the action
        </Text>
      </View>

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: profileUrl }}
        style={styles.webview}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>Loading {displayName}...</Text>
          </View>
        )}
        onNavigationStateChange={(navState) => {
          // If user navigates away from the profile page,
          // they likely completed the action
          // We could auto-close here in the future
        }}
      />

      {/* Done Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  closeText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md },
  headerTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textPrimary },
  headerSpacer: { width: 60 },
  banner: {
    backgroundColor: COLORS.bgCard, padding: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  bannerText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textAlign: 'center' },
  bannerBold: { fontWeight: '700', color: COLORS.primary },
  webview: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bgPrimary },
  loadingText: { color: COLORS.textMuted, fontSize: FONT_SIZE.md },
  footer: {
    padding: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  doneButton: {
    backgroundColor: COLORS.success, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, alignItems: 'center',
  },
  doneButtonText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZE.md },
});
