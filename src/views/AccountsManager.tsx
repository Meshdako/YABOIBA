import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { router, useFocusEffect } from 'expo-router';

import {
  getAllAccounts,
  createAccount,
  getActiveAccountId,
  setActiveAccountId,
  type Account,
} from '@/src/db';

export default function AccountsManagerScreen() {
  const db = useSQLiteContext();
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [activeId, setActiveId] = React.useState<number | null>(null);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');

  const load = React.useCallback(async () => {
    const list = await getAllAccounts(db);
    const active = await getActiveAccountId(db);
    setAccounts(list);
    setActiveId(active);
  }, [db]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const handleSelect = async (id: number) => {
    await setActiveAccountId(db, id);
    setActiveId(id);
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    const id = await createAccount(db, trimmed, description.trim() || null);
    await setActiveAccountId(db, id);
    setName('');
    setDescription('');
    setModalVisible(false);
    await load();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Cuentas</Text>
        {accounts.length === 0 ? (
          <Text style={styles.emptyText}>Sin cuentas</Text>
        ) : (
          accounts.map((acc) => {
            const isActive = acc.id === activeId;
            return (
              <Pressable
                key={acc.id}
                style={[styles.accountCard, isActive && styles.accountCardActive]}
                onPress={() => handleSelect(acc.id)}
              >
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{acc.name}</Text>
                  {acc.description ? (
                    <Text style={styles.accountDescription}>{acc.description}</Text>
                  ) : null}
                </View>
                {isActive ? (
                  <Text style={styles.activeBadge}>Activa</Text>
                ) : null}
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.addButtonText}>+ Nueva cuenta</Text>
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nueva cuenta</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Nombre de la cuenta"
              placeholderTextColor="#666"
              autoFocus
            />
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Descripción (opcional)"
              placeholderTextColor="#666"
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={handleCreate}>
                <Text style={styles.confirmText}>Crear</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  accountCard: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b3b3b',
    backgroundColor: '#151515',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountCardActive: {
    borderColor: '#2e5c43',
  },
  accountInfo: {
    flex: 1,
    marginRight: 12,
  },
  accountName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  accountDescription: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  activeBadge: {
    color: '#7ee2a8',
    fontSize: 13,
    fontWeight: '700',
  },
  addButton: {
    marginHorizontal: 20,
    marginBottom: 24,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2e5c43',
    backgroundColor: '#1d3a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#7ee2a8',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#151515',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3b3b3b',
    padding: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  input: {
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#3b3b3b',
    backgroundColor: '#111',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
  },
  cancelText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#1d3a2a',
    borderWidth: 1,
    borderColor: '#2e5c43',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  confirmText: {
    color: '#7ee2a8',
    fontSize: 15,
    fontWeight: '700',
  },
});
