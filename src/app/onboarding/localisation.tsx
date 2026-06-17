import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REGIONS = [
  { code: 'boucle-mouhoun', label: 'Boucle du Mouhoun', chef: 'Dédougou' },
  { code: 'cascades', label: 'Cascades', chef: 'Banfora' },
  { code: 'centre', label: 'Centre', chef: 'Ouagadougou' },
  { code: 'centre-est', label: 'Centre-Est', chef: 'Tenkodogo' },
  { code: 'centre-nord', label: 'Centre-Nord', chef: 'Kaya' },
  { code: 'centre-ouest', label: 'Centre-Ouest', chef: 'Koudougou' },
  { code: 'centre-sud', label: 'Centre-Sud', chef: 'Manga' },
  { code: 'est', label: 'Est', chef: 'Fada N\'Gourma' },
  { code: 'hauts-bassins', label: 'Hauts-Bassins', chef: 'Bobo-Dioulasso' },
  { code: 'nord', label: 'Nord', chef: 'Ouahigouya' },
  { code: 'plateau-central', label: 'Plateau Central', chef: 'Ziniaré' },
  { code: 'sahel', label: 'Sahel', chef: 'Dori' },
  { code: 'sud-ouest', label: 'Sud-Ouest', chef: 'Gaoua' },
];

export default function LocalisationScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  const handleNext = async () => {
    if (!selected) return;
    await AsyncStorage.setItem('region', selected);
    router.push('/onboarding/cultures');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#2E5C31', padding: 24, paddingTop: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{
              width: i === 1 ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i <= 1 ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
            }} />
          ))}
        </View>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#FFFFFF' }}>
          📍 Votre région
        </Text>
        <Text style={{ fontSize: 13, color: '#A5D6A7', marginTop: 4 }}>
          Pour des conseils adaptés à votre zone climatique
        </Text>
      </View>

      {/* Liste régions */}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {REGIONS.map((region) => {
          const isSelected = selected === region.code;
          return (
            <Pressable
              key={region.code}
              onPress={() => setSelected(region.code)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: isSelected ? '#2E5C31' : '#E8E3D8',
                backgroundColor: isSelected ? '#E8F5E9' : '#FFFFFF',
                marginBottom: 10,
              }}
            >
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: isSelected ? '#2E5C31' : '#D1D5DB',
                backgroundColor: isSelected ? '#2E5C31' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
              }}>
                {isSelected && (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' }} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#1A1A1A' }}>
                  {region.label}
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                  Chef-lieu : {region.chef}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Bouton suivant */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F0EBE0',
      }}>
        <Pressable
          onPress={handleNext}
          style={{
            backgroundColor: selected ? '#2E5C31' : '#D1D5DB',
            borderRadius: 16,
            padding: 18,
            alignItems: 'center',
          }}
          disabled={!selected}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>
            Continuer →
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}