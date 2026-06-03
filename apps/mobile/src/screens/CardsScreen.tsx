import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { PLATFORMS } from '@devcard/shared';
import { API_BASE_URL } from '../config';

interface PlatformLink {
  id: string;
  platform: string;
  username: string;
}

interface Card {
  id: string;
  title: string;
  isDefault: boolean;
  links: PlatformLink[];
}

export default function CardsScreen() {
  const { token, user } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [allLinks, setAllLinks] = useState<PlatformLink[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedLinkIds, setSelectedLinkIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [cardsRes, profileRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/cards`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/profiles/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (cardsRes.ok) setCards(await cardsRes.json());
      if (profileRes.ok) {
        const data = await profileRes.json();
        setAllLinks(data.platformLinks || []);
      }
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const createCard = async () => {
    if (!newTitle.trim() || selectedLinkIds.length === 0) {
      Alert.alert('Error', 'Please enter a title and select at least one link');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: newTitle.trim(), linkIds: selectedLinkIds }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewTitle('');
        setSelectedLinkIds([]);
        fetchData();
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to create card');
    }
  };

  const deleteCard = (id: string) => {
    Alert.alert('Delete Card', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await fetch(`${API_BASE_URL}/api/cards/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          fetchData();
        },
      },
    ]);
  };

  const setDefault = async (id: string) => {
    await fetch(`${API_BASE_URL}/api/cards/${id}/default`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData();
  };

  const toggleLink = (linkId: string) => {
    setSelectedLinkIds(prev =>
      prev.includes(linkId)
        ? prev.filter(id => id !== linkId)
        : [...prev, linkId]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />

      <View style={styles.header}>
        <Text style={styles.title}>Context Cards</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreate(true)}>
          <Text style={styles.addButtonText}>+ New Card</Text>
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
            <View style={[styles.premiumCard, item.isDefault ? styles.cardDefault : styles.cardNormal]}>
              {/* Card Header: Logo & Chip */}
              <View style={styles.cardHeader}>
                <View style={styles.cardBrand}>
                  <View style={styles.chip} />
                  <Text style={styles.brandText}>DevCard</Text>
                </View>
                <Text style={styles.contactless}>📶</Text>
              </View>

              {/* Card Center: Title */}
              <View style={styles.cardCenter}>
                <Text style={styles.premiumCardTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.cardType}>CONTMEMORY ACCESS</Text>
              </View>

              {/* Card Footer: User & Platforms */}
              <View style={styles.cardFooter}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user?.displayName || 'Card Holder'}</Text>
                  <Text style={styles.cardId}>{Math.random().toString(36).substring(2, 6).toUpperCase()} {Math.random().toString(36).substring(2, 6).toUpperCase()}</Text>
                </View>
                <View style={styles.platformIcons}>
                  {item.links.slice(0, 3).map(link => (
                    <View key={link.id} style={[styles.platformDot, { backgroundColor: PLATFORMS[link.platform]?.color || COLORS.primary }]} />
                  ))}
                  {item.links.length > 3 && (
                    <Text style={styles.morePlatforms}>+{item.links.length - 3}</Text>
                  )}
                </View>
              </View>

              {/* Glass Overlay for Default */}
              {item.isDefault && <View style={styles.glassOverlay} />}
            </View>

            {/* Card Actions Below the Card */}
            <View style={styles.actionRow}>
              {!item.isDefault ? (
                <TouchableOpacity onPress={() => setDefault(item.id)} style={styles.actionBtn}>
                  <Text style={styles.actionBtnText}>Set as Primary</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVE CARD</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => deleteCard(item.id)} style={styles.deleteBtn}>
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💳</Text>
            <Text style={styles.emptyText}>No cards yet</Text>
            <Text style={styles.emptySubtext}>Create context cards for different situations</Text>
          </View>
        }
      />

      {/* Create Card Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Card</Text>
            <TextInput
              style={styles.input}
              placeholder="Card title (e.g. Professional, Hackathon)"
              placeholderTextColor={COLORS.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <Text style={styles.selectLabel}>Select platforms to include:</Text>
            {allLinks.length === 0 ? (
              <View style={styles.noLinksHint}>
                <Text style={styles.noLinksHintText}>You haven't added any links yet.</Text>
                <Text style={styles.noLinksHintSubtext}>Go to the "Links" tab to add your GitHub, LinkedIn, etc. before creating a card.</Text>
              </View>
            ) : (
              allLinks.map(link => (
                <TouchableOpacity
                  key={link.id}
                  style={[styles.linkOption, selectedLinkIds.includes(link.id) && styles.linkSelected]}
                  onPress={() => toggleLink(link.id)}>
                  <View style={[styles.dot, { backgroundColor: PLATFORMS[link.platform]?.color || COLORS.primary }]} />
                  <Text style={styles.linkOptionText}>
                    {PLATFORMS[link.platform]?.name || link.platform} — {link.username}
                  </Text>
                  {selectedLinkIds.includes(link.id) && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity style={styles.submitBtn} onPress={createCard}>
              <Text style={styles.submitBtnText}>Create Card</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => { setShowCreate(false); setNewTitle(''); setSelectedLinkIds([]); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
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
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
  },
  addButtonText: { color: COLORS.white, fontWeight: '600', fontSize: FONT_SIZE.sm },
  list: { padding: SPACING.lg, gap: SPACING.md },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: COLORS.textPrimary },
  emptySubtext: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: SPACING.xs },
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
  // Premium Card Styles
  cardContainer: {
    marginBottom: SPACING.xl,
  },
  defaultCardContainer: {},
  premiumCard: {
    width: '100%',
    aspectRatio: 1.58,
    borderRadius: 20,
    padding: SPACING.lg,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
    ...SHADOWS.card,
  },
  cardNormal: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardDefault: {
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chip: {
    width: 35,
    height: 25,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
    opacity: 0.8,
  },
  brandText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  contactless: {
    fontSize: 20,
    opacity: 0.5,
  },
  cardCenter: {
    marginTop: SPACING.md,
  },
  premiumCardTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  cardType: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardId: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  platformIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  platformDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  morePlatforms: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  actionBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activeBadgeText: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  deleteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  deleteBtnText: {
    color: 'rgba(239, 68, 68, 0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
});
