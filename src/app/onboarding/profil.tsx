import { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfilScreen() {
  const router = useRouter();
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [superficie, setSuperficie] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    if (!nom.trim()) return;
    setLoading(true);
    await AsyncStorage.multiSet([
      ['user_nom', nom.trim()],
      ['user_telephone', telephone.trim()],
      ['user_superficie', superficie.trim()],
      ['onboarding_done', 'true'],
    ]);
    router.replace('/(app)/(tabs)');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#2E5C31', padding: 24, paddingTop: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{
              width: i === 3 ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#FFFFFF',
            }} />
          ))}
        </View>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#FFFFFF' }}>
          👤 Votre profil
        </Text>
        <Text style={{ fontSize: 13, color: '#A5D6A7', marginTop: 4 }}>
          Dernière étape — personnalisez votre expérience
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {/* Champ nom */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>
          NOM COMPLET *
        </Text>
        <TextInput
          value={nom}
          onChangeText={setNom}
          placeholder="Ex: Moussa Kaboré"
          placeholderTextColor="#9CA3AF"
          style={{
            backgroundColor: '#F5F2EB',
            borderRadius: 12,
            padding: 16,
            fontSize: 15,
            color: '#1A1A1A',
            borderWidth: 1,
            borderColor: nom ? '#2E5C31' : '#E8E3D8',
            marginBottom: 20,
          }}
        />

        {/* Téléphone */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>
          TÉLÉPHONE (optionnel)
        </Text>
        <TextInput
          value={telephone}
          onChangeText={setTelephone}
          placeholder="+226 XX XX XX XX"
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
          style={{
            backgroundColor: '#F5F2EB',
            borderRadius: 12,
            padding: 16,
            fontSize: 15,
            color: '#1A1A1A',
            borderWidth: 1,
            borderColor: '#E8E3D8',
            marginBottom: 20,
          }}
        />

        {/* Superficie */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>
          SUPERFICIE EXPLOITÉE (optionnel)
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 32 }}>
          {['< 1 ha', '1-5 ha', '5-10 ha', '> 10 ha'].map((s) => (
            <Pressable
              key={s}
              onPress={() => setSuperficie(s)}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: superficie === s ? '#2E5C31' : '#E8E3D8',
                backgroundColor: superficie === s ? '#E8F5E9' : '#FFFFFF',
                alignItems: 'center',
              }}
            >
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: superficie === s ? '#2E5C31' : '#6B7280',
              }}>
                {s}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Bouton terminer */}
        <Pressable
          onPress={handleFinish}
          disabled={!nom.trim() || loading}
          style={{
            backgroundColor: nom.trim() ? '#2E5C31' : '#D1D5DB',
            borderRadius: 16,
            padding: 18,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {loading
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>
                🚀 Commencer avec TerraAI
              </Text>
          }
        </Pressable>

        <Text style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 16 }}>
          Vos données restent sur votre téléphone
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}