import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZE } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';

import HomeScreen from '../screens/HomeScreen';
import LinksScreen from '../screens/LinksScreen';
import CardsScreen from '../screens/CardsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ScanScreen from '../screens/ScanScreen';
import DevCardViewScreen from '../screens/DevCardViewScreen';
import WebViewScreen from '../screens/WebViewScreen';
import ContactsScreen from '../screens/ContactsScreen';
import EventsScreen from '../screens/EventsScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import TeamsScreen from '../screens/TeamsScreen';
import TeamDetailScreen from '../screens/TeamDetailScreen';
import NfcScreen from '../screens/NfcScreen';

import { ConnectPlatformsScreen } from '../screens/ConnectPlatformsScreen';
import { ViewsScreen } from '../screens/ViewsScreen';

// ─── Types ───

export type MainTabsParamList = {
  Home: undefined;
  Contacts: undefined;
  Scan: undefined;
  Cards: undefined;
  Profile: undefined;
};

// Standalone type for WebViewConnect route params — exported for reuse in
// WebViewScreen, DevCardViewScreen, or any future screen that navigates here.
export type WebViewConnectParams = {
  platform: string;
  url: string;
  platformName: string;
  username?: string;
  linkId?: string;
  cardOwnerUsername: string;
};

export type RootStackParamList = {
  MainTabs: undefined;
  DevCardView: { username: string; followSuccessLinkId?: string };
  WebViewConnect: WebViewConnectParams;
  ConnectPlatforms: undefined;
  Views: undefined;
  Links: undefined;
  Events: undefined;
  EventDetail: { slug: string; name: string };
  Teams: undefined;
  TeamDetail: { slug: string; name: string };
  Nfc: undefined;
  Settings: undefined;
};

// ─── Tab Bar Icon ───

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '🏠',
    Contacts: '📇',
    Scan: '📷',
    Cards: '💳',
    Profile: '👤',
  };
  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>
        {icons[name] || '•'}
      </Text>
    </View>
  );
}

function ScanButton() {
  return (
    <View style={styles.scanButton}>
      <Text style={styles.scanEmoji}>📷</Text>
    </View>
  );
}

// ─── Tab Navigator ───

const Tab = createBottomTabNavigator<MainTabsParamList>();

function TabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [styles.tabBar, { backgroundColor: colors.bgSecondary, borderTopColor: colors.border }],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Contacts" component={ContactsScreen} />
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => <ScanButton />,
        }}
      />
      <Tab.Screen name="Cards" component={CardsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ─── Root Stack (Tabs + Modals) ───

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function MainTabs() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen
        name="DevCardView"
        component={DevCardViewScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="WebViewConnect"
        component={WebViewScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="ConnectPlatforms"
        component={ConnectPlatformsScreen}
        options={{ title: 'Connected Platforms', headerShown: true, headerStyle: { backgroundColor: COLORS.bgPrimary }, headerTintColor: COLORS.textPrimary }}
      />
      <Stack.Screen
        name="Views"
        component={ViewsScreen}
        options={{ title: 'Card Views Analytics', headerShown: true, headerStyle: { backgroundColor: COLORS.bgPrimary }, headerTintColor: COLORS.textPrimary }}
      />
      <Stack.Screen name="Links" component={LinksScreen} />
      <Stack.Screen name="Events" component={EventsScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="Teams" component={TeamsScreen} />
      <Stack.Screen name="TeamDetail" component={TeamDetailScreen} />
      <Stack.Screen name="Nfc" component={NfcScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.bgSecondary,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: 70,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabEmoji: {
    fontSize: 20,
    opacity: 0.5,
  },
  tabEmojiActive: {
    opacity: 1,
  },
  scanButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  scanEmoji: {
    fontSize: 24,
  },
});
