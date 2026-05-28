import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme/tokens';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/MainTabs';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { Card } from '@devcard/shared';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, APP_URL } from '../config';
import CardPickerSheet from '../components/CardPickerSheet';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

const LAST_SELECTED_CARD_KEY = 'devcard.lastSelectedCardId';

export default function ScanScreen({ navigation }: Props) {
  const { token, user } = useAuth();
  const [manualUrl, setManualUrl] = useState('');
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [storedCardId, setStoredCardId] = useState<string | null>(null);
  const [hasLoadedStoredCard, setHasLoadedStoredCard] = useState(false);
  const [hasUserSelected, setHasUserSelected] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);
  const sheetRef = useRef<BottomSheetModal>(null);

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

  const fetchCards = useCallback(async () => {
    if (!token) return;
    setLoadingCards(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/cards`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setCards(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch cards:', err);
    } finally {
      setLoadingCards(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchCards();
    }, [fetchCards])
  );

  useEffect(() => {
    const loadStoredCardId = async () => {
      try {
        const value = await AsyncStorage.getItem(LAST_SELECTED_CARD_KEY);
        setStoredCardId(value);
      } catch {
        setStoredCardId(null);
      } finally {
        setHasLoadedStoredCard(true);
      }
    };

    loadStoredCardId();
  }, []);

  useEffect(() => {
    if (!hasLoadedStoredCard) return;

    if (!cards.length) {
      setSelectedCardId(null);
      return;
    }

    const currentValid = selectedCardId && cards.some(card => card.id === selectedCardId);
    if (currentValid && hasUserSelected) return;

    const storedValid = storedCardId && cards.some(card => card.id === storedCardId);
    const defaultValid = user?.defaultCardId && cards.some(card => card.id === user.defaultCardId);
    const nextId = storedValid
      ? storedCardId
      : defaultValid
        ? user?.defaultCardId || null
        : cards[0].id;

    if (nextId && nextId !== selectedCardId) {
      setSelectedCardId(nextId);
    }
  }, [cards, storedCardId, user?.defaultCardId, selectedCardId, hasLoadedStoredCard, hasUserSelected]);

  const handleOpenPicker = () => {
    if (!cards.length) return;
    sheetRef.current?.present();
  };

  const handleSelectCard = async (cardId: string) => {
    setHasUserSelected(true);
    setSelectedCardId(cardId);
    try {
      await AsyncStorage.setItem(LAST_SELECTED_CARD_KEY, cardId);
    } catch (err) {
      console.error('Failed to persist selected card:', err);
    } finally {
      sheetRef.current?.dismiss();
    }
  };

  const selectedCard = cards.find(card => card.id === selectedCardId) || null;
  const qrUrl = selectedCard
    ? `${APP_URL}/devcard/${selectedCard.id}?card=${selectedCard.id}`
    : user?.username
      ? `${APP_URL}/u/${user.username}`
      : '';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan DevCard</Text>
          <Text style={styles.subtitle}>Scan a QR code or enter a username</Text>
        </View>

        {/* Share QR */}
        <View style={styles.shareSection}>
          <View style={styles.shareHeader}>
            <View style={styles.shareTextBlock}>
              <Text style={styles.shareTitle}>Share your DevCard</Text>
              <Text style={styles.shareSubtitle}>
                {selectedCard
                  ? selectedCard.title
                  : cards.length
                    ? 'Choose a card to share'
                    : 'No cards found'}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.switchButton,
                !cards.length && styles.switchButtonDisabled,
              ]}
              onPress={handleOpenPicker}
              disabled={!cards.length}
            >
              <Text style={styles.switchButtonText}>Switch Card</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.qrContainer}>
            {loadingCards ? (
              <View style={styles.qrSkeleton}>
                <Skeleton width={200} height={200} borderRadius={BORDER_RADIUS.md} />
                <Skeleton width={140} height={14} borderRadius={8} style={styles.qrSkeletonText} />
              </View>
            ) : qrUrl ? (
              <QRCode
                value={qrUrl}
                size={200}
                color={COLORS.textPrimary}
                backgroundColor={COLORS.bgCard}
              />
            ) : (
              <EmptyState
                title="No card to share"
                description="Create a card to generate your DevCard QR code."
              />
            )}
          </View>
          {!!qrUrl && (
            <Text style={styles.qrHint}>Scan to open your DevCard</Text>
          )}
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

      <CardPickerSheet
        ref={sheetRef}
        cards={cards}
        selectedCardId={selectedCardId}
        onSelect={handleSelectCard}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  content: { flex: 1, padding: SPACING.lg },
  header: { alignItems: 'center', marginBottom: SPACING.lg },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  shareSection: {
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  shareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  shareTextBlock: { flex: 1 },
  shareTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.textPrimary },
  shareSubtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: 4 },
  switchButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  switchButtonDisabled: {
    backgroundColor: COLORS.bgElevated,
  },
  switchButtonText: { color: COLORS.white, fontSize: FONT_SIZE.sm, fontWeight: '700' },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    minHeight: 220,
  },
  qrHint: { textAlign: 'center', color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  qrSkeleton: {
    alignItems: 'center',
  },
  qrSkeletonText: {
    marginTop: SPACING.md,
  },
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
