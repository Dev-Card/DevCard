import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme/tokens';
import { getDeepLinkUrl } from '@devcard/shared';
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
  const {
    platform,
    url,
    platformName,
    username,
  } = route.params;

  const platformDisplayName = platformName || platform;
  const webViewRef = useRef<WebView>(null);

  const [hasLoaded, setHasLoaded] = useState(false);
  const [fallbackTriggered, setFallbackTriggered] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const isSuccessHandled = useRef(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Safety Timeout Fallback: 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasLoaded && !fallbackTriggered) {
        setFallbackTriggered(true);
        triggerDeepLinkFallback();
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [hasLoaded, fallbackTriggered]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const triggerDeepLinkFallback = () => {
    let targetUsername = username;
    if (!targetUsername && url) {
      const parts = url.split('/');
      const lastPart = parts[parts.length - 1] || parts[parts.length - 2];
      targetUsername = lastPart.split('?')[0];
    }

    const deepLink = targetUsername ? getDeepLinkUrl(platform, targetUsername) : null;

    if (deepLink) {
      Linking.canOpenURL(deepLink)
        .then((supported) => {
          Alert.alert(
            'Connection Timeout',
            `WebView timed out. Opening profile in native ${platformDisplayName}...`,
            [
              {
                text: 'Open Link',
                onPress: () => {
                  Linking.openURL(supported ? deepLink : url);
                  navigation.goBack();
                }
              }
            ]
          );
        })
        .catch(() => {
          Linking.openURL(url);
          navigation.goBack();
        });
    } else {
      Alert.alert(
        'Connection Timeout',
        'WebView timed out. Opening profile in system browser...',
        [
          {
            text: 'Open Link',
            onPress: () => {
              if (url) {
                Linking.openURL(url);
              }
              navigation.goBack();
            }
          }
        ]
      );
    }
  };

  const handleSuccess = () => {
    if (isSuccessHandled.current) return;
    isSuccessHandled.current = true;
    setSuccessToast(`Connection request sent on ${platformDisplayName}`);
    successTimerRef.current = setTimeout(() => {
      navigation.goBack();
    }, 1200);
  };

  const handleError = () => {
    if (!fallbackTriggered) {
      setFallbackTriggered(true);
      triggerDeepLinkFallback();
    }
  };

  // JS Injection: LinkedIn-specific Connect button scrolling & event detection
  const injectedJS = platform === 'linkedin' ? `
    (function() {
      // 1. Scroll Connect button into center view
      function findAndScrollConnect() {
        const els = document.querySelectorAll('button, a, span');
        for (let i = 0; i < els.length; i++) {
          const el = els[i];
          const text = (el.textContent || el.innerText || '').trim().toLowerCase();
          const label = (el.getAttribute('aria-label') || '').toLowerCase();
          if ((text === 'connect' || label.includes('connect')) && !el.disabled) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.style.border = '2px dashed #0A66C2';
            return true;
          }
        }
        return false;
      }

      let attempts = 0;
      let connectButtonSeen = false;
      const scrollInterval = setInterval(() => {
        attempts++;
        if (findAndScrollConnect()) {
          connectButtonSeen = true;
          clearInterval(scrollInterval);
        }
        if (attempts > 30) clearInterval(scrollInterval);
      }, 300);

      // 2. Poll for pending/success invite sent states
      function checkInviteStatus() {
        if (!connectButtonSeen) return false;

        const bodyText = document.body.innerText || '';
        if (bodyText.includes('Invitation sent')) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'success' }));
          return true;
        }

        const els = document.querySelectorAll('button, span');
        for (let i = 0; i < els.length; i++) {
          const text = (els[i].textContent || els[i].innerText || '').trim().toLowerCase();
          if (text === 'pending' || text === 'invitation sent') {
            window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'success' }));
            return true;
          }
        }
        return false;
      }

      setInterval(checkInviteStatus, 1000);
    })();
  ` : undefined;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />

      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.closeText}>✕ Close</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{platformDisplayName}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Info Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          You are viewing this profile in <Text style={styles.bannerBold}>DevCard</Text> — tap <Text style={styles.bannerBold}>Connect</Text> on {platformDisplayName} to send your request
        </Text>
      </View>

      {successToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{successToast}</Text>
        </View>
      )}

      {/* WebView */}
      {url ? (
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          style={styles.webview}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          injectedJavaScript={injectedJS}
          startInLoadingState={true}
          onLoadEnd={() => setHasLoaded(true)}
          onError={handleError}
          onHttpError={handleError}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.status === 'success') handleSuccess();
            } catch {}
          }}
          onNavigationStateChange={(navState) => {
            // Detect final invite-sent/shared subroutes (exclude early pages like send-invite)
            if (
              navState.url.includes('invite-sent') ||
              navState.url.includes('inviteShared')
            ) {
              handleSuccess();
            }
          }}
          renderLoading={() => (
            <View style={styles.loading}>
              <Text style={styles.loadingText}>Loading {platformDisplayName}...</Text>
            </View>
          )}
        />
      ) : (
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Invalid profile URL</Text>
        </View>
      )}

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
  toast: {
    position: 'absolute',
    top: 118,
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 20,
    backgroundColor: COLORS.success,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  toastText: { color: COLORS.white, fontSize: FONT_SIZE.sm, fontWeight: '700' },
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
