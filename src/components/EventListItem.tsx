import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { LogbookEvent } from '../types/domain';
import { REFERENCE_LIST } from '../constants/referenceList';
import { colors, spacing, radius, cardShadow } from '../theme';

interface Props {
  event: LogbookEvent;
  photoCount: number;
  onPress?: () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function EventListItem({ event, photoCount, onPress }: Props) {
  const category = REFERENCE_LIST.find((c) => c.code === event.categoryCode);
  const itemLabels = event.itemCodes
    .map((code) => category?.items.find((i) => i.code === code)?.label ?? code)
    .join(', ');

  return (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress}>
      <View style={styles.timeBadge}>
        <Text style={styles.time}>{formatTime(event.occurredAt)}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.category}>{category?.label ?? event.categoryCode}</Text>
        <Text style={styles.items}>{itemLabels}</Text>
        {event.comment ? <Text style={styles.comment}>{event.comment}</Text> : null}
        {(photoCount > 0 || event.syncStatus !== 'synced') && (
          <View style={styles.metaRow}>
            {photoCount > 0 && (
              <View style={styles.metaChip}>
                <Feather name="camera" size={11} color={colors.primary} />
                <Text style={styles.photoCount}>{photoCount}</Text>
              </View>
            )}
            {event.syncStatus !== 'synced' && (
              <View style={styles.metaChip}>
                <Feather name="clock" size={11} color={colors.warning} />
                <Text style={styles.pending}>Non synchronisé</Text>
              </View>
            )}
          </View>
        )}
      </View>
      {onPress && <Feather name="chevron-right" size={18} color={colors.textMuted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...cardShadow,
  },
  timeBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  time: { fontSize: 12, fontWeight: '700', color: colors.primary },
  content: { flex: 1 },
  category: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  items: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  comment: { fontSize: 13, color: colors.textSecondary, marginTop: 2, fontStyle: 'italic' },
  metaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  photoCount: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  pending: { fontSize: 11, color: colors.warning, fontWeight: '600' },
});
