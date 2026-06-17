import { View, Text, Pressable, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUES = [
  {
    code: 'fr',
    label: 'Français',
    description: 'Interface en français',
    flag: '🇫🇷',
  },
  {
    code: 'moore',
    label: 'Mooré',
    description: 'Interface en mooré',
    flag: '🇧🇫',
  },
];

export default function LangueScreen() {
  const router = useRouter();

  const handleSelect = async (code: string) => {
    await AsyncStorage.setItem('langue', code);
    router.push('/onboarding/localisation');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#2E5C31' }}>
      {/* Header */}
      <View style={{ alignItems: 'center', paddingTop: 60, paddingBottom: 40 }}>
        <Text style={{ fontSize: 48 }}>🌍</Text>
        <Text style={{ fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginTop: 16 }}>
          TerraAI
        </Text>
        <Text style={{ fontSize: 14, color: '#A5D6A7', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }}>
          Votre assistant agricole intelligent pour le Burkina Faso
        </Text>
      </View>

      {/* Indicateur étapes */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 40 }}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              width: i === 0 ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i === 0 ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
            }}
          />
        ))}
      </View>

      {/* Carte principale */}
      <View style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
      }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 }}>
          Choisissez votre langue
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 32 }}>
          Sélectionnez la langue dans laquelle vous souhaitez utiliser TerraAI
        </Text>

        {LANGUES.map((langue) => (
          <Pressable
            key={langue.code}
            onPress={() => handleSelect(langue.code)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              padding: 20,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: '#E8F5E9',
              backgroundColor: pressed ? '#E8F5E9' : '#F9FFF9',
              marginBottom: 16,
            })}
          >
            <Text style={{ fontSize: 36 }}>{langue.flag}</Text>
            <View style={{ marginLeft: 16, flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#1A1A1A' }}>
                {langue.label}
              </Text>
              <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                {langue.description}
              </Text>
            </View>
            <View style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: '#E8F5E9',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 16 }}>→</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}