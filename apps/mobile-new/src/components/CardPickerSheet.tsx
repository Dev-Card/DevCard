import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { Card } from '@devcard/shared';
import { PLATFORMS } from '@devcard/shared';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme/tokens';
import { EmptyState } from './EmptyState';

type Props = {
  cards: Card[];
  selectedCardId?: string | null;
  onSelect: (cardId: string) => void;
  onClose?: () => void;
};

const CardPickerSheet = React.forwardRef<BottomSheetModal, Props>(
  ({ cards, selectedCardId, onSelect, onClose }, ref) => {
    const snapPoints = useMemo(() => ['45%', '80%'], []);

    const renderBackdrop = (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
      />
    );

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        onDismiss={onClose}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <Text style={styles.title}>Select a card</Text>

          {cards.length === 1 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Create another card in Cards tab</Text>
            </View>
          )}

          {cards.length === 0 ? (
            <View style={styles.noCards}>
              <EmptyState
                title="No cards yet"
                description="Create a card before switching the QR target."
              />
            </View>
          ) : (
            cards.map(card => {
              const isSelected = card.id === selectedCardId;
              const links = card.links || [];

              return (
                <View key={card.id} style={styles.cardRow}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {card.title}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {links.length} {links.length === 1 ? 'link' : 'links'}
                    </Text>
                    <View style={styles.platformRow}>
                      {links.slice(0, 4).map(link => (
                        <View
                          key={link.id}
                          style={[
                            styles.platformDot,
                            {
                              backgroundColor:
                                PLATFORMS[link.platform]?.color || COLORS.primary,
                            },
                          ]}
                        />
                      ))}
                      {links.length > 4 && (
                        <Text style={styles.morePlatforms}>+{links.length - 4}</Text>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.selectButton,
                      isSelected && styles.selectButtonSelected,
                    ]}
                    onPress={() => onSelect(card.id)}
                    disabled={isSelected}
                  >
                    <Text
                      style={[
                        styles.selectButtonText,
                        isSelected && styles.selectButtonTextSelected,
                      ]}
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);

CardPickerSheet.displayName = 'CardPickerSheet';

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: COLORS.bgSecondary,
  },
  handleIndicator: {
    backgroundColor: COLORS.borderLight,
  },
  sheetContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  emptyState: {
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  noCards: {
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  cardInfo: {
    flex: 1,
    gap: 6,
  },
  cardTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardMeta: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
  platformRow: {
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
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  selectButton: {
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
  },
  selectButtonSelected: {
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectButtonText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.white,
    fontWeight: '700',
  },
  selectButtonTextSelected: {
    color: COLORS.textSecondary,
  },
});

export default CardPickerSheet;
