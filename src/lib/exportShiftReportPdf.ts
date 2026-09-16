import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { buildShiftReportHtml } from './shiftReportHtml';
import type { ShiftReportViewProps } from '../components/ShiftReportView';

export async function exportShiftReportPdf(props: ShiftReportViewProps): Promise<void> {
  const html = buildShiftReportHtml(props);
  const { uri } = await Print.printToFileAsync({ html });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Le partage n'est pas disponible sur cet appareil.");
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Compte rendu de service',
  });
}
