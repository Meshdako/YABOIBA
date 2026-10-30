import { useLocalSearchParams } from 'expo-router';

import HomeScreen from '@/src/views/Home';

export default function EditTransactionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <HomeScreen editRecordId={Number(id)} />;
}
