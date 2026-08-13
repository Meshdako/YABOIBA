import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { router, useFocusEffect } from 'expo-router';

import {
  getRecordsByAccount,
  getActiveAccountId,
  getAccountById,
  type RecordRow,
} from '@/src/db';
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
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function AccountScreen() {
  const db = useSQLiteContext();
  const [records, setRecords] = React.useState<RecordRow[]>([]);
  const [accountName, setAccountName] = React.useState('Cuenta');
  const [loading, setLoading] = React.useState(true);

  const loadRecords = React.useCallback(async () => {
    setLoading(true);
    const id = await getActiveAccountId(db);
    if (id !== null) {
      const account = await getAccountById(db, id);
      if (account) {
        setAccountName(account.name);
        const rows = await getRecordsByAccount(db, account.id);
        setRecords(rows);
      } else {
        setRecords([]);
        setAccountName('Cuenta');
      }
    } else {
      setRecords([]);
      setAccountName('Cuenta');
    }
    setLoading(false);
  }, [db]);

  React.useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useFocusEffect(
    React.useCallback(() => {
      loadRecords();
    }, [loadRecords])
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{accountName}</Text>
      {loading ? (
        <Text style={styles.emptyText}>Cargando...</Text>
      ) : records.length === 0 ? (
        <Text style={styles.emptyText}>Sin transacciones guardadas</Text>
      ) : (
        records.map((r) => (
          <Pressable
            key={r.id}
            style={styles.recordCard}
            onPress={() => router.push(`/account/${r.id}`)}
          >
            <View style={styles.recordHeader}>
              <Text style={styles.recordLabel}>{r.label}</Text>
              <Text
                style={[
                  styles.recordAmount,
                  r.isIncome ? styles.income : styles.expense,
                ]}
              >
                {r.isIncome ? '+' : '-'}${formatMoney(r.amount)}
              </Text>
            </View>
            <View style={styles.recordMeta}>
              <Text style={styles.recordDate}>{formatDate(r.date)}</Text>
              {r.categoryName ? (
                <View style={styles.recordCategory}>
                  <View style={styles.categoryDot} />
                  <Text style={styles.categoryName}>{r.categoryName}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        ))
      )}
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
  recordCard: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b3b3b',
    backgroundColor: '#151515',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  recordAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  income: {
    color: '#7ee2a8',
  },
  expense: {
    color: '#e87e7e',
  },
  recordMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  recordDate: {
    color: '#888',
    fontSize: 13,
  },
  recordCategory: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7ee2a8',
    marginRight: 6,
  },
  categoryName: {
    color: '#888',
    fontSize: 13,
  },
});
