import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CULTURES = [
  { id: 'mil', label: 'Mil', emoji: '🌾', categorie: 'Céréale' },
  { id: 'sorgho', label: 'Sorgho', emoji: '🌾', categorie: 'Céréale' },
  { id: 'mais', label: 'Maïs', emoji: '🌽', categorie: 'Céréale' },
  { id: 'riz', label: 'Riz', emoji: '🌾', categorie: 'Céréale' },
  { id: 'niebe', label: 'Niébé', emoji: '🫘', categorie: 'Légumineuse' },
  { id: 'arachide', label: 'Arachide', emoji: '🥜', categorie: 'Légumineuse' },
  { id: 'soja', label: 'Soja', emoji: '🫘', categorie: 'Légumineuse' },
  { id: 'sesame', label: 'Sésame', emoji: '🌱', categorie: 'Oléagineux' },
  { id: 'coton', label: 'Coton', emoji: '🌿', categorie: 'Oléagineux' },
  { id: 'tomate', label: 'Tomate', emoji: '🍅', categorie: 'Maraîcher' },
  { id: 'oignon', label: 'Oignon', emoji: '🧅', categorie: 'Maraîcher' },
  { id: 'gombo', label: 'Gombo', emoji: '🌿', categorie: 'Maraîcher' },
];

const MAX_SELECTION = 8;

export default function CulturesScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((c) => c !== id));
    } else {
      if (selected.length >= MAX_SELECTION) return;
      setSelected([...selected, id]);
    }
  };

  const handleNext = async () => {
    if (selected.length === 0) return;
    await AsyncStorage.setItem('cultures', JSON.stringify(selected));
    router.push('/onboarding/profil');
  };

  const categories = [...new Set(CULTURES.map((c) => c.categorie))];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#2E5C31', padding: 24, paddingTop: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{
              width: i === 2 ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i <= 2 ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
            }} />
          ))}
        </View>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#FFFFFF' }}>
          🌱 Vos cultures
        </Text>
        <Text style={{ fontSize: 13, color: '#A5D6A7', marginTop: 4 }}>
          Sélectionnez jusqu'à {MAX_SELECTION} cultures que vous pratiquez
        </Text>
        {/* Compteur */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 12,
          backgroundColor: 'rgba(255,255,255,0.15)',
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingVertical: 6,
          alignSelf: 'flex-start',
          gap: 6,
        }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
            {selected.length}/{MAX_SELECTION}
          </Text>
          <Text style={{ color: '#A5D6A7', fontSize: 12 }}>
            sélectionnées
          </Text>
        </View>
      </View>

      {/* Liste par catégorie */}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {categories.map((cat) => (
          <View key={cat} style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#6B7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
              {cat}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {CULTURES.filter((c) => c.categorie === cat).map((culture) => {
                const isSelected = selected.includes(culture.id);
                const isDisabled = !isSelected && selected.length >= MAX_SELECTION;
                return (
                  <Pressable
                    key={culture.id}
                    onPress={() => toggle(culture.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: isSelected ? '#2E5C31' : isDisabled ? '#F0EBE0' : '#E8E3D8',
                      backgroundColor: isSelected ? '#E8F5E9' : isDisabled ? '#FAFAFA' : '#FFFFFF',
                      opacity: isDisabled ? 0.5 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{culture.emoji}</Text>
                    <Text style={{
                      fontSize: 14,
                      fontWeight: isSelected ? '700' : '500',
                      color: isSelected ? '#2E5C31' : '#1A1A1A',
                    }}>
                      {culture.label}
                    </Text>
                    {isSelected && (
                      <View style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        backgroundColor: '#2E5C31',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>✓</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
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
          disabled={selected.length === 0}
          style={{
            backgroundColor: selected.length > 0 ? '#2E5C31' : '#D1D5DB',
            borderRadius: 16,
            padding: 18,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>
            Continuer → ({selected.length} culture{selected.length > 1 ? 's' : ''})
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}