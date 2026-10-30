import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';

import LineChart, { type ChartSeries } from '@/src/components/LineChart';
import {
  getActiveAccountId,
  getAccountById,
  getMonthlyStats,
  type MonthlyStat,
} from '@/src/db';

const MONTHS = 12;

const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  const names = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  return `${names[m - 1]} ${String(y).slice(2)}`;
};

const linearRegression = (values: number[]) => {
  const n = values.length;
  if (n === 0) {
    return { slope: 0, intercept: 0 };
  }
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = denom === 0 ? sumY / n : (sumY - slope * sumX) / n;
  return { slope, intercept };
};

export default function StatsScreen() {
  const db = useSQLiteContext();
  const [accountName, setAccountName] = React.useState('Cuenta');
  const [stats, setStats] = React.useState<MonthlyStat[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const id = await getActiveAccountId(db);
    if (id !== null) {
      const account = await getAccountById(db, id);
      if (account) {
        setAccountName(account.name);
        const data = await getMonthlyStats(db, account.id, MONTHS);
        setStats(data);
      } else {
        setStats([]);
      }
    } else {
      setStats([]);
    }
    setLoading(false);
  }, [db]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const labels = stats.map((s) => monthLabel(s.month));
  const spendingValues = stats.map((s) => s.spending);
  const balanceValues = stats.map((s) => s.balance);

  const { slope, intercept } = linearRegression(spendingValues);
  const trajectoryValues = spendingValues.map((_, i) => slope * i + intercept);

  const balanceSeries: ChartSeries = {
    name: 'Balance',
    color: '#7ee2a8',
    values: balanceValues,
  };
  const spendingSeries: ChartSeries = {
    name: 'Spending',
    color: '#e87e7e',
    values: spendingValues,
  };
  const trajectorySeries: ChartSeries = {
    name: 'Trayectoria',
    color: '#e8c87e',
    values: trajectoryValues,
    dashed: true,
  };

  const hasData = stats.some((s) => s.spending > 0 || s.income > 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Estadísticas</Text>
      <Text style={styles.subtitle}>{accountName}</Text>

      {loading ? (
        <Text style={styles.emptyText}>Cargando...</Text>
      ) : !hasData ? (
        <Text style={styles.emptyText}>
          Sin datos. Registra transacciones para ver tus estadísticas.
        </Text>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Balance</Text>
            <LineChart series={[balanceSeries]} labels={labels} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Spending</Text>
            <LineChart series={[spendingSeries]} labels={labels} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Spending trajectory</Text>
            <LineChart
              series={[spendingSeries, trajectorySeries]}
              labels={labels}
            />
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#e87e7e' }]} />
                <Text style={styles.legendText}>Gasto real</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#e8c87e' }]} />
                <Text style={styles.legendText}>Tendencia</Text>
              </View>
            </View>
          </View>
        </>
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
  },
  subtitle: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
    marginBottom: 20,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#151515',
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    color: '#c9c9c9',
    fontSize: 13,
  },
});
