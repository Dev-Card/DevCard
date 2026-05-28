import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { LoadingPlaceholder } from '../components/LoadingPlaceholder';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/MainTabs';

type Props = NativeStackScreenProps<RootStackParamList, 'ConnectPlatforms'>;

interface ConnectedPlatform {
  platform: string;
  connectedAt: string;
  scopes: string;
}

export const ConnectPlatformsScreen: React.FC<Props> = ({ navigation: _navigation }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connectedPlatforms, setConnectedPlatforms] = useState<ConnectedPlatform[]>([]);

  const fetchConnections = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/connect/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setConnectedPlatforms(data.connectedPlatforms || []);
      }
    } catch (err) {
      console.error('Failed to fetch connected platforms', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleConnect = async (platform: string) => {
    if (!token) {
      Alert.alert('Login required', 'Please log in again to connect platforms.');
      return;
    }
    if (platform === 'github') {
      const authUrl = `${API_BASE_URL}/api/connect/github`;
      
      try {
        await Linking.openURL(authUrl);
        // User will be redirected back to the app via deep link
        // A real app would listen to the Linking.addEventListener('url') here to refresh
        setTimeout(fetchConnections, 5000); // Polling fallback
      } catch {
        Alert.alert('Error', 'Failed to open connection page');
      }
    } else {
      Alert.alert('Coming Soon', `OAuth connect for ${platform} is not yet available.`);
    }
  };

  const handleDisconnect = (platform: string) => {
    Alert.alert(
      'Disconnect Platform',
      `Are you sure you want to disconnect ${platform}? Features like Silent Follow will stop working.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
             try {
               if (!token) return;
               const response = await fetch(`${API_BASE_URL}/api/connect/${platform}`, {
                 method: 'DELETE',
                 headers: { Authorization: `Bearer ${token}` },
               });
               if (response.ok) {
                 fetchConnections();
               } else {
                 Alert.alert('Error', 'Failed to disconnect');
               }
             } catch {
               Alert.alert('Error', 'Failed to disconnect');
             }
          }
        }
      ]
    );
  };

  const renderPlatform = (platformId: string, name: string, icon: string, description: string) => {
    const isConnected = connectedPlatforms.some(p => p.platform === platformId);

    return (
      <View style={styles.platformCard} key={platformId}>
        <View style={styles.platformHeader}>
          <Icon name={icon} size={28} color={COLORS.textPrimary} />
          <View style={styles.platformInfo}>
            <Text style={styles.platformName}>{name}</Text>
            <Text style={styles.platformDesc}>{description}</Text>
          </View>
        </View>

        {isConnected ? (
          <View style={styles.connectedState}>
            <View style={styles.statusBadge}>
              <Icon name="check-circle" size={14} color={COLORS.success} />
              <Text style={styles.statusText}>Connected</Text>
            </View>
            <TouchableOpacity 
              style={styles.disconnectBtn}
              onPress={() => handleDisconnect(platformId)}
            >
              <Text style={styles.disconnectBtnText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.connectBtn}
            onPress={() => handleConnect(platformId)}
          >
            <Text style={styles.connectBtnText}>Connect {name}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingPlaceholder rows={3} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Silent Follow Integrations</Text>
        <Text style={styles.sectionDesc}>
          Connect your accounts to allow DevCard to perform actions like "Follow" or "Connect" on your behalf directly from the app.
        </Text>

        {renderPlatform(
          'github', 
          'GitHub API', 
          'github', 
          'Follow users silently without opening a web browser.'
        )}

        {renderPlatform(
          'twitter',
          'Twitter / X API',
          'twitter',
          'Follow profiles automatically. Requires write access.'
        )}
        
        {renderPlatform(
          'linkedin',
          'LinkedIn Partner API',
          'linkedin',
          'Send connection requests. (Enterprise only).'
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  sectionDesc: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  platformCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  platformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  platformInfo: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  platformName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  platformDesc: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  connectedState: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  statusText: {
    color: COLORS.success,
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    marginLeft: 4,
  },
  disconnectBtn: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  disconnectBtnText: {
    color: COLORS.error,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  connectBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  connectBtnText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
});
