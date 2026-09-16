import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { LogbookEvent } from '../types/domain';
import { REFERENCE_LIST } from '../constants/referenceList';

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
      <Text style={styles.time}>{formatTime(event.occurredAt)}</Text>
      <View style={styles.content}>
        <Text style={styles.category}>{category?.label ?? event.categoryCode}</Text>
        <Text style={styles.items}>{itemLabels}</Text>
        {event.comment ? <Text style={styles.comment}>{event.comment}</Text> : null}
        {photoCount > 0 && <Text style={styles.photoCount}>{photoCount} photo(s)</Text>}
        {event.syncStatus !== 'synced' && <Text style={styles.pending}>Non synchronisé</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  time: { fontSize: 13, color: '#6b7280', width: 48 },
  content: { flex: 1 },
  category: { fontSize: 14, fontWeight: '600', color: '#111827' },
  items: { fontSize: 13, color: '#374151', marginTop: 2 },
  comment: { fontSize: 13, color: '#4b5563', marginTop: 2, fontStyle: 'italic' },
  photoCount: { fontSize: 12, color: '#1d4ed8', marginTop: 2 },
  pending: { fontSize: 11, color: '#b45309', marginTop: 2 },
});
