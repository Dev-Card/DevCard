import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../theme/tokens';
import { API_BASE_URL } from '../config';

export default function LoginScreen() {
  const handleGitHubLogin = () => {
    Linking.openURL(`${API_BASE_URL}/auth/github?state=mobile_github`);
  };

  const handleGoogleLogin = () => {
    Linking.openURL(`${API_BASE_URL}/auth/google?state=mobile_google`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>⚡</Text>
          <Text style={styles.title}>Welcome to DevCard</Text>
          <Text style={styles.subtitle}>
            Sign in to create your developer card
          </Text>
        </View>

        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.oauthButton, styles.githubButton]}
            onPress={handleGitHubLogin}
            activeOpacity={0.85}>
            <Text style={styles.oauthIcon}>🐙</Text>
            <Text style={styles.oauthText}>Continue with GitHub</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.oauthButton, styles.googleButton]}
            onPress={handleGoogleLogin}
            activeOpacity={0.85}>
            <Text style={styles.oauthIcon}>🔍</Text>
            <Text style={styles.oauthText}>Continue with Google</Text>
          </TouchableOpacity>

          <Text style={styles.terms}>
            By signing in, you agree to the DevCard Terms of Service and
            Privacy Policy.
          </Text>
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
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logo: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.bgCardGlass,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  githubButton: {
    backgroundColor: COLORS.white,
  },
  googleButton: {
    backgroundColor: COLORS.white,
  },
  oauthIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  oauthText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.textInverse,
  },
  terms: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 18,
  },
});
