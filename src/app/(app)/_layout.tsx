/** ce fichier est le layout de la  section proteger (app) il gere la navigation entre les differents ecrans */
import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="ravageurs" />
      <Stack.Screen name="calendrier" />
    </Stack>
  );
}