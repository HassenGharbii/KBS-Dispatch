import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DirigeantStackParamList } from '../../../navigation/DirigeantStack';
import { ShiftReportView, type ShiftReportEventVM } from '../../../components/ShiftReportView';
import { PhotoFullScreenViewer } from '../../../components/PhotoFullScreenViewer';
import { PdfExportButton } from '../../../components/PdfExportButton';
import { supabase } from '../../../lib/supabase';
import type { CategoryCode } from '../../../constants/referenceList';

type Props = NativeStackScreenProps<DirigeantStackParamList, 'ReportDetail'>;

interface ShiftReportRow {
  agent_name: string;
  site_name: string;
  start_at: string;
  end_at: string | null;
}

interface EventRow {
  id: string;
  category_code: string;
  item_codes: string[];
  comment: string | null;
  occurred_at: string;
}

interface PhotoRow {
  id: string;
  event_id: string;
  storage_path: string;
}

interface ShiftDetailData {
  agentName: string;
  siteName: string;
  startAt: string;
  endAt: string | null;
  events: ShiftReportEventVM[];
}

async function fetchShiftDetail(shiftId: string): Promise<ShiftDetailData | null> {
  const { data: shift, error: shiftError } = await supabase
    .from('shift_reports')
    .select('*')
    .eq('shift_id', shiftId)
    .single<ShiftReportRow>();
  if (shiftError || !shift) return null;

  const { data: eventRows } = await supabase
    .from('events')
    .select('*')
    .eq('shift_id', shiftId)
    .order('occurred_at', { ascending: true })
    .returns<EventRow[]>();

  const events = eventRows ?? [];
  const eventIds = events.map((e) => e.id);

  const photosByEvent: Record<string, string[]> = {};
  if (eventIds.length > 0) {
    const { data: photoRows } = await supabase
      .from('photos')
      .select('*')
      .in('event_id', eventIds)
      .returns<PhotoRow[]>();

    for (const photo of photoRows ?? []) {
      const { data: signed } = await supabase.storage
        .from('shift-photos')
        .createSignedUrl(photo.storage_path, 3600);
      if (signed?.signedUrl) {
        photosByEvent[photo.event_id] = [...(photosByEvent[photo.event_id] ?? []), signed.signedUrl];
      }
    }
  }

  return {
    agentName: shift.agent_name,
    siteName: shift.site_name,
    startAt: shift.start_at,
    endAt: shift.end_at,
    events: events.map((e) => ({
      id: e.id,
      categoryCode: e.category_code as CategoryCode,
      itemCodes: e.item_codes,
      comment: e.comment,
      occurredAt: e.occurred_at,
      photoUris: photosByEvent[e.id] ?? [],
    })),
  };
}

export default function ReportDetailScreen({ route }: Props) {
  const { shiftId } = route.params;
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ['shiftReportDetail', shiftId],
    queryFn: () => fetchShiftDetail(shiftId),
  });

  if (detailQuery.isLoading || !detailQuery.data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const reportProps = {
    agentName: detailQuery.data.agentName,
    siteName: detailQuery.data.siteName,
    startAt: detailQuery.data.startAt,
    endAt: detailQuery.data.endAt,
    events: detailQuery.data.events,
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
