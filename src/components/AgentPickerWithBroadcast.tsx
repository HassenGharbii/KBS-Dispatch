import React from 'react';
import { View, Text, Pressable, FlatList, Switch, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AgentOption } from '../lib/missionsApi';
import { colors, spacing, radius, cardShadow } from '../theme';

// Shared between MissionCreateScreen (new mission) and MissionReassignScreen
// (dirigeant reopens a cancelled/refused mission) so the toggle-vs-picker
// behavior can't drift between the two flows.
interface Props {
  agents: AgentOption[];
  loading?: boolean;
  agentId: string | null;
  onAgentIdChange: (id: string | null) => void;
  isBroadcast: boolean;
  onIsBroadcastChange: (value: boolean) => void;
}

export function AgentPickerWithBroadcast({
  agents,
  loading,
  agentId,
  onAgentIdChange,
  isBroadcast,
  onIsBroadcastChange,
}: Props) {
  return (
    <View>
      <View style={styles.toggleRow}>
        <View style={styles.toggleLabelRow}>
          <Feather name="radio" size={15} color={colors.purple} />
          <Text style={styles.toggleLabel}>Diffuser à tous les agents</Text>
        </View>
        <Switch
          value={isBroadcast}
          onValueChange={(value) => {
            onIsBroadcastChange(value);
            if (value) onAgentIdChange(null);
          }}
          trackColor={{ false: colors.border, true: colors.purple }}
        />
      </View>

      {!isBroadcast &&
        (loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <FlatList
            data={agents}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const selected = agentId === item.id;
              return (
                <Pressable
                  style={[styles.optionRow, selected && styles.optionRowSelected]}
                  onPress={() => onAgentIdChange(item.id)}
                >
                  <View style={styles.optionIconCircle}>
                    <Feather name="user" size={14} color={colors.primary} />
                  </View>
                  <Text style={styles.optionText}>{item.fullName}</Text>
                  {selected && <Feather name="check-circle" size={17} color={colors.primary} />}
                </Pressable>
              );
            }}
            ListEmptyComponent={<Text style={styles.empty}>Aucun agent trouvé.</Text>}
          />
        ))}

      {isBroadcast && (
        <View style={styles.broadcastHintBox}>
          <Feather name="info" size={14} color={colors.purple} />
          <Text style={styles.broadcastHint}>
            Tous les agents de l&apos;organisation verront cette mission ; le premier à l&apos;accepter
            se la voit attribuer.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  toggleLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    ...cardShadow,
  },
  optionRowSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  optionIconCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, flex: 1 },
  empty: { color: colors.textMuted, fontStyle: 'italic' },
  broadcastHintBox: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.purpleLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  broadcastHint: { fontSize: 13, color: colors.purple, flex: 1 },
});
