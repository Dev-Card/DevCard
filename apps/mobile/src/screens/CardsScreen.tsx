import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Modal,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PLATFORMS } from '@devcard/shared';
import { get, post, del, put } from '../services/api';
import { API_BASE_URL } from '../config';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';

interface PlatformLink {
  id: string;
  platform: string;
  username: string;
  url?: string;
}

type CardVisibility = 'PUBLIC' | 'UNLISTED' | 'PRIVATE';

interface Card {
  id: string;
  title: string;
  description: string | null;
  slug?: string;
  visibility: CardVisibility;
  qrEnabled: boolean;
  viewCount: number;
  isDefault: boolean;
  links: PlatformLink[];
}

type ApiCard = Card & {
  cardLinks?: Array<{ link?: PlatformLink; platformLink?: PlatformLink }>;
};

type CardAlert = {
  title: string;
  message: string;
  tone?: 'success' | 'error' | 'info' | 'danger';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
};

const getApiCardLinks = (card: ApiCard): PlatformLink[] => {
  if (card.links) return card.links;
  return (card.cardLinks ?? []).map(cl => cl.platformLink ?? cl.link).filter(Boolean) as PlatformLink[];
};

export default function CardsScreen() {
  const { token } = useAuth();
  const { colors, isDark } = useTheme();
  const themed = React.useMemo(() => createCardsThemedStyles(colors), [colors]);
  const [cards, setCards] = useState<Card[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [visibility, setVisibility] = useState<CardVisibility>('PUBLIC');
  const [qrEnabled, setQrEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cardAlert, setCardAlert] = useState<CardAlert | null>(null);

  const showAlert = useCallback((nextAlert: CardAlert) => {
    setCardAlert(nextAlert);
  }, []);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const cardsData = await get<ApiCard[]>('/api/cards', token).catch(() => []);
      const normalizedCards: Card[] = (cardsData || []).map(card => ({
        id: card.id,
        title: card.title,
        description: card.description ?? null,
        slug: card.slug,
        visibility: card.visibility ?? 'PUBLIC',
        qrEnabled: card.qrEnabled ?? true,
        viewCount: card.viewCount ?? 0,
        isDefault: card.isDefault,
        links: getApiCardLinks(card),
      }));
      setCards(normalizedCards);
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setRefreshing(false);
      if (showLoading) setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(false);
  };

  const resetModal = () => {
    setShowCreate(false);
    setEditingCard(null);
    setNewTitle('');
    setNewDescription('');
    setNewLinkUrl('');
    setVisibility('PUBLIC');
    setQrEnabled(true);
  };

  const openCreateModal = () => {
    resetModal();
    setShowCreate(true);
  };

  const openEditModal = (card: Card) => {
    setEditingCard(card);
    setNewTitle(card.title);
    setNewDescription(card.description ?? '');
    setNewLinkUrl(card.links?.[0]?.url || card.links?.[0]?.username || '');
    setVisibility(card.visibility);
    setQrEnabled(card.qrEnabled);
    setShowCreate(true);
  };

  const formatLinkUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    return trimmed.includes('://') ? trimmed : `https://${trimmed}`;
  };

  const saveCard = async () => {
    const formattedUrl = formatLinkUrl(newLinkUrl);
    if (!newTitle.trim()) {
      showAlert({ title: 'Missing title', message: 'Please enter a card title.', tone: 'error' });
      return;
    }

    if (!formattedUrl) {
      showAlert({ title: 'Missing link', message: 'Please add a link URL.', tone: 'error' });
      return;
    }

    try {
      const linkIds = editingCard ? (editingCard.links ?? []).map(link => link.id) : [];

      if (editingCard && linkIds[0]) {
        await put(`/api/profiles/me/links/${linkIds[0]}`, {
          platform: 'custom',
          username: formattedUrl,
          url: formattedUrl,
        }, token);
      } else {
        const createdLink = await post<PlatformLink>('/api/profiles/me/links', {
          platform: 'custom',
          username: formattedUrl,
          url: formattedUrl,
        }, token);
        linkIds.push(createdLink.id);
      }

      if (linkIds.length === 0) {
        showAlert({ title: 'Missing link', message: 'Please add a link URL.', tone: 'error' });
        return;
      }

      const payload = {
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        linkIds,
        visibility,
        qrEnabled,
      };

      if (editingCard) {
        await put(`/api/cards/${editingCard.id}/update`, payload, token);
      } else {
        await post('/api/cards', payload, token);
      }

      resetModal();
      fetchData();
      showAlert({ title: 'Saved', message: editingCard ? 'Card updated.' : 'Card created.', tone: 'success' });
    } catch (error) {
      showAlert({ title: 'Could not save', message: error instanceof Error ? error.message : `Failed to ${editingCard ? 'update' : 'create'} card`, tone: 'error' });
    }
  };

  const deleteCard = (id: string) => {
    showAlert({
      title: 'Delete card?',
      message: 'This card will be removed from your account.',
      tone: 'danger',
      confirmText: 'Delete',
      cancelText: 'Keep it',
      onConfirm: async () => {
        try {
          await del(`/api/cards/${id}/delete`, undefined, token);
          showAlert({ title: 'Deleted', message: 'Card deleted.', tone: 'success' });
        } catch (error) {
          showAlert({ title: 'Delete failed', message: error instanceof Error ? error.message : 'Failed to delete card', tone: 'error' });
        }
        fetchData();
      },
    });
  };

  const setDefault = async (id: string) => {
    try {
      await put(`/api/cards/${id}/default`, undefined, token);
      showAlert({ title: 'Updated', message: 'Default card updated.', tone: 'success' });
    } catch (error) {
      showAlert({ title: 'Update failed', message: error instanceof Error ? error.message : 'Failed to set default card', tone: 'error' });
    }
    fetchData();
  };

  const onCardPress = async (card: Card) => {
    const firstLink = card.links?.[0];
    const url = formatLinkUrl(firstLink?.url || firstLink?.username || '');

    if (!url) {
      showAlert({ title: 'No link', message: 'This card does not have a link to open.', tone: 'info' });
      return;
    }

    const canOpen = await Linking.canOpenURL(url).catch(() => false);
    if (!canOpen) {
      showAlert({ title: 'Unable to open', message: 'This link cannot be opened on this device.', tone: 'error' });
      return;
    }

    await Linking.openURL(url);
  };

  const getPlatformSummary = (card: Card) => {
    const names = (card.links ?? [])
      .slice(0, 4)
      .map(link => PLATFORMS[link.platform]?.name || link.platform);
    return names.join(' · ');
  };

  if (loading) {
    return (
      <SafeAreaView style={themed.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bgPrimary} />
        <View style={styles.header}>        
          <Skeleton width={180} height={34} borderRadius={12} />
          <Skeleton width={100} height={36} borderRadius={18} />
        </View>
        <View style={styles.loadingList}>
          {[1, 2].map((item) => (
            <View key={item} style={styles.loadingCard}>
              <Skeleton width="100%" height={180} borderRadius={20} />
              <View style={styles.loadingActionRow}>
                <Skeleton width={120} height={36} borderRadius={16} />
                <Skeleton width={80} height={30} borderRadius={16} />
              </View>
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={themed.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bgPrimary} />

      <View style={styles.header}>
        <Text style={themed.title}>My Cards</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openCreateModal}>
          <Text style={styles.addButtonText}>+ New card</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={cards}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        renderItem={({ item }) => (
          <View style={[styles.cardContainer, item.isDefault && styles.defaultCardContainer]}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => onCardPress(item)}
              style={[styles.cardTile, item.isDefault ? themed.cardDefault : themed.cardNormal]}>
              <View style={styles.cardTopRow}>
                {item.isDefault ? (
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>ACTIVE</Text>
                  </View>
                ) : <View />}
                <View />
              </View>

              <View style={styles.cardContentRow}>
                <View style={styles.cardDetails}>
                  <Text style={[themed.cardName, item.isDefault && styles.cardNameActive]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={themed.platformSummary} numberOfLines={1}>
                    {getPlatformSummary(item)}
                  </Text>
                  {!!item.description && (
                    <Text style={themed.cardDescription} numberOfLines={1}>{item.description}</Text>
                  )}
                  <Text style={themed.platformCount}>{(item.links ?? []).length} platforms</Text>
                  <Text style={themed.cardMeta}>{item.visibility.toLowerCase()} · {item.viewCount} views</Text>
                </View>
                {item.slug && item.qrEnabled ? (
                  <View style={styles.qrContainer}>
                    <QRCode
                      value={formatLinkUrl(item.links?.[0]?.url || item.links?.[0]?.username || `${API_BASE_URL}/cards/share/${item.slug}`)}
                      size={72}
                      color="#111827"
                      backgroundColor={COLORS.white}
                    />
                  </View>
                ) : (
                  <View style={styles.qrPlaceholder}>
                    <Text style={styles.qrPlaceholderText}>QR off</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.actionRow}>
              <TouchableOpacity onPress={() => openEditModal(item)} style={styles.defaultBtn}>
                <Text style={styles.defaultBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDefault(item.id)} disabled={item.isDefault} style={styles.defaultBtn}>
                <Text style={[styles.defaultBtnText, item.isDefault && styles.defaultBtnTextDisabled]}>{item.isDefault ? 'Default' : 'Set default'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteCard(item.id)} style={styles.deleteBtn}>
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View>
            <TouchableOpacity style={themed.createTile} onPress={openCreateModal}>
              <Text style={themed.createTileTitle}>+ Create a new context card</Text>
              <Text style={themed.createTileSub}>e.g. "Open Source" or "Job Search"</Text>
            </TouchableOpacity>
            <View style={styles.tipCard}>
              <Text style={styles.tipText}>Tip: select active card before opening Share screen</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            emoji="💳"
            title="No cards yet"
            description="Create context cards for different situations"
          />
        }
      />

      {/* Create/Edit Card Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={themed.modalContent}>
            <Text style={styles.modalTitle}>{editingCard ? 'Edit Card' : 'Create Card'}</Text>
            <TextInput
              style={themed.input}
              placeholder="Card title (e.g. Professional, Hackathon)"
              placeholderTextColor={colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <TextInput
              style={themed.input}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textMuted}
              value={newDescription}
              onChangeText={setNewDescription}
            />
            <TextInput
              style={themed.input}
              placeholder="Link URL (e.g. github.com/dev-card)"
              placeholderTextColor={colors.textMuted}
              value={newLinkUrl}
              onChangeText={setNewLinkUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Text style={styles.selectLabel}>Visibility:</Text>
            <View style={styles.visibilityRow}>
              {(['PUBLIC', 'UNLISTED', 'PRIVATE'] as CardVisibility[]).map(option => (
                <TouchableOpacity
                  key={option}
                  style={[themed.visibilityChip, visibility === option && styles.visibilityChipSelected]}
                  onPress={() => setVisibility(option)}>
                  <Text style={[themed.visibilityChipText, visibility === option && styles.visibilityChipTextSelected]}>{option.toLowerCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.qrToggle} onPress={() => setQrEnabled(value => !value)}>
              <Text style={themed.qrToggleText}>{qrEnabled ? '✓ QR sharing enabled' : 'QR sharing disabled'}</Text>
            </TouchableOpacity>
            {editingCard && editingCard.links.length > 0 ? (
              <Text style={styles.existingLinksText}>
                Update the URL above to change this card's link.
              </Text>
            ) : null}
            <TouchableOpacity style={styles.submitBtn} onPress={saveCard}>
              <Text style={styles.submitBtnText}>{editingCard ? 'Save Changes' : 'Create Card'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={resetModal}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!cardAlert} animationType="fade" transparent>
        <View style={styles.alertOverlay}>
          <View style={themed.alertCard}>
            <View style={[styles.alertIcon, styles[`alertIcon_${cardAlert?.tone || 'info'}`]]}>
              <Text style={styles.alertIconText}>
                {cardAlert?.tone === 'success' ? '✓' : cardAlert?.tone === 'danger' ? '!' : cardAlert?.tone === 'error' ? '!' : 'i'}
              </Text>
            </View>
            <Text style={themed.alertTitle}>{cardAlert?.title}</Text>
            <Text style={themed.alertMessage}>{cardAlert?.message}</Text>
            <View style={styles.alertActions}>
              {cardAlert?.onConfirm ? (
                <TouchableOpacity style={themed.alertSecondaryButton} onPress={() => setCardAlert(null)}>
                  <Text style={themed.alertSecondaryText}>{cardAlert.cancelText || 'Cancel'}</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.alertPrimaryButton, cardAlert?.tone === 'danger' && styles.alertDangerButton]}
                onPress={async () => {
                  const onConfirm = cardAlert?.onConfirm;
                  setCardAlert(null);
                  await onConfirm?.();
                }}>
                <Text style={styles.alertPrimaryText}>{cardAlert?.confirmText || 'OK'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.lg, paddingBottom: SPACING.md,
  },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.textPrimary },
  addButton: {
    backgroundColor: '#1E1E1E', borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
  },
  addButtonText: { color: COLORS.white, fontWeight: '600', fontSize: FONT_SIZE.sm },
  list: { padding: SPACING.lg, gap: SPACING.md },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: COLORS.textPrimary },
  emptySubtext: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: SPACING.xs },
  loadingList: { paddingHorizontal: SPACING.lg },
  loadingCard: {
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.bgCard,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  loadingActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.bgSecondary, borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl, padding: SPACING.lg, maxHeight: '80%',
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.textPrimary,
    marginBottom: SPACING.lg, textAlign: 'center',
  },
  input: {
    backgroundColor: COLORS.bgCard, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, color: COLORS.textPrimary, fontSize: FONT_SIZE.md,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md,
  },
  selectLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  visibilityRow: { flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.sm },
  visibilityChipSelected: { borderColor: COLORS.primary, backgroundColor: 'rgba(99, 102, 241, 0.16)' },
  visibilityChipTextSelected: { color: COLORS.primaryLight, fontWeight: '700' },
  qrToggle: { marginBottom: SPACING.md, paddingVertical: SPACING.xs },
  linkOption: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md, marginBottom: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.border,
  },
  linkSelected: { borderColor: COLORS.primary, backgroundColor: 'rgba(99, 102, 241, 0.1)' },
  linkOptionText: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, marginLeft: SPACING.sm },
  checkmark: { color: COLORS.primary, fontWeight: '700', fontSize: FONT_SIZE.md },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, alignItems: 'center', marginTop: SPACING.md,
  },
  submitBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZE.md },
  cancelBtn: { marginTop: SPACING.md, padding: SPACING.md, alignItems: 'center' },
  cancelBtnText: { color: COLORS.textMuted, fontSize: FONT_SIZE.md },
  noLinksHint: {
    padding: SPACING.lg,
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  noLinksHintText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.xs,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  noLinksHintSubtext: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
  },
  existingLinksText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  // Premium Card Styles
  cardContainer: { marginBottom: SPACING.md },
  defaultCardContainer: {},
  cardTile: {
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderWidth: 1,
  },
  cardNormal: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardDefault: {
    backgroundColor: '#1D2B3A',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  activePill: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  activePillText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  editText: {
    color: COLORS.primaryLight,
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
  },
  cardContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  cardDetails: {
    flex: 1,
  },
  qrContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.xs,
  },
  qrPlaceholder: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
  },
  qrPlaceholderText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
  },
  cardName: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  cardNameActive: {
    color: '#8BC4FF',
  },
  platformSummary: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.sm,
  },
  cardDescription: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.xs,
  },
  cardMeta: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    marginTop: SPACING.xs,
  },
  platformCount: {
    alignSelf: 'flex-start',
    color: COLORS.textMuted,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    fontSize: FONT_SIZE.xs,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  deleteBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  defaultBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  defaultBtnText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  defaultBtnTextDisabled: {
    color: COLORS.textMuted,
  },
  deleteBtnText: {
    color: 'rgba(239, 68, 68, 0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  createTile: {
    marginTop: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgSecondary,
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  createTileTitle: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.lg,
    fontWeight: '500',
  },
  createTileSub: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
  tipCard: {
    marginTop: SPACING.md,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.45)',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  tipText: {
    color: '#F4C27A',
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  alertIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  alertIcon_success: { backgroundColor: 'rgba(34, 197, 94, 0.2)' },
  alertIcon_error: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  alertIcon_danger: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  alertIcon_info: { backgroundColor: 'rgba(99, 102, 241, 0.2)' },
  alertIconText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
  },
  alertActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  alertPrimaryButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  alertDangerButton: {
    backgroundColor: '#DC2626',
  },
  alertPrimaryText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.sm,
    fontWeight: '800',
  },
});

function createCardsThemedStyles(colors: typeof COLORS) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    title: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: colors.textPrimary },
    cardNormal: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardDefault: {
      backgroundColor: colors.bgElevated,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    cardName: {
      fontSize: 34,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    platformSummary: {
      color: colors.textSecondary,
      fontSize: FONT_SIZE.md,
      marginBottom: SPACING.sm,
    },
    cardDescription: {
      color: colors.textMuted,
      fontSize: FONT_SIZE.sm,
      marginBottom: SPACING.xs,
    },
    cardMeta: {
      color: colors.textMuted,
      fontSize: FONT_SIZE.xs,
      marginTop: SPACING.xs,
    },
    platformCount: {
      alignSelf: 'flex-start',
      color: colors.textMuted,
      backgroundColor: colors.bgSecondary,
      borderRadius: 999,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 3,
      fontSize: FONT_SIZE.xs,
    },
    createTile: {
      marginTop: SPACING.sm,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      backgroundColor: colors.bgSecondary,
      paddingVertical: SPACING.xl,
      alignItems: 'center',
    },
    createTileTitle: {
      color: colors.textSecondary,
      fontSize: FONT_SIZE.lg,
      fontWeight: '500',
    },
    createTileSub: {
      color: colors.textMuted,
      fontSize: FONT_SIZE.sm,
      marginTop: SPACING.xs,
    },
    modalContent: {
      backgroundColor: colors.bgSecondary,
      borderTopLeftRadius: BORDER_RADIUS.xl,
      borderTopRightRadius: BORDER_RADIUS.xl,
      padding: SPACING.lg,
      maxHeight: '80%',
    },
    input: {
      backgroundColor: colors.bgCard,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      color: colors.textPrimary,
      fontSize: FONT_SIZE.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: SPACING.md,
    },
    linkOption: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgCard,
      borderRadius: BORDER_RADIUS.sm,
      padding: SPACING.md,
      marginBottom: SPACING.xs,
      borderWidth: 1,
      borderColor: colors.border,
    },
    linkOptionText: { flex: 1, fontSize: FONT_SIZE.sm, color: colors.textPrimary, marginLeft: SPACING.sm },
    visibilityChip: {
      flex: 1,
      alignItems: 'center',
      borderRadius: BORDER_RADIUS.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgCard,
      paddingVertical: SPACING.sm,
    },
    visibilityChipText: {
      color: colors.textSecondary,
      fontSize: FONT_SIZE.xs,
      textTransform: 'uppercase',
    },
    qrToggleText: {
      color: colors.textSecondary,
      fontSize: FONT_SIZE.sm,
    },
    alertCard: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.bgElevated,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING.lg,
      alignItems: 'center',
    },
    alertTitle: {
      color: colors.textPrimary,
      fontSize: FONT_SIZE.lg,
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: SPACING.xs,
    },
    alertMessage: {
      color: colors.textSecondary,
      fontSize: FONT_SIZE.sm,
      lineHeight: 20,
      textAlign: 'center',
    },
    alertSecondaryButton: {
      flex: 1,
      backgroundColor: colors.bgCard,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: BORDER_RADIUS.md,
      paddingVertical: SPACING.md,
      alignItems: 'center',
    },
    alertSecondaryText: {
      color: colors.textSecondary,
      fontSize: FONT_SIZE.sm,
      fontWeight: '700',
    },
  });
}
