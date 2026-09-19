import React from 'react';
import { View, Text, FlatList, Pressable, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { listOrgColleagues } from '../lib/swapApi';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (colleagueId: string) => void;
}

export function ColleaguePickerModal({ visible, onClose, onSelect }: Props) {
  const query = useQuery({
    queryKey: ['colleagues'],
    queryFn: listOrgColleagues,
    enabled: visible,
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Choisir un collègue</Text>
          {query.isLoading ? (
            <ActivityIndicator style={{ marginVertical: 16 }} />
          ) : (
            <FlatList
              data={query.data ?? []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable style={styles.row} onPress={() => onSelect(item.id)}>
                  <Text style={styles.rowText}>{item.fullName}</Text>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.empty}>Aucun collègue disponible.</Text>}
            />
          )}
          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  rowText: { fontSize: 15 },
  empty: { color: '#6b7280', fontStyle: 'italic', paddingVertical: 12 },
  cancelButton: { marginTop: 16, alignItems: 'center', paddingVertical: 10 },
  cancelButtonText: { color: '#dc2626', fontWeight: '600' },
});
