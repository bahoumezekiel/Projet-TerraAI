import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

export default function RootIndex() {
  const [loading, setLoading] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_done')
      .then((val) => {
        setOnboardingDone(val === 'true');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#2E5C31',
      }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return onboardingDone
    ? <Redirect href="/(app)/(tabs)" />
    : <Redirect href="/onboarding/langue" />;
}