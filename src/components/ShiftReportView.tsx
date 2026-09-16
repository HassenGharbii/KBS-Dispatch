import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { REFERENCE_LIST, type CategoryCode } from '../constants/referenceList';
import { PhotoThumbnail } from './PhotoThumbnail';
import { formatDateTime, formatDuration } from '../lib/shiftReportFormatting';

// Display-only view model — deliberately decoupled from the full domain
// types (LogbookEvent/Photo) since the agent (local SQLite) and dirigeant
// (Supabase query, signed photo URLs) screens build this from very
// different data sources but render identically.
export interface ShiftReportEventVM {
  id: string;
  categoryCode: CategoryCode;
  itemCodes: string[];
  comment: string | null;
  occurredAt: string;
  photoUris: string[];
}

export interface ShiftReportViewProps {
  agentName: string;
  siteName: string;
  startAt: string;
  endAt: string | null;
  events: ShiftReportEventVM[];
  onPhotoPress?: (uri: string) => void;
}

export function ShiftReportView({
  agentName,
  siteName,
  startAt,
  endAt,
  events,
  onPhotoPress,
}: ShiftReportViewProps) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Compte rendu de service</Text>
      <View style={styles.headerBlock}>
        <Text style={styles.headerLine}>Agent : {agentName}</Text>
        <Text style={styles.headerLine}>Site : {siteName}</Text>
        <Text style={styles.headerLine}>Début : {formatDateTime(startAt)}</Text>
        <Text style={styles.headerLine}>Fin : {endAt ? formatDateTime(endAt) : 'en cours'}</Text>
        <Text style={styles.headerLine}>Durée : {formatDuration(startAt, endAt)}</Text>
      </View>

      <Text style={styles.sectionTitle}>Événements ({events.length})</Text>
      {events.length === 0 && <Text style={styles.empty}>Aucun événement enregistré.</Text>}
      {events.map((event) => {
        const category = REFERENCE_LIST.find((c) => c.code === event.categoryCode);
        const itemLabels = event.itemCodes
          .map((code) => category?.items.find((i) => i.code === code)?.label ?? code)
          .join(', ');
        return (
          <View key={event.id} style={styles.eventBlock}>
            <Text style={styles.eventTime}>{formatDateTime(event.occurredAt)}</Text>
            <Text style={styles.eventCategory}>{category?.label ?? event.categoryCode}</Text>
            <Text style={styles.eventItems}>{itemLabels}</Text>
            {event.comment ? <Text style={styles.eventComment}>{event.comment}</Text> : null}
            {event.photoUris.length > 0 && (
              <View style={styles.photoRow}>
                {event.photoUris.map((uri) => (
                  <PhotoThumbnail
                    key={uri}
                    uri={uri}
                    onPress={onPhotoPress ? () => onPhotoPress(uri) : undefined}
                  />
                ))}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  headerBlock: { backgroundColor: '#f3f4f6', borderRadius: 10, padding: 12, gap: 4 },
  headerLine: { fontSize: 14, color: '#111827' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 8 },
  empty: { fontSize: 14, color: '#6b7280', fontStyle: 'italic' },
  eventBlock: {
    borderLeftWidth: 3,
    borderLeftColor: '#1d4ed8',
    paddingLeft: 10,
    gap: 2,
    marginBottom: 8,
  },
  eventTime: { fontSize: 12, color: '#6b7280' },
  eventCategory: { fontSize: 14, fontWeight: '600', color: '#111827' },
  eventItems: { fontSize: 13, color: '#374151' },
  eventComment: { fontSize: 13, color: '#4b5563', fontStyle: 'italic' },
  photoRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
});
