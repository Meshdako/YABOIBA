import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as WebBrowser from 'expo-web-browser';

type Credit = {
  name: string;
  detail: string;
  reason: string;
  url?: string;
};

const CREDITS: Credit[] = [
  {
    name: 'Abacus.AI',
    detail: 'Plataforma con la que fue construida la app',
    reason:
      'Gracias por permitir que este proyecto existiera. Toda la aplicación fue desarrollada junto a su agente de programación.',
    url: 'https://abacus.ai',
  },
  {
    name: 'irolinski',
    detail: 'typewriter4react-native',
    reason:
      'Gracias por la dependencia del efecto de escritura tipo máquina de escribir que se ve en la descripción de cada transacción.',
    url: 'https://www.npmjs.com/package/typewriter4react-native',
  },
  {
    name: 'BouarourMohammed',
    detail: 'react-native-animated-rolling-numbers',
    reason:
      'Gracias por la dependencia que anima los números del saldo y del total, para que giren al cambiar.',
    url: 'https://github.com/BouarourMohammed/react-native-animated-rolling-numbers',
  },
  {
    name: 'MagicScript y Software Mansion',
    detail: 'react-native-svg',
    reason:
      'Gracias por la dependencia que hace posibles las gráficas de la pestaña de estadísticas.',
    url: 'https://www.npmjs.com/package/react-native-svg',
  },
];

export default function AboutScreen() {
  const openLink = (url: string) => {
    WebBrowser.openBrowserAsync(url).catch(() => {});
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Acerca de mí</Text>
      <Text style={styles.subtitle}>
        Esta app no habría sido posible sin la ayuda de:
      </Text>

      {CREDITS.map((credit) => (
        <Pressable
          key={credit.name}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => credit.url && openLink(credit.url)}
        >
          <View style={styles.cardHeader}>
            <FontAwesome name="heart" size={14} color="#7ee2a8" />
            <Text style={styles.cardName}>{credit.name}</Text>
            {credit.url ? (
              <FontAwesome
                name="external-link"
                size={12}
                color="#666"
                style={styles.cardLinkIcon}
              />
            ) : null}
          </View>
          <Text style={styles.cardDetail}>{credit.detail}</Text>
          <Text style={styles.cardReason}>{credit.reason}</Text>
        </Pressable>
      ))}
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
  card: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#151515',
    padding: 16,
    marginBottom: 12,
  },
  cardPressed: {
    backgroundColor: '#1d1d1d',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    flex: 1,
  },
  cardLinkIcon: {
    marginLeft: 8,
  },
  cardDetail: {
    color: '#7ee2a8',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  cardReason: {
    color: '#c9c9c9',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
});
