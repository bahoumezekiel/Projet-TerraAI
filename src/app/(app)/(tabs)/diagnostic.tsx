import type { Disease, DiagnosticHistory, SeverityLevel } from '../../../types/types';
import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DISEASES, DIAGNOSTIC_HISTORY } from '../../../data/mockData';
import { useDiseaseDiagnostic } from '../../../hooks/useDiagnostic';

type ScreenState = 'accueil' | 'analyse' | 'resultat' | 'historique';

const SEVERITY_CONFIG: Record<SeverityLevel, {
  color: string; bg: string; label: string;
  gradient: [string, string]; icon: string;
}> = {
  faible:  { color: '#166534', bg: '#F0FDF4', label: 'Faible',  gradient: ['#166534', '#16A34A'], icon: '✅' },
  modéré:  { color: '#92400E', bg: '#FFF8E1', label: 'Modéré',  gradient: ['#B45309', '#D97706'], icon: '⚠️' },
  élevé:   { color: '#991B1B', bg: '#FFF1F2', label: 'Élevé',   gradient: ['#991B1B', '#DC2626'], icon: '🚨' },
};

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

// ─── Badge sévérité ───────────────────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: SeverityLevel }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      backgroundColor: cfg.bg,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
    }}>
      <Text style={{ fontSize: 13 }}>{cfg.icon}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: cfg.color }}>
        Sévérité {cfg.label}
      </Text>
    </View>
  );
}

