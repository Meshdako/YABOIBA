import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { SQLiteProvider } from 'expo-sqlite';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { initDatabase } from '@/src/db';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../src/assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SQLiteProvider databaseName="bill.db" onInit={initDatabase} useSuspense>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="account/index" options={{ title: 'Transacciones' }} />
        <Stack.Screen name="account/[id]" options={{ title: 'Detalle' }} />
        <Stack.Screen
          name="edit/[id]"
          options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }}
        />
        <Stack.Screen name="about" options={{ title: 'Acerca de mí' }} />
        <Stack.Screen name="accounts" options={{ title: 'Cuentas' }} />
        <Stack.Screen name="modal" options={{ title: 'Información', presentation: 'modal' }} />
      </Stack>
    </SQLiteProvider>
  );
}
