import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import {
  clearDemoTransactions,
  getActiveAccountId,
  seedDemoTransactions,
} from '@/src/db';

type SettingsRowProps = {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
};

function SettingsRow({ icon, title, subtitle, onPress }: SettingsRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: '#1f2b23' }]}>
        <FontAwesome name={icon} size={16} color="#7ee2a8" />
      </View>
      <View style={styles.rowTexts}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <FontAwesome name="chevron-right" size={14} color="#666" />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const db = useSQLiteContext();

  const handleSeed = async () => {
    const accountId = await getActiveAccountId(db);
    if (accountId === null) {
      Alert.alert('Sin cuenta activa', 'Selecciona una cuenta antes de generar datos.');
      return;
    }
    const count = await seedDemoTransactions(db, accountId);
    Alert.alert('Datos de prueba', `Se crearon ${count} transacciones en la cuenta activa.`);
  };

  const handleClear = () => {
    Alert.alert('Borrar datos de prueba', 'Se eliminarán solo las transacciones de prueba.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          const count = await clearDemoTransactions(db);
          Alert.alert('Datos de prueba', `Se eliminaron ${count} transacciones.`);
        },
      },
    ]);
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Configuración</Text>
      <Text style={styles.subtitle}>Ajustes de la aplicación</Text>

      <View style={styles.section}>
        <SettingsRow
          icon="heart"
          title="Acerca de mí"
          subtitle="Agradecimientos y créditos"
          onPress={() => router.push('/about')}
        />
      </View>

      <View style={[styles.section, styles.sectionSpaced]}>
        <SettingsRow
          icon="flask"
          title="Generar datos de prueba"
          subtitle="Crea transacciones falsas de los últimos 6 meses"
          onPress={handleSeed}
        />
        <SettingsRow
          icon="trash"
          title="Borrar datos de prueba"
          subtitle="Elimina solo las transacciones falsas"
          onPress={handleClear}
        />
      </View>

      <Text style={styles.version}>bill-app v{version}</Text>
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
  section: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#151515',
    overflow: 'hidden',
  },
  sectionSpaced: {
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  rowPressed: {
    backgroundColor: '#1d1d1d',
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowTexts: {
    flex: 1,
    marginRight: 12,
  },
  rowTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  version: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
  },
});
