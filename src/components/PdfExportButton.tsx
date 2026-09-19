import React, { useState } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { exportShiftReportPdf } from '../lib/exportShiftReportPdf';
import type { ShiftReportViewProps } from './ShiftReportView';
import { colors, spacing, radius } from '../theme';

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
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          <Feather name="download" size={16} color={colors.primary} />
          <Text style={styles.text}>Exporter en PDF</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
  },
  text: { color: colors.primary, fontWeight: '700', fontSize: 15 },
});
