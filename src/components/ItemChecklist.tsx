import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { ReferenceItem } from '../constants/referenceList';

interface Props {
  items: ReferenceItem[];
  selectedItemCodes: string[];
  onToggle: (itemCode: string) => void;
}

export function ItemChecklist({ items, selectedItemCodes, onToggle }: Props) {
  return (
    <View style={styles.list}>
      {items.map((item) => {
        const checked = selectedItemCodes.includes(item.code);
        return (
          <Pressable key={item.code} style={styles.row} onPress={() => onToggle(item.code)}>
            <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
              {checked && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.label}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#9ca3af',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  label: { fontSize: 15, flex: 1, color: '#111827' },
});
