import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserOnboardingProfile = {
  langue: 'fr' | 'moore';
  region: string | null;
  regionLabel: string | null;
  cultures: string[];
  nom: string | null;
  telephone: string | null;
  superficie: string | null;
};

const REGIONS_MAP: Record<string, string> = {
  'boucle-mouhoun': 'Boucle du Mouhoun',
  'cascades': 'Cascades',
  'centre': 'Centre',
  'centre-est': 'Centre-Est',
  'centre-nord': 'Centre-Nord',
  'centre-ouest': 'Centre-Ouest',
  'centre-sud': 'Centre-Sud',
  'est': 'Est',
  'hauts-bassins': 'Hauts-Bassins',
  'nord': 'Nord',
  'plateau-central': 'Plateau Central',
  'sahel': 'Sahel',
  'sud-ouest': 'Sud-Ouest',
};

export function useUserProfile() {
  const [profile, setProfile] = useState<UserOnboardingProfile>({
    langue: 'fr',
    region: null,
    regionLabel: null,
    cultures: [],
    nom: null,
    telephone: null,
    superficie: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.multiGet([
      'langue',
      'region',
      'cultures',
      'user_nom',
      'user_telephone',
      'user_superficie',
    ]).then((values) => {
      const map = Object.fromEntries(values.map(([k, v]) => [k, v]));
      const region = map['region'] ?? null;
      setProfile({
        langue: (map['langue'] as 'fr' | 'moore') ?? 'fr',
        region,
        regionLabel: region ? REGIONS_MAP[region] ?? region : null,
        cultures: map['cultures'] ? JSON.parse(map['cultures']) : [],
        nom: map['user_nom'] ?? null,
        telephone: map['user_telephone'] ?? null,
        superficie: map['user_superficie'] ?? null,
      });
      setLoading(false);
    });
  }, []);

  return { profile, loading };
}