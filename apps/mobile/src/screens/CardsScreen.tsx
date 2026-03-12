import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme/tokens';
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
  const { token } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [allLinks, setAllLinks] = useState<PlatformLink[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedLinkIds, setSelectedLinkIds] = useState<string[]>([]);

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
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
        renderItem={({ item }) => (
          <View style={[styles.cardItem, item.isDefault && styles.defaultCard]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {item.isDefault && (
                  <Text style={styles.defaultBadge}>✦ Default</Text>
                )}
              </View>
              <View style={styles.cardActions}>
                {!item.isDefault && (
                  <TouchableOpacity onPress={() => setDefault(item.id)}>
                    <Text style={styles.setDefaultText}>Set Default</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => deleteCard(item.id)}>
                  <Text style={styles.deleteText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.cardLinks}>
              {item.links.map(link => (
                <View key={link.id} style={styles.cardLinkBadge}>
                  <View style={[styles.dot, { backgroundColor: PLATFORMS[link.platform]?.color || COLORS.primary }]} />
                  <Text style={styles.cardLinkText}>{PLATFORMS[link.platform]?.name || link.platform}</Text>
                </View>
              ))}
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
            {allLinks.map(link => (
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
            ))}
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
  cardItem: {
    backgroundColor: COLORS.bgCard, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
  },
  defaultCard: { borderColor: COLORS.primary },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md },
  cardTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.textPrimary },
  defaultBadge: { fontSize: FONT_SIZE.xs, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: SPACING.md, alignItems: 'center' },
  setDefaultText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  deleteText: { color: COLORS.error, fontSize: FONT_SIZE.md, fontWeight: '700' },
  cardLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  cardLinkBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgElevated, borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, gap: 4,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cardLinkText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
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
});
