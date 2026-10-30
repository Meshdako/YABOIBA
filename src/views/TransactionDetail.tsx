import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import {
  getRecordById,
  getActiveAccountId,
  getAccountById,
  getAllCategories,
  getSplitsByRecord,
  saveSplits,
  setSplitPaid,
  deleteRecord,
  type RecordRow,
  type Category,
  type Split,
} from '@/src/db';
import SplitModal, { type SplitDraft } from '@/src/components/SplitModal';
import { DECIMAL_SEPARATOR, THOUSAND_SEPARATOR } from '@/src/config';

const formatMoney = (value: number) => {
  const rounded = Math.round(value * 100) / 100;
  const [intPart, decPart] = rounded.toFixed(2).split('.');
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSAND_SEPARATOR);
  return decPart === '00' ? withThousands : `${withThousands}${DECIMAL_SEPARATOR}${decPart}`;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function TransactionDetailScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [record, setRecord] = React.useState<RecordRow | null>(null);
  const [accountName, setAccountName] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [splits, setSplits] = React.useState<Split[]>([]);
  const [splitModalVisible, setSplitModalVisible] = React.useState(false);

  const loadCategories = React.useCallback(async () => {
    const cats = await getAllCategories(db);
    setCategories(cats);
  }, [db]);

  const loadRecord = React.useCallback(async () => {
    const accountId = await getActiveAccountId(db);
    if (accountId !== null) {
      const account = await getAccountById(db, accountId);
      if (account) {
        setAccountName(account.name);
        const row = await getRecordById(db, account.id, Number(id));
        setRecord(row);
        if (row) {
          const splitRows = await getSplitsByRecord(db, row.id);
          setSplits(splitRows);
        } else {
          setSplits([]);
        }
      }
    }
    setLoading(false);
  }, [db, id]);

  useFocusEffect(
    React.useCallback(() => {
      loadRecord();
      loadCategories();
    }, [loadRecord, loadCategories])
  );

  const recordCategory =
    record?.categoryId !== null && record?.categoryId !== undefined
      ? categories.find((c) => c.id === record.categoryId) ?? null
      : null;

  const handleDelete = () => {
    Alert.alert(
      'Eliminar transacción',
      '¿Estás seguro de que quieres eliminar esta transacción? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (!record) {
              return;
            }
            await deleteRecord(db, record.id);
            router.back();
          },
        },
      ]
    );
  };

  const handleSplitSave = async (drafts: SplitDraft[]) => {
    if (!record) {
      return;
    }
    await saveSplits(db, record.id, drafts);
    setSplitModalVisible(false);
    await loadRecord();
  };

  const handleTogglePaid = async (split: Split) => {
    await setSplitPaid(db, split.id, !split.isPaid);
    await loadRecord();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Cargando...</Text>
      </View>
    );
  }

  if (!record) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Transacción no encontrada</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Detalle</Text>
        <Pressable style={styles.editButton} onPress={() => router.push(`/edit/${record.id}`)}>
          <FontAwesome name="pencil" size={16} color="#7ee2a8" />
          <Text style={styles.editText}>Editar</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Detalle</Text>

        <View style={styles.amountSection}>
          <Text style={styles.amountSymbol}>$</Text>
          <Text
            style={[
              styles.amountValue,
              record.isIncome ? styles.income : styles.expense,
            ]}
          >
            {formatMoney(record.amount)}
          </Text>
        </View>
        <Text
          style={[
            styles.amountLabel,
            record.isIncome ? styles.income : styles.expense,
          ]}
        >
          {record.isIncome ? 'Ingreso' : 'Gasto'}
        </Text>

        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>Exitoso</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Cuenta</Text>
          <Text style={styles.metaValue}>{accountName}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Descripción</Text>
          <Text style={styles.metaValue}>{record.label}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Categoría</Text>
          <Text style={styles.metaValue} numberOfLines={1}>
            {recordCategory ? (
              <Text style={{ color: recordCategory.color }}>{'\u25CF '}</Text>
            ) : null}
            {recordCategory?.name ?? 'Sin categoría'}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Fecha</Text>
          <Text style={styles.metaValue}>{formatDate(record.date)}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Hora</Text>
          <Text style={styles.metaValue}>{formatTime(record.date)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.splitHeader}>
          <Text style={styles.splitTitle}>Dividir pago</Text>
          <Pressable onPress={() => setSplitModalVisible(true)}>
            <Text style={styles.splitEditText}>
              {splits.length > 0 ? 'Editar' : 'Agregar'}
            </Text>
          </Pressable>
        </View>

        {splits.length === 0 ? (
          <Text style={styles.splitEmpty}>Sin división de pago.</Text>
        ) : (
          splits.map((s) => (
            <View key={s.id} style={styles.splitRow}>
              <View style={styles.splitInfo}>
                <Text style={styles.splitName}>{s.personName}</Text>
                <Text style={styles.splitAmount}>${formatMoney(s.amount)}</Text>
              </View>
              <View style={styles.splitPaid}>
                <Text
                  style={[
                    styles.splitPaidText,
                    s.isPaid ? styles.splitPaidYes : styles.splitPaidNo,
                  ]}
                >
                  {s.isPaid ? 'Pagado' : 'Pendiente'}
                </Text>
                <Switch
                  value={Boolean(s.isPaid)}
                  onValueChange={() => handleTogglePaid(s)}
                  trackColor={{ false: '#5c2e2e', true: '#2e5c43' }}
                  thumbColor={s.isPaid ? '#7ee2a8' : '#e87e7e'}
                />
              </View>
            </View>
          ))
        )}
      </View>

      <Pressable style={styles.deleteButton} onPress={handleDelete}>
        <FontAwesome name="trash" size={18} color="#e87e7e" />
        <Text style={styles.deleteText}>Eliminar transacción</Text>
      </Pressable>

      <SplitModal
        visible={splitModalVisible}
        onClose={() => setSplitModalVisible(false)}
        onSave={handleSplitSave}
        initialSplits={splits.map((s) => ({ personId: s.personId, amount: s.amount }))}
        totalAmount={record.amount}
      />
    </ScrollView>
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
  center: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1d3a2a',
    borderWidth: 1,
    borderColor: '#2e5c43',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  editText: {
    color: '#7ee2a8',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#151515',
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  amountSymbol: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    marginTop: 8,
    marginRight: 4,
  },
  amountValue: {
    fontSize: 42,
    fontWeight: '700',
  },
  amountLabel: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  income: {
    color: '#7ee2a8',
  },
  expense: {
    color: '#e87e7e',
  },
  badge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1d3a2a',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 16,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7ee2a8',
    marginRight: 8,
  },
  badgeText: {
    color: '#7ee2a8',
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#2a2a2a',
    marginVertical: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metaLabel: {
    color: '#888',
    fontSize: 14,
  },
  metaValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  modalCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalCategoryText: {
    color: '#fff',
    fontSize: 16,
  },
  deleteButton: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#5c2e2e',
    backgroundColor: '#3a1d1d',
    paddingVertical: 16,
    marginTop: 8,
  },
  deleteText: {
    color: '#e87e7e',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
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
  modalLabel: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalInput: {
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#3b3b3b',
    backgroundColor: '#111',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    justifyContent: 'center',
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  typeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 10,
  },
  typeActive: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
  categoryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  categoryModalCard: {
    backgroundColor: '#151515',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3b3b3b',
    padding: 20,
    maxHeight: '70%',
  },
  categoryModalList: {
    maxHeight: '80%',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
  },
  categoryRowSub: {
    paddingLeft: 34,
  },
  categoryRowSelected: {
    backgroundColor: '#1d3a2a',
  },
  categoryRowText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  splitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  splitTitle: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  splitEditText: {
    color: '#7ee2a8',
    fontSize: 14,
    fontWeight: '700',
  },
  splitEmpty: {
    color: '#666',
    fontSize: 14,
    marginBottom: 4,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  splitInfo: {
    flex: 1,
    marginRight: 12,
  },
  splitName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  splitAmount: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  splitPaid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  splitPaidText: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 8,
  },
  splitPaidYes: {
    color: '#7ee2a8',
  },
  splitPaidNo: {
    color: '#e8c87e',
  },
});
