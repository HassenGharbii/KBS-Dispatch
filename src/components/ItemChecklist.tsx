import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ReferenceItem } from '../constants/referenceList';
import { colors, spacing, radius } from '../theme';

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
          <Pressable
            key={item.code}
            style={[styles.row, checked && styles.rowChecked]}
            onPress={() => onToggle(item.code)}
          >
            <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
              {checked && <Feather name="check" size={14} color={colors.textOnPrimary} />}
            </View>
            <Text style={styles.label}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  rowChecked: { backgroundColor: colors.primaryLight },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.textMuted,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { fontSize: 15, flex: 1, color: colors.textPrimary },
});