// ─── Écran résultat ───────────────────────────────────────────────────────────
function ResultScreen({ disease, imageUri, onReset, confidence, isMock, errorMessage }: {
  disease: Disease;
  imageUri: string;
  onReset: () => void;
  confidence: number | null;
  isMock: boolean;
  errorMessage: string | null;
}) {
  const cfg = SEVERITY_CONFIG[disease.severity];
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 400, useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.ScrollView
      style={{ flex: 1, opacity: fadeAnim }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Image avec overlay dégradé */}
      <View style={{ height: 260, position: 'relative' }}>
        <Image
          style={{ width: '100%', height: '100%' }}
          source={{ uri: imageUri }}
          contentFit="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.75)']}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 }}
        />

        {/* Badge IA / Confiance / Mode démo */}
        <View style={{
          position: 'absolute', top: 16, right: 16,
          flexDirection: 'row', alignItems: 'center', gap: 6,
          backgroundColor: isMock ? 'rgba(217,92,20,0.92)' : '#2E5C31',
          borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
        }}>
          <Ionicons name={isMock ? 'flask' : 'checkmark-circle'} size={14} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
            {isMock ? 'Mode démo' : 'Analysé par IA'}
          </Text>
        </View>

        {confidence !== null && (
          <View style={{
            position: 'absolute', top: 16, left: 16,
            backgroundColor: 'rgba(255,255,255,0.92)',
            borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
          }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#2E5C31' }}>
              Confiance : {confidence.toFixed(1)}%
            </Text>
          </View>
        )}

        {/* Nom maladie sur l'image */}
        <View style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800' }}>
            {disease.name}
          </Text>
          {disease.affectedCrops.length > 0 && (
            <Text style={{ color: '#E0E0E0', fontSize: 12, marginTop: 2 }}>
              {disease.affectedCrops.join(' · ')}
            </Text>
          )}
        </View>
      </View>

      <View style={{ padding: 16, gap: 14 }}>

        {/* Bannière backend non disponible */}
        {errorMessage && (
          <View style={{
            backgroundColor: '#FFF3E0', borderRadius: 16, padding: 14,
            flexDirection: 'row', alignItems: 'center', gap: 10,
            borderLeftWidth: 4, borderLeftColor: '#D95C14',
          }}>
            <Ionicons name="cloud-offline-outline" size={20} color="#D95C14" />
            <Text style={{ flex: 1, fontSize: 12, color: '#92400E', lineHeight: 17 }}>
              {errorMessage}
            </Text>
          </View>
        )}

        {/* Card sévérité + description */}
        <View style={{
          backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18,
          elevation: 3, shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,
        }}>
          <SeverityBadge severity={disease.severity} />
          <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 22, marginTop: 12 }}>
            {disease.description}
          </Text>
        </View>

        {/* Card traitements */}
        <View style={{
          backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18,
          elevation: 3, shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <View style={{
              width: 38, height: 38, borderRadius: 12,
              backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 18 }}>💊</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A' }}>
              Traitements recommandés
            </Text>
          </View>
          {disease.treatments.map((t, i) => (
            <View key={i} style={{
              flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start',
            }}>
              <View style={{
                width: 26, height: 26, borderRadius: 8,
                backgroundColor: '#2E5C31', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 1,
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>{i + 1}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 14, color: '#374151', lineHeight: 21 }}>{t}</Text>
            </View>
          ))}
        </View>

        {/* Card prévention */}
        <View style={{
          backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18,
          elevation: 3, shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <View style={{
              width: 38, height: 38, borderRadius: 12,
              backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 18 }}>🛡️</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A' }}>
              Prévention
            </Text>
          </View>
          {disease.prevention.map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              <View style={{
                width: 7, height: 7, borderRadius: 4,
                backgroundColor: '#2E5C31', marginTop: 7, flexShrink: 0,
              }} />
              <Text style={{ flex: 1, fontSize: 14, color: '#374151', lineHeight: 21 }}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Bouton nouveau diagnostic */}
        <Pressable
          onPress={onReset}
          style={({ pressed }) => ({
            backgroundColor: '#2E5C31',
            borderRadius: 18,
            paddingVertical: 18,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
            opacity: pressed ? 0.85 : 1,
            elevation: 4,
            shadowColor: '#2E5C31',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
          })}
        >
          <Ionicons name="camera" size={20} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>
            Nouveau diagnostic
          </Text>
        </Pressable>
      </View>
    </Animated.ScrollView>
  );
}

// ─── Historique ───────────────────────────────────────────────────────────────
function HistoryScreen({ history }: { history: DiagnosticHistory[] }) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F5F2EB' }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 14 }}>
        {history.length} diagnostic{history.length > 1 ? 's' : ''} récent{history.length > 1 ? 's' : ''}
      </Text>
      {history.map((item) => {
        const date = new Date(item.date);
        const cfg = SEVERITY_CONFIG[item.disease.severity];
        return (
          <View key={item.id} style={{
            backgroundColor: '#FFFFFF', borderRadius: 18,
            overflow: 'hidden', marginBottom: 12,
            flexDirection: 'row',
            elevation: 3, shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6,
          }}>
            <Image
              style={{ width: 95, height: 95 }}
              source={{ uri: item.imageUri }}
              contentFit="cover"
            />
            <View style={{
              width: 4, backgroundColor: cfg.color, flexShrink: 0,
            }} />
            <View style={{ flex: 1, padding: 12, justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }} numberOfLines={1}>
                  {item.disease.name}
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                  {item.cropType}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{
                  backgroundColor: cfg.bg, borderRadius: 20,
                  paddingHorizontal: 10, paddingVertical: 4,
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: cfg.color }}>
                    {cfg.icon} {cfg.label}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                  {date.getDate()} {MONTHS[date.getMonth()]} {date.getFullYear()}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── Écran analyse ────────────────────────────────────────────────────────────
function AnalyseScreen({ imageUri }: { imageUri: string }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [step, setStep] = useState(0);
  const steps = ['Détection', 'Classification', 'Recommandations'];

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();

    const t1 = setTimeout(() => setStep(1), 900);
    const t2 = setTimeout(() => setStep(2), 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F2EB', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Animated.View style={{
        transform: [{ scale: pulseAnim }],
        borderRadius: 24, overflow: 'hidden',
        width: 220, height: 220, marginBottom: 32,
        elevation: 8, shadowColor: '#2E5C31',
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12,
      }}>
        <Image
          style={{ width: 220, height: 220 }}
          source={{ uri: imageUri }}
          contentFit="cover"
        />
        <View style={{
          position: 'absolute', inset: 0,
          backgroundColor: 'rgba(46,92,49,0.5)',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginTop: 10 }}>
            Analyse en cours...
          </Text>
        </View>
      </Animated.View>

      <Text style={{ fontSize: 20, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' }}>
        🔬 Analyse de votre plante
      </Text>
      <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
        Connexion au modèle IA en cours{'\n'}identification de la maladie éventuelle
      </Text>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 28 }}>
        {steps.map((s, i) => (
          <View key={s} style={{
            paddingHorizontal: 14, paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: i <= step ? '#2E5C31' : '#E8F5E9',
            flexDirection: 'row', alignItems: 'center', gap: 5,
          }}>
            {i < step && (
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            )}
            {i === step && (
              <ActivityIndicator size={10} color="#FFFFFF" />
            )}
            <Text style={{
              fontSize: 12, fontWeight: '700',
              color: i <= step ? '#FFFFFF' : '#2E5C31',
            }}>
              {s}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Screen principal ─────────────────────────────────────────────────────────
export default function DiagnosticScreen() {
  const [screen, setScreen] = useState<ScreenState>('accueil');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const diagnostic = useDiseaseDiagnostic();

  const analyzeImage = async (uri: string) => {
    setImageUri(uri);
    setScreen('analyse');
    await diagnostic.analyze(uri);
    setScreen('resultat');
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { setPermissionDenied(true); return; }
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true, quality: 0.8, aspect: [4, 3],
    });
    if (!res.canceled) analyzeImage(res.assets[0].uri);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { setPermissionDenied(true); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, quality: 0.8, aspect: [4, 3],
    });
    if (!res.canceled) analyzeImage(res.assets[0].uri);
  };

  const reset = () => {
    setScreen('accueil');
    setImageUri(null);
    diagnostic.reset();
    setPermissionDenied(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F2EB' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A3C28" />
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header */}
        <LinearGradient
          colors={['#1A3C28', '#2E5C31']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 18,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {screen !== 'accueil' && (
            <Pressable
              onPress={reset}
              style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800' }}>
              {screen === 'accueil' ? '🌿 Diagnostic IA' :
               screen === 'analyse' ? '🔬 Analyse...' :
               screen === 'resultat' ? '📋 Résultat' : '📂 Historique'}
            </Text>
            <Text style={{ color: '#A5D6A7', fontSize: 11, marginTop: 1 }}>
              {screen === 'accueil' ? 'Modèle EfficientNet · Précision >85%' :
               screen === 'analyse' ? 'Traitement en cours...' :
               screen === 'resultat' ? 'Diagnostic terminé' : `${DIAGNOSTIC_HISTORY.length} diagnostics`}
            </Text>
          </View>
          {screen === 'accueil' && (
            <Pressable
              onPress={() => setScreen('historique')}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
              }}
            >
              <Ionicons name="time-outline" size={14} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
                Historique
              </Text>
            </Pressable>
          )}
        </LinearGradient>

        {/* ── Accueil ── */}
        {screen === 'accueil' && (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ height: 220, position: 'relative' }}>
              <Image
                style={{ width: '100%', height: '100%' }}
                source={{ uri: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_c0006b1c-4ee3-4c4c-9b54-d17cfc05765d.jpg' }}
                contentFit="cover"
              />
              <LinearGradient
                colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.65)']}
                style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'flex-end', padding: 24 }}
              >
                <Text style={{ fontSize: 40, marginBottom: 8 }}>🌿</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', textAlign: 'center' }}>
                  Diagnostic IA des maladies
                </Text>
                <Text style={{ color: '#E0E0E0', fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 19 }}>
                  Photographiez votre plante pour un diagnostic en 5 secondes
                </Text>
              </LinearGradient>
            </View>

            <View style={{ padding: 16 }}>
              <View style={{
                flexDirection: 'row', gap: 12, alignItems: 'center',
                backgroundColor: '#E8F5E9', borderRadius: 18,
                padding: 16, marginBottom: 20,
                borderLeftWidth: 4, borderLeftColor: '#2E5C31',
              }}>
                <View style={{
                  width: 44, height: 44, borderRadius: 14,
                  backgroundColor: '#2E5C31', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="flash" size={22} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1B5E20' }}>
                    Modèle EfficientNet
                  </Text>
                  <Text style={{ fontSize: 12, color: '#2E7D32', marginTop: 3, lineHeight: 18 }}>
                    Précision &gt;85% · Mil, Sorgho, Maïs, Coton, Sésame
                  </Text>
                </View>
              </View>

              {permissionDenied && (
                <View style={{
                  backgroundColor: '#FFF1F2', borderRadius: 14, padding: 14,
                  borderLeftWidth: 4, borderLeftColor: '#EF4444', marginBottom: 16,
                }}>
                  <Text style={{ fontSize: 13, color: '#991B1B' }}>
                    ⚠️ Permission refusée. Veuillez autoriser l'accès dans les paramètres.
                  </Text>
                </View>
              )}

              <View style={{ gap: 12, marginBottom: 28 }}>
                <Pressable
                  onPress={takePhoto}
                  style={({ pressed }) => ({
                    borderRadius: 18, overflow: 'hidden',
                    opacity: pressed ? 0.9 : 1,
                    elevation: 5,
                    shadowColor: '#2E5C31',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3, shadowRadius: 8,
                  })}
                >
                  <LinearGradient
                    colors={['#2E7D52', '#2E5C31']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      justifyContent: 'center', gap: 12, paddingVertical: 18,
                    }}
                  >
                    <View style={{
                      width: 42, height: 42, borderRadius: 14,
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Ionicons name="camera" size={22} color="#FFFFFF" />
                    </View>
                    <View>
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>
                        Prendre une photo
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 1 }}>
                        Diagnostic instantané
                      </Text>
                    </View>
                  </LinearGradient>
                </Pressable>

                <Pressable
                  onPress={pickImage}
                  style={({ pressed }) => ({
                    borderRadius: 18, borderWidth: 2, borderColor: '#2E5C31',
                    backgroundColor: '#FFFFFF', flexDirection: 'row',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 12, paddingVertical: 16,
                    opacity: pressed ? 0.85 : 1,
                    elevation: 2,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.08, shadowRadius: 4,
                  })}
                >
                  <Ionicons name="images-outline" size={22} color="#2E5C31" />
                  <Text style={{ fontWeight: '700', fontSize: 15, color: '#2E5C31' }}>
                    Choisir depuis la galerie
                  </Text>
                </Pressable>
              </View>

              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 }}>
                Maladies détectables
              </Text>
              <View style={{ gap: 10 }}>
                {DISEASES.map((disease) => {
                  const cfg = SEVERITY_CONFIG[disease.severity];
                  return (
                    <View key={disease.id} style={{
                      backgroundColor: '#FFFFFF', borderRadius: 16,
                      padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
                      elevation: 2, shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.06, shadowRadius: 4,
                    }}>
                      <View style={{
                        width: 42, height: 42, borderRadius: 14,
                        backgroundColor: cfg.bg, alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Ionicons name="leaf" size={20} color={cfg.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>
                          {disease.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                          {disease.affectedCrops.join(' · ')}
                        </Text>
                      </View>
                      <View style={{
                        backgroundColor: cfg.bg, borderRadius: 20,
                        paddingHorizontal: 10, paddingVertical: 5,
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: cfg.color }}>
                          {cfg.icon} {cfg.label}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        )}

        {/* ── Analyse ── */}
        {screen === 'analyse' && imageUri && (
          <AnalyseScreen imageUri={imageUri} />
        )}

        {/* ── Résultat ── */}
        {screen === 'resultat' && diagnostic.result && imageUri && (
          <ResultScreen
            disease={diagnostic.result}
            imageUri={imageUri}
            onReset={reset}
            confidence={diagnostic.confidence}
            isMock={diagnostic.isMock}
            errorMessage={diagnostic.error}
          />
        )}

        {/* ── Historique ── */}
        {screen === 'historique' && (
          <HistoryScreen history={DIAGNOSTIC_HISTORY} />
        )}

      </SafeAreaView>
    </View>
  );
}