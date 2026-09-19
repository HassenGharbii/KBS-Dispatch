import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { REFERENCE_LIST, type ReferenceCategory } from '../constants/referenceList';
import { colors, spacing, radius, cardShadow } from '../theme';

interface Props {
  selectedCategoryCode: string | null;
  onSelect: (category: ReferenceCategory) => void;
}

export function CategoryGrid({ selectedCategoryCode, onSelect }: Props) {
  return (
    <View style={styles.grid}>
      {REFERENCE_LIST.map((category) => {
        const selected = category.code === selectedCategoryCode;
        return (
          <Pressable
            key={category.code}
            style={[styles.tile, selected && styles.tileSelected]}
            onPress={() => onSelect(category)}
          >
            <View style={styles.tileHeader}>
              <View style={[styles.tileIndex, selected && styles.tileIndexSelected]}>
                <Text style={[styles.tileIndexText, selected && styles.tileIndexTextSelected]}>
                  {category.order}
                </Text>
              </View>
              {selected && <Feather name="check-circle" size={16} color={colors.primary} />}
            </View>
            <Text style={[styles.tileLabel, selected && styles.tileLabelSelected]}>
              {category.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '48%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 80,
    justifyContent: 'center',
    ...cardShadow,
  },
  tileSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  tileHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tileIndex: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIndexSelected: { backgroundColor: colors.primary },
  tileIndexText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  tileIndexTextSelected: { color: colors.textOnPrimary },
  tileLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginTop: spacing.sm },
  tileLabelSelected: { color: colors.primary },
});
