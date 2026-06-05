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
import { PLATFORMS, getAllPlatforms } from '@devcard/shared';
import { get, post, put, del } from '../services/api';
import { EmptyState } from '../components/EmptyState';
import { LoadingPlaceholder } from '../components/LoadingPlaceholder';
import type { PlatformDef } from '@devcard/shared';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';

interface PlatformLink {
  id: string;
  platform: string;
  username: string;
  url: string;
  displayOrder: number;
}

export default function LinksScreen() {
  const { token } = useAuth();
  const [links, setLinks] = useState<PlatformLink[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformDef | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await get<any>('/api/profiles/me', token).catch(() => null);
      setLinks(data?.platformLinks || []);
    } catch (error) {
      console.error('Failed to fetch links:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const addLink = async () => {
    if (!selectedPlatform || !usernameInput.trim()) return;
    try {
      await post('/api/profiles/me/links', { platform: selectedPlatform.id, username: usernameInput.trim() }, token);
      setShowAddModal(false);
      setSelectedPlatform(null);
      setUsernameInput('');
      fetchLinks();
    } catch {
      Alert.alert('Error', 'Failed to add link');
    }
  };

  const deleteLink = async (id: string) => {
    Alert.alert('Remove Link', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
            try {
              await del(`/api/profiles/me/links/${id}`, undefined, token);
              fetchLinks();
            } catch {
              Alert.alert('Error', 'Failed to remove link');
            }
        },
      },
    ]);
  };

  const handleReorder = async (data: PlatformLink[]) => {
    setLinks(data);
    try {
      const payload = {
        links: data.map((link, index) => ({ id: link.id, displayOrder: index })),
      };
      await put('/api/profiles/me/links/reorder', payload, token);
    } catch {
      Alert.alert('Error', 'Failed to save new order');
      fetchLinks(); // Revert on failure
    }
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<PlatformLink>) => {
    const platform = PLATFORMS[item.platform];
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          disabled={isActive}
          delayLongPress={150}
          activeOpacity={0.9}
          style={[
            styles.linkItem,
            isActive && styles.linkItemActive,
          ]}
        >
          <View style={styles.dragHandle}>
            <Text style={styles.dragHandleText}>⋮⋮</Text>
          </View>
          <View style={[styles.platformDot, { backgroundColor: platform?.color || COLORS.primary }]} />
          <View style={styles.linkInfo}>
            <Text style={styles.platformName}>{platform?.name || item.platform}</Text>
            <Text style={styles.username}>{item.username}</Text>
          </View>
          <TouchableOpacity
            onPress={() => deleteLink(item.id)}
            style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />
        <LoadingPlaceholder rows={4} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />

      <View style={styles.header}>
        <Text style={styles.title}>Platform Links</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <DraggableFlatList
        data={links}
        onDragEnd={({ data }) => handleReorder(data)}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={renderItem}
        ListEmptyComponent={
          <EmptyState
            emoji="🔗"
            title="No links yet"
            description="Add your first platform link"
          />
        }
      />

      {/* Add Link Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Platform Link</Text>

            {!selectedPlatform ? (
              <FlatList
                data={getAllPlatforms().filter(p => p.id !== 'custom')}
                keyExtractor={item => item.id}
                numColumns={2}
                contentContainerStyle={styles.platformGrid}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.platformOption}
                    onPress={() => setSelectedPlatform(item)}>
                    <View style={[styles.platformColorDot, { backgroundColor: item.color }]} />
                    <Text style={styles.platformOptionText}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>{selectedPlatform.name} username</Text>
                <TextInput
                  style={styles.input}
                  placeholder={selectedPlatform.usernamePlaceholder}
                  placeholderTextColor={COLORS.textMuted}
                  value={usernameInput}
                  onChangeText={setUsernameInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.submitButton} onPress={addLink}>
                  <Text style={styles.submitButtonText}>Add Link</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowAddModal(false);
                setSelectedPlatform(null);
                setUsernameInput('');
              }}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
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
  list: { padding: SPACING.lg, gap: SPACING.sm },
  linkItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  linkItemActive: {
    backgroundColor: COLORS.bgElevated,
    borderColor: COLORS.primary,
    elevation: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  dragHandle: {
    paddingRight: SPACING.sm,
    justifyContent: 'center',
  },
  dragHandleText: {
    color: COLORS.textMuted,
    fontSize: 20,
    fontWeight: 'bold',
  },
  platformDot: { width: 12, height: 12, borderRadius: 6, marginRight: SPACING.md },
  linkInfo: { flex: 1 },
  platformName: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textPrimary },
  username: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  deleteBtn: { padding: SPACING.sm },
  deleteBtnText: { color: COLORS.error, fontSize: FONT_SIZE.md, fontWeight: '700' },
  modalOverlay: {
    flex: 1, backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.bgSecondary, borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl, padding: SPACING.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.textPrimary,
    marginBottom: SPACING.lg, textAlign: 'center',
  },
  platformGrid: { gap: SPACING.sm },
  platformOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, margin: 4, borderWidth: 1, borderColor: COLORS.border,
  },
  platformColorDot: { width: 10, height: 10, borderRadius: 5, marginRight: SPACING.sm },
  platformOptionText: { fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, fontWeight: '500' },
  inputSection: { gap: SPACING.md },
  inputLabel: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, fontWeight: '500' },
  input: {
    backgroundColor: COLORS.bgCard, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, color: COLORS.textPrimary, fontSize: FONT_SIZE.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  submitButton: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, alignItems: 'center',
  },
  submitButtonText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZE.md },
  cancelButton: { marginTop: SPACING.md, padding: SPACING.md, alignItems: 'center' },
  cancelButtonText: { color: COLORS.textMuted, fontSize: FONT_SIZE.md },
});
