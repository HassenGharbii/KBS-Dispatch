import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { REFERENCE_LIST, type CategoryCode } from '../constants/referenceList';
import { PhotoThumbnail } from './PhotoThumbnail';
import { formatDateTime, formatDuration } from '../lib/shiftReportFormatting';
import { colors, spacing, radius, cardShadow } from '../theme';

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

function InfoRow({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Feather name={icon} size={14} color={colors.textSecondary} style={styles.infoIcon} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.titleRow}>
        <Feather name="file-text" size={18} color={colors.textPrimary} />
        <Text style={styles.title}>Compte rendu de service</Text>
      </View>
      <View style={styles.headerBlock}>
        <InfoRow icon="user" label="Agent" value={agentName} />
        <InfoRow icon="map-pin" label="Site" value={siteName} />
        <InfoRow icon="log-in" label="Début" value={formatDateTime(startAt)} />
        <InfoRow icon="log-out" label="Fin" value={endAt ? formatDateTime(endAt) : 'en cours'} />
        <InfoRow icon="clock" label="Durée" value={formatDuration(startAt, endAt)} />
      </View>

      <View style={styles.sectionTitleRow}>
        <Feather name="clipboard" size={15} color={colors.primary} />
        <Text style={styles.sectionTitle}>Événements ({events.length})</Text>
      </View>
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
  screen: { backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  headerBlock: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    ...cardShadow,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoIcon: { width: 16 },
  infoLabel: { fontSize: 13, color: colors.textSecondary, width: 50 },
  infoValue: { fontSize: 14, color: colors.textPrimary, fontWeight: '600', flex: 1 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  empty: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic' },
  eventBlock: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: colors.surface,
    borderTopRightRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
    paddingLeft: spacing.md,
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
    gap: 2,
    ...cardShadow,
  },
  eventTime: { fontSize: 12, color: colors.textSecondary },
  eventCategory: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  eventItems: { fontSize: 13, color: colors.textSecondary },
  eventComment: { fontSize: 13, color: colors.textSecondary, fontStyle: 'italic' },
  photoRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
});
