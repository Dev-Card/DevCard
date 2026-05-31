import React from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import AuthStack from './src/navigation/AuthStack';
import MainTabs from './src/navigation/MainTabs';
import SplashScreen from './src/screens/SplashScreen';
import { DEEP_LINK_SCHEME } from './src/config';

import { Linking, StyleSheet } from 'react-native';

// ── Deep Link Configuration ───────────────────────────────────────────────────

const linking: LinkingOptions<{}> = {
  prefixes: [`${DEEP_LINK_SCHEME}://`],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Home: 'home',
          Scan: 'scan',
        },
      },
      DevCardView: 'u/:username',
    },
  },
};

// ── App Content ───────────────────────────────────────────────────────────────

function AppContent() {
  const { isAuthenticated, isLoading, login } = useAuth();

  React.useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      try {
        const url = new URL(event.url);
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
        const token = url.searchParams.get('token') || hashParams.get('token');
        if (token) {
          login(token);
        }
      } catch (error) {
        console.error('Deep link parse error:', error);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      subscription.remove();
    };
  }, [login]);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer linking={linking}>
      {isAuthenticated ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <BottomSheetModalProvider>
              <AppContent />
            </BottomSheetModalProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
});
