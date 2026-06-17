import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="langue" />
      <Stack.Screen name="localisation" />
      <Stack.Screen name="cultures" />
      <Stack.Screen name="profil" />
    </Stack>
  );
}