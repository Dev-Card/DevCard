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
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme/tokens';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { enterDemoMode } = useAuth();

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
        <View style={styles.topSpace} />

        <View style={styles.header}>
          <View style={styles.logoCard}>
            <Text style={styles.logo}>⚡</Text>
            <Text style={styles.logoText}>DevCard</Text>
          </View>
          <Text style={styles.title}>One Tap.{"\n"}Every Profile.</Text>
          <Text style={styles.subtitle}>Stop sharing one profile at a time.</Text>
        </View>

        <View style={styles.authBlock}>
          <TouchableOpacity
            style={[styles.oauthButton, styles.githubButton]}
            onPress={handleGitHubLogin}
            activeOpacity={0.85}>
            <Text style={styles.oauthIcon}>🐙</Text>
            <Text style={styles.oauthText}>Continue with GitHub</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.oauthButton, styles.demoButton]}
            onPress={enterDemoMode}
            activeOpacity={0.85}>
            <Text style={styles.oauthIcon}>🧪</Text>
            <Text style={styles.demoText}>Continue in Demo Mode</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.oauthButton, styles.googleButton]}
            onPress={handleGoogleLogin}
            activeOpacity={0.85}>
            <Text style={styles.oauthIcon}>🔍</Text>
            <Text style={styles.oauthText}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.orLine} />
          </View>

          <TouchableOpacity activeOpacity={0.8}>
            <Text style={styles.emailLink}>Sign up with email →</Text>
          </TouchableOpacity>

          <Text style={styles.terms}>
            By continuing you agree to our Terms & Privacy Policy.
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  topSpace: {
    height: SPACING.md,
  },
  header: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  logoCard: {
    width: 126,
    height: 126,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  logo: {
    fontSize: 36,
    marginBottom: SPACING.xs,
  },
  logoText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
  },
  title: {
    textAlign: 'center',
    fontSize: 40,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 44,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: FONT_SIZE.lg,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  authBlock: {
    gap: SPACING.md,
  },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  githubButton: {
    backgroundColor: COLORS.bgCard,
    borderColor: COLORS.borderLight,
  },
  googleButton: {
    backgroundColor: COLORS.bgCard,
    borderColor: COLORS.border,
  },
  demoButton: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primary,
  },
  oauthIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  oauthText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  demoText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.white,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  orText: {
    color: COLORS.textMuted,
    marginHorizontal: SPACING.md,
    fontSize: FONT_SIZE.sm,
  },
  emailLink: {
    textAlign: 'center',
    color: COLORS.primaryLight,
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
  },
  terms: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 18,
  },
});
