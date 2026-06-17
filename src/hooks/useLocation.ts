import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

type LocationState = {
  granted: boolean;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  loading: boolean;
};

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    granted: false,
    latitude: null,
    longitude: null,
    city: null,
    loading: true,
  });

  useEffect(() => {
    (async () => {
      // Vérifier si on a déjà une position sauvegardée
      const cached = await AsyncStorage.getItem('user_location');
      if (cached) {
        setState({ ...JSON.parse(cached), loading: false });
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setState((prev) => ({ ...prev, granted: false, loading: false }));
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // Reverse geocoding pour avoir la ville
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      const city = geocode[0]?.city ?? geocode[0]?.region ?? 'Burkina Faso';

      const result = { granted: true, latitude, longitude, city, loading: false };
      setState(result);

      // Sauvegarder en cache
      await AsyncStorage.setItem('user_location', JSON.stringify(result));
    })();
  }, []);

  return state;
}