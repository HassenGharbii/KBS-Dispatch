import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { ShiftReportView, type ShiftReportEventVM } from '../../../components/ShiftReportView';
import { PhotoFullScreenViewer } from '../../../components/PhotoFullScreenViewer';
import { PdfExportButton } from '../../../components/PdfExportButton';
import { useAuthStore } from '../../../store/useAuthStore';
import { getShiftById } from '../../../db/repositories/shiftsRepo';
import { getSiteById } from '../../../db/repositories/sitesRepo';
import { listEventsForShift } from '../../../db/repositories/eventsRepo';
import { listPhotosForEvent } from '../../../db/repositories/photosRepo';

// Used from both ServiceStack and HistoryStack, which have different
// ParamLists — this ad-hoc param type decouples the screen from either.
type ShiftSummaryParams = { ShiftSummary: { shiftId: string } };

export default function ShiftSummaryScreen() {
  const route = useRoute<RouteProp<ShiftSummaryParams, 'ShiftSummary'>>();
  const { shiftId } = route.params;
  const profile = useAuthStore((s) => s.profile);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const shiftQuery = useQuery({ queryKey: ['shift', shiftId], queryFn: () => getShiftById(shiftId) });
  const shift = shiftQuery.data;

  const siteQuery = useQuery({
    queryKey: ['site', shift?.siteId],
    queryFn: () => getSiteById(shift!.siteId),
    enabled: Boolean(shift),
  });

  const eventsQuery = useQuery({
    queryKey: ['events', shiftId],
    queryFn: () => listEventsForShift(shiftId),
  });
  const events = eventsQuery.data ?? [];

  const reportEventsQuery = useQuery({
    queryKey: ['shiftReportEvents', shiftId, events.length],
    queryFn: async (): Promise<ShiftReportEventVM[]> =>
      Promise.all(
        events.map(async (event) => {
          const photos = await listPhotosForEvent(event.id);
          return {
            id: event.id,
            categoryCode: event.categoryCode,
            itemCodes: event.itemCodes,
            comment: event.comment,
            occurredAt: event.occurredAt,
            photoUris: photos.map((p) => p.localUri).filter((uri): uri is string => Boolean(uri)),
          };
        })
      ),
    enabled: Boolean(shift),
  });

  if (!shift || siteQuery.isLoading || reportEventsQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const reportProps = {
    agentName: profile?.fullName ?? '',
    siteName: siteQuery.data?.name ?? '',
    startAt: shift.startAt,
    endAt: shift.endAt,
    events: reportEventsQuery.data ?? [],
  };

  return (
    <>
      <ShiftReportView {...reportProps} onPhotoPress={setViewerUri} />
      <PdfExportButton report={reportProps} />
      <PhotoFullScreenViewer uri={viewerUri} onClose={() => setViewerUri(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
