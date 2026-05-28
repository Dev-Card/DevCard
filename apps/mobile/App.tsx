import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import AuthStack from './src/navigation/AuthStack';
import MainTabs from './src/navigation/MainTabs';

import { Linking, StyleSheet } from 'react-native';

function AppContent() {
  const { isAuthenticated, isLoading, login } = useAuth();

  React.useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      console.log('--- DEEP LINK RECEIVED ---');
      console.log('URL:', event.url);
      const url = new URL(event.url);
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
      const token = url.searchParams.get('token') || hashParams.get('token');
      if (token) {
        console.log('Token found, logging in...');
        login(token);
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
    return null; // Splash screen could go here
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

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
