import React from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import {
  getAllPeople,
  createPerson,
  updatePerson,
  deletePerson,
  type Person,
} from '@/src/db';
import { DECIMAL_SEPARATOR, THOUSAND_SEPARATOR } from '@/src/config';

const formatMoney = (value: number) => {
  const rounded = Math.round(value * 100) / 100;
  const [intPart, decPart] = rounded.toFixed(2).split('.');
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSAND_SEPARATOR);
  return decPart === '00' ? withThousands : `${withThousands}${DECIMAL_SEPARATOR}${decPart}`;
};

export type SplitDraft = {
  personId: number;
  amount: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (splits: SplitDraft[]) => void;
  initialSplits?: SplitDraft[];
  totalAmount?: number;
};

export default function SplitModal({
  visible,
  onClose,
  onSave,
  initialSplits = [],
  totalAmount,
}: Props) {
  const db = useSQLiteContext();
  const [people, setPeople] = React.useState<Person[]>([]);
  const [rows, setRows] = React.useState<{ personId: number; amount: string }[]>([]);
  const [peopleManagerVisible, setPeopleManagerVisible] = React.useState(false);

  const loadPeople = React.useCallback(async () => {
    const list = await getAllPeople(db);
    setPeople(list);
  }, [db]);

  React.useEffect(() => {
    if (visible) {
      loadPeople();
      setRows(
        initialSplits.map((s) => ({ personId: s.personId, amount: String(s.amount) }))
      );
    }
  }, [visible, initialSplits, loadPeople]);

  const sum = rows.reduce((acc, r) => {
    const v = parseFloat(r.amount.replace(DECIMAL_SEPARATOR, '.'));
    return acc + (Number.isNaN(v) ? 0 : v);
  }, 0);

  const remaining = totalAmount !== undefined ? totalAmount - sum : 0;

  const setRowAmount = (personId: number, amount: string) => {
    setRows((prev) => prev.map((r) => (r.personId === personId ? { ...r, amount } : r)));
  };

  const addPersonRow = (personId: number) => {
    setRows((prev) => {
      if (prev.some((r) => r.personId === personId)) {
        return prev;
      }
      return [...prev, { personId, amount: '' }];
    });
  };

  const removeRow = (personId: number) => {
    setRows((prev) => prev.filter((r) => r.personId !== personId));
  };

  const handleSave = () => {
    const splits: SplitDraft[] = [];
    for (const r of rows) {
      const v = parseFloat(r.amount.replace(DECIMAL_SEPARATOR, '.'));
      if (Number.isNaN(v) || v <= 0) {
        Alert.alert('Error', 'Ingresa un monto válido mayor a cero para cada persona.');
        return;
      }
      splits.push({ personId: r.personId, amount: v });
    }
    onSave(splits);
  };

  const handleCreatePerson = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    const id = await createPerson(db, trimmed);
    await loadPeople();
    addPersonRow(id);
  };

  const handleRenamePerson = async (id: number, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    await updatePerson(db, id, trimmed);
    await loadPeople();
  };

  const handleDeletePerson = (id: number) => {
    Alert.alert(
      'Eliminar persona',
      '¿Estás seguro de que quieres eliminar esta persona?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deletePerson(db, id);
            setRows((prev) => prev.filter((r) => r.personId !== id));
            await loadPeople();
          },
        },
      ]
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>Dividir pago</Text>
              <Pressable onPress={() => setPeopleManagerVisible(true)}>
                <FontAwesome name="users" size={20} color="#7ee2a8" />
              </Pressable>
            </View>

          {totalAmount !== undefined ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${formatMoney(totalAmount)}</Text>
              <Text
                style={[
                  styles.remainingValue,
                  Math.abs(remaining) < 0.005 ? styles.remainingOk : styles.remainingBad,
                ]}
              >
                {Math.abs(remaining) < 0.005
                  ? '✓'
                  : `${remaining > 0 ? 'Faltan' : 'Sobran'} ${formatMoney(Math.abs(remaining))}`}
              </Text>
            </View>
          ) : null}

          <ScrollView style={styles.list}>
            {rows.length === 0 ? (
              <Text style={styles.emptyText}>
                Agrega personas para dividir el pago.
              </Text>
            ) : (
              rows.map((row) => {
                const person = people.find((p) => p.id === row.personId);
                return (
                  <View key={row.personId} style={styles.row}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {person?.name ?? 'Persona'}
                    </Text>
                    <TextInput
                      style={styles.rowInput}
                      value={row.amount}
                      onChangeText={(t) => setRowAmount(row.personId, t)}
                      placeholder="0"
                      placeholderTextColor="#666"
                      keyboardType="decimal-pad"
                    />
                    <Pressable onPress={() => removeRow(row.personId)}>
                      <FontAwesome name="times" size={18} color="#e87e7e" />
                    </Pressable>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.peopleList}>
            {people
              .filter((p) => !rows.some((r) => r.personId === p.id))
              .map((p) => (
                <Pressable
                  key={p.id}
                  style={styles.addPersonChip}
                  onPress={() => addPersonRow(p.id)}
                >
                  <FontAwesome name="plus" size={12} color="#7ee2a8" />
                  <Text style={styles.addPersonChipText}>{p.name}</Text>
                </Pressable>
              ))}
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable style={styles.confirmButton} onPress={handleSave}>
              <Text style={styles.confirmText}>Guardar</Text>
            </Pressable>
          </View>
        </View>
      </View>
      </Modal>

      <PeopleManager
        visible={peopleManagerVisible}
        onClose={() => setPeopleManagerVisible(false)}
        onCreate={handleCreatePerson}
        onRename={handleRenamePerson}
        onDelete={handleDeletePerson}
      />
    </>
  );
}

type PeopleManagerProps = {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  onRename: (id: number, name: string) => void;
  onDelete: (id: number) => void;
};

function PeopleManager({
  visible,
  onClose,
  onCreate,
  onRename,
  onDelete,
}: PeopleManagerProps) {
  const db = useSQLiteContext();
  const [people, setPeople] = React.useState<Person[]>([]);
  const [newName, setNewName] = React.useState('');
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editName, setEditName] = React.useState('');

  const load = React.useCallback(async () => {
    const list = await getAllPeople(db);
    setPeople(list);
  }, [db]);

  React.useEffect(() => {
    if (visible) {
      load();
      setNewName('');
      setEditingId(null);
    }
  }, [visible, load]);

  const submitCreate = () => {
    if (!newName.trim()) {
      return;
    }
    onCreate(newName);
    setNewName('');
  };

  const submitRename = () => {
    if (editingId === null) {
      return;
    }
    onRename(editingId, editName);
    setEditingId(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Personas</Text>

          <View style={styles.createRow}>
            <TextInput
              style={styles.createInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Nueva persona"
              placeholderTextColor="#666"
              onSubmitEditing={submitCreate}
            />
            <Pressable style={styles.createButton} onPress={submitCreate}>
              <Text style={styles.createButtonText}>Agregar</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.list}>
            {people.length === 0 ? (
              <Text style={styles.emptyText}>Sin personas.</Text>
            ) : (
              people.map((p) =>
                editingId === p.id ? (
                  <View key={p.id} style={styles.row}>
                    <TextInput
                      style={styles.editInput}
                      value={editName}
                      onChangeText={setEditName}
                      autoFocus
                      onSubmitEditing={submitRename}
                    />
                    <Pressable onPress={submitRename}>
                      <FontAwesome name="check" size={18} color="#7ee2a8" />
                    </Pressable>
                  </View>
                ) : (
                  <View key={p.id} style={styles.row}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Pressable
                      onPress={() => {
                        setEditingId(p.id);
                        setEditName(p.name);
                      }}
                    >
                      <FontAwesome name="pencil" size={16} color="#888" />
                    </Pressable>
                    <Pressable onPress={() => onDelete(p.id)}>
                      <FontAwesome name="trash" size={16} color="#e87e7e" />
                    </Pressable>
                  </View>
                )
              )
            )}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#151515',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3b3b3b',
    padding: 20,
    maxHeight: '80%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  totalValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  remainingValue: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  remainingOk: {
    color: '#7ee2a8',
  },
  remainingBad: {
    color: '#e8c87e',
  },
  list: {
    maxHeight: 220,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  rowName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  rowInput: {
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#3b3b3b',
    backgroundColor: '#111',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 90,
    textAlign: 'right',
    marginRight: 10,
  },
  peopleList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  addPersonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1d3a2a',
    borderWidth: 1,
    borderColor: '#2e5c43',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  addPersonChipText: {
    color: '#7ee2a8',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
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
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  createInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#3b3b3b',
    backgroundColor: '#111',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 10,
  },
  createButton: {
    backgroundColor: '#1d3a2a',
    borderWidth: 1,
    borderColor: '#2e5c43',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  createButtonText: {
    color: '#7ee2a8',
    fontSize: 14,
    fontWeight: '700',
  },
  editInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#3b3b3b',
    backgroundColor: '#111',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 10,
  },
});
