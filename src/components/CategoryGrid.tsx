import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { REFERENCE_LIST, type ReferenceCategory } from '../constants/referenceList';

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
            <Text style={styles.tileIndex}>{category.order}</Text>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    minHeight: 76,
    justifyContent: 'center',
  },
  tileSelected: { borderColor: '#1d4ed8', backgroundColor: '#eff6ff' },
  tileIndex: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  tileLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  tileLabelSelected: { color: '#1d4ed8' },
});
