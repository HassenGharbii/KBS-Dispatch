import React, { useState } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { exportShiftReportPdf } from '../lib/exportShiftReportPdf';
import type { ShiftReportViewProps } from './ShiftReportView';

interface Props {
  report: ShiftReportViewProps;
}

export function PdfExportButton({ report }: Props) {
  const [exporting, setExporting] = useState(false);

  async function handlePress() {
    setExporting(true);
    try {
      await exportShiftReportPdf(report);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert('Erreur', `Impossible d'exporter le PDF. Réessayez.\n${message}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Pressable style={styles.button} onPress={handlePress} disabled={exporting}>
      {exporting ? (
        <ActivityIndicator color="#1d4ed8" />
      ) : (
        <Text style={styles.text}>Exporter en PDF</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: '#1d4ed8',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  text: { color: '#1d4ed8', fontWeight: '700', fontSize: 15 },
});
