import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StatusBar, DimensionValue } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePestDiagnostic } from '../../hooks/useDiagnostic';

type ScreenState = 'scanner' | 'detection' | 'detail';

const CAMERA_FEED_URL = 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_fc37e60b-957b-4b14-a5b8-e9ce73a6c999.jpg';

interface DetectionBox {
  id: string;
  top: DimensionValue;
  left: DimensionValue;
  width: DimensionValue;
  height: DimensionValue;
}

const DETECTION_BOXES: DetectionBox[] = [
  { id: '1', top: '28%', left: '15%', width: '30%', height: '25%' },
  { id: '2', top: '55%', left: '55%', width: '25%', height: '20%' },
];

// ─── Vue caméra ───────────────────────────────────────────────────────────────
function CameraView({ imageUri, isScanning, detected, pestName, onScan }: {
  imageUri: string | null;
  isScanning: boolean;
  detected: boolean;
  pestName: string | null;
  onScan: () => void;
}) {
  const corners = [
    { top: '20%' as DimensionValue, left: '8%' as DimensionValue },
    { top: '20%' as DimensionValue, right: '8%' as DimensionValue },
    { bottom: '20%' as DimensionValue, left: '8%' as DimensionValue },
    { bottom: '20%' as DimensionValue, right: '8%' as DimensionValue },
  ];

  const displayImage = imageUri ?? CAMERA_FEED_URL;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ flex: 1, position: 'relative' }}>
        <Image
          style={{ width: '100%', height: '100%' }}
          source={{ uri: displayImage }}
          contentFit="cover"
        />
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.2)' }} />

        {corners.map((pos, i) => (
          <View key={i} style={{
            position: 'absolute',
            ...pos,
            width: 32, height: 32,
            borderColor: detected ? '#FF5722' : '#69F0AE',
            borderTopWidth: i < 2 ? 3 : 0,
            borderBottomWidth: i >= 2 ? 3 : 0,
            borderLeftWidth: i % 2 === 0 ? 3 : 0,
            borderRightWidth: i % 2 === 1 ? 3 : 0,
          }} />
        ))}

        {detected && DETECTION_BOXES.map((box) => (
          <View key={box.id} style={{
            position: 'absolute',
            top: box.top, left: box.left,
            width: box.width, height: box.height,
            borderWidth: 2, borderColor: '#FF5722',
            borderRadius: 6, backgroundColor: 'rgba(255,87,34,0.12)',
          }}>
            <View style={{
              position: 'absolute', top: -24, left: 0,
              backgroundColor: '#FF5722',
              borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
            }}>
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                {pestName?.split(' ')[0] ?? 'Ravageur'}
              </Text>
            </View>
          </View>
        ))}

        <View style={{
          position: 'absolute', bottom: 20, left: 0, right: 0,
          alignItems: 'center',
        }}>
          {isScanning ? (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              backgroundColor: 'rgba(0,0,0,0.75)',
              borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10,
            }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF5722' }} />
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>
                Analyse IA en cours...
              </Text>
            </View>
          ) : detected ? (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              backgroundColor: 'rgba(255,87,34,0.9)',
              borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10,
            }}>
              <Ionicons name="warning" size={16} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                Ravageur détecté !
              </Text>
            </View>
          ) : (
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, textAlign: 'center' }}>
              {imageUri ? 'Photo prête à analyser' : 'Prenez une photo de vos cultures'}
            </Text>
          )}
        </View>
      </View>

      <View style={{
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 32, paddingVertical: 20,
        backgroundColor: '#111',
      }}>
        <View style={{ width: 48, height: 48 }} />

        <Pressable
          onPress={onScan}
          style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: detected ? '#FF5722' : '#2E5C31',
            borderWidth: 4, borderColor: 'rgba(255,255,255,0.25)',
            alignItems: 'center', justifyContent: 'center',
            elevation: 6, shadowColor: detected ? '#FF5722' : '#2E5C31',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4, shadowRadius: 8,
          }}
        >
          <Ionicons
            name={detected ? 'bug' : imageUri ? 'scan' : 'camera'}
            size={30}
            color="#FFFFFF"
          />
        </Pressable>

        <View style={{
          width: 48, height: 48, borderRadius: 16,
          backgroundColor: 'rgba(255,255,255,0.1)',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Ionicons name="flash" size={22} color="#FFFFFF" />
        </View>
      </View>
    </View>
  );
}

// ─── Détail ravageur ──────────────────────────────────────────────────────────
function PestDetail({ pest, confidence, isMock, errorMessage, onBack }: {
  pest: import('../../types/types').Pest;
  confidence: number | null;
  isMock: boolean;
  errorMessage: string | null;
  onBack: () => void;
}) {
  const infectionColor = pest.infectionRate > 60
    ? '#DC2626' : pest.infectionRate > 30 ? '#F57C00' : '#16A34A';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F5F2EB' }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {errorMessage && (
        <View style={{
          backgroundColor: '#FFF3E0', borderRadius: 16, padding: 14,
          margin: 16, marginBottom: 0,
          flexDirection: 'row', alignItems: 'center', gap: 10,
          borderLeftWidth: 4, borderLeftColor: '#D95C14',
        }}>
          <Ionicons name="cloud-offline-outline" size={20} color="#D95C14" />
          <Text style={{ flex: 1, fontSize: 12, color: '#92400E', lineHeight: 17 }}>
            {errorMessage}
          </Text>
        </View>
      )}

      <View style={{
        backgroundColor: '#FFFFFF', margin: 16, borderRadius: 20, padding: 18,
        elevation: 3, shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <View style={{
            width: 56, height: 56, borderRadius: 18,
            backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 28 }}>🐛</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A1A1A' }}>
              {pest.name}
            </Text>
            <Text style={{ fontSize: 12, fontStyle: 'italic', color: '#6B7280', marginTop: 2 }}>
              {pest.scientificName}
            </Text>
          </View>
        </View>

        {/* Badge confiance / mode démo */}
        {confidence !== null && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            alignSelf: 'flex-start', backgroundColor: '#E8F5E9',
            borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 14,
          }}>
            <Ionicons name="checkmark-circle" size={14} color="#2E5C31" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#2E5C31' }}>
              Confiance IA : {confidence.toFixed(1)}%
            </Text>
          </View>
        )}
        {isMock && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            alignSelf: 'flex-start', backgroundColor: '#FFF3E0',
            borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 14,
          }}>
            <Ionicons name="flask" size={14} color="#D95C14" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#D95C14' }}>
              Mode démo
            </Text>
          </View>
        )}

        <Text style={{ fontSize: 13, fontWeight: '600', color: '#4B5563', marginBottom: 8 }}>
          Zone infectée estimée
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{
            flex: 1, height: 10, borderRadius: 6,
            backgroundColor: '#FEE2E2', overflow: 'hidden',
          }}>
            <View style={{
              width: `${pest.infectionRate}%` as DimensionValue,
              height: '100%', borderRadius: 6,
              backgroundColor: infectionColor,
            }} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: '800', color: infectionColor, minWidth: 40 }}>
            {pest.infectionRate}%
          </Text>
        </View>

        <Text style={{ fontSize: 13, color: '#6B7280', lineHeight: 20, marginTop: 14 }}>
          {pest.description}
        </Text>
      </View>

      <View style={{
        backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 12,
        borderRadius: 20, padding: 18,
        elevation: 3, shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <View style={{
            width: 38, height: 38, borderRadius: 12,
            backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 18 }}>💊</Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A' }}>Traitements</Text>
        </View>
        {pest.treatments.map((t, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
            <View style={{
              width: 26, height: 26, borderRadius: 8,
              backgroundColor: '#FF5722', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>{i + 1}</Text>
            </View>
            <Text style={{ flex: 1, fontSize: 14, color: '#374151', lineHeight: 21 }}>{t}</Text>
          </View>
        ))}
      </View>

      <View style={{
        backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 16,
        borderRadius: 20, padding: 18,
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
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A' }}>Prévention</Text>
        </View>
        {pest.prevention.map((item, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <View style={{
              width: 7, height: 7, borderRadius: 4,
              backgroundColor: '#2E5C31', marginTop: 7, flexShrink: 0,
            }} />
            <Text style={{ flex: 1, fontSize: 14, color: '#374151', lineHeight: 21 }}>{item}</Text>
          </View>
        ))}
      </View>

      <Pressable
        onPress={onBack}
        style={{
          backgroundColor: '#FF5722', borderRadius: 18,
          marginHorizontal: 16, paddingVertical: 16,
          alignItems: 'center', flexDirection: 'row',
          justifyContent: 'center', gap: 8,
          elevation: 4, shadowColor: '#FF5722',
          shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6,
        }}
      >
        <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>Retour</Text>
      </Pressable>
    </ScrollView>
  );
}

// ─── Screen principal ─────────────────────────────────────────────────────────
export default function RavageursScreen() {
  const [screen, setScreen] = useState<ScreenState>('scanner');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const pestDiag = usePestDiagnostic();

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { setPermissionDenied(true); return; }
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true, quality: 0.8, aspect: [4, 3],
    });
    if (!res.canceled) setImageUri(res.assets[0].uri);
  };

  const handleScan = async () => {
    // Si déjà détecté → aller au rapport
    if (pestDiag.result) { setScreen('detection'); return; }

    // Pas encore de photo → prendre une photo
    if (!imageUri) {
      await takePhoto();
      return;
    }

    // Photo présente → lancer l'analyse
    await pestDiag.analyze(imageUri);
  };

  const resetScanner = () => {
    pestDiag.reset();
    setImageUri(null);
    setScreen('scanner');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F2EB' }}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />
      <SafeAreaView style={{ flex: 1 }}>

        {/* ── Scanner ── */}
        {screen === 'scanner' && (
          <View style={{ flex: 1 }}>
            <LinearGradient
              colors={['#111', '#1A1A1A']}
              style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, gap: 12,
              }}
            >
              <View style={{
                width: 38, height: 38, borderRadius: 12,
                backgroundColor: '#FF5722', alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 18 }}>🐛</Text>
              </View>
              <View>
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>
                  Scanner IA Ravageurs
                </Text>
                <Text style={{ color: '#9CA3AF', fontSize: 11, marginTop: 1 }}>
                  {imageUri ? 'Touchez pour analyser' : "Touchez l'appareil photo"}
                </Text>
              </View>
            </LinearGradient>

            {permissionDenied && (
              <View style={{
                backgroundColor: '#FFF1F2', borderRadius: 14, padding: 14,
                margin: 16, marginBottom: 0,
                borderLeftWidth: 4, borderLeftColor: '#EF4444',
              }}>
                <Text style={{ fontSize: 13, color: '#991B1B' }}>
                  ⚠️ Permission caméra refusée. Autorisez l'accès dans les paramètres.
                </Text>
              </View>
            )}

            <CameraView
              imageUri={imageUri}
              isScanning={pestDiag.loading}
              detected={!!pestDiag.result}
              pestName={pestDiag.result?.name ?? null}
              onScan={handleScan}
            />

            {/* Bannière rapport si détecté */}
            {pestDiag.result && (
              <View style={{
                backgroundColor: '#111', paddingHorizontal: 16, paddingVertical: 12,
              }}>
                <Text style={{ color: '#FF8A65', fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 10 }}>
                  Ravageur détecté — Touchez pour les détails
                </Text>
                <Pressable
                  onPress={() => setScreen('detection')}
                  style={{
                    backgroundColor: '#FF5722', borderRadius: 16,
                    paddingVertical: 14, alignItems: 'center',
                    flexDirection: 'row', justifyContent: 'center', gap: 8,
                    elevation: 4, shadowColor: '#FF5722',
                    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6,
                  }}
                >
                  <Ionicons name="document-text" size={18} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>
                    Voir le rapport complet
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Bouton reprendre photo */}
            {imageUri && !pestDiag.result && !pestDiag.loading && (
              <View style={{ backgroundColor: '#111', paddingHorizontal: 16, paddingVertical: 12 }}>
                <Pressable
                  onPress={takePhoto}
                  style={{
                    borderRadius: 16, borderWidth: 2, borderColor: '#69F0AE',
                    paddingVertical: 12, alignItems: 'center',
                    flexDirection: 'row', justifyContent: 'center', gap: 8,
                  }}
                >
                  <Ionicons name="camera-reverse-outline" size={18} color="#69F0AE" />
                  <Text style={{ color: '#69F0AE', fontWeight: '700', fontSize: 14 }}>
                    Reprendre une photo
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* ── Détection (rapport) ── */}
        {screen === 'detection' && pestDiag.result && (
          <View style={{ flex: 1 }}>
            <LinearGradient
              colors={['#C62828', '#FF5722']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{
                paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18,
                flexDirection: 'row', alignItems: 'center', gap: 12,
              }}
            >
              <Pressable
                onPress={resetScanner}
                style={{
                  width: 36, height: 36, borderRadius: 12,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800' }}>
                  🚨 Rapport de détection
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 1 }}>
                  Analyse terminée
                </Text>
              </View>
            </LinearGradient>

            <ScrollView
              contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{
                backgroundColor: '#FFF3E0', borderRadius: 20, padding: 16,
                marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 14,
                borderLeftWidth: 4, borderLeftColor: '#FF5722',
              }}>
                <View style={{
                  width: 52, height: 52, borderRadius: 16,
                  backgroundColor: '#FF5722', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Ionicons name="warning" size={26} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#BF360C' }}>
                    {pestDiag.result.name}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#E64A19', marginTop: 3 }}>
                    Zone infestée estimée : {pestDiag.result.infectionRate}%
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 }}>
                Ravageur identifié
              </Text>
              <Pressable
                onPress={() => setScreen('detail')}
                style={({ pressed }) => ({
                  backgroundColor: '#FFFFFF', borderRadius: 20,
                  padding: 16, marginBottom: 12,
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  opacity: pressed ? 0.92 : 1,
                  elevation: 3, shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,
                })}
              >
                <View style={{
                  width: 52, height: 52, borderRadius: 16,
                  backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Text style={{ fontSize: 26 }}>🐛</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>
                    {pestDiag.result.name}
                  </Text>
                  <Text style={{ fontSize: 12, fontStyle: 'italic', color: '#6B7280', marginTop: 2 }}>
                    {pestDiag.result.scientificName}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <View style={{ flex: 1, height: 6, borderRadius: 4, backgroundColor: '#FEE2E2' }}>
                      <View style={{
                        width: `${pestDiag.result.infectionRate}%` as DimensionValue,
                        height: '100%', borderRadius: 4,
                        backgroundColor: pestDiag.result.infectionRate > 60 ? '#DC2626' : '#F57C00',
                      }} />
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>
                      {pestDiag.result.infectionRate}%
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
              </Pressable>

              <Pressable
                onPress={resetScanner}
                style={{
                  borderRadius: 18, borderWidth: 2, borderColor: '#FF5722',
                  backgroundColor: '#FFFFFF', paddingVertical: 14,
                  alignItems: 'center', flexDirection: 'row',
                  justifyContent: 'center', gap: 8, marginTop: 4,
                }}
              >
                <Ionicons name="camera-outline" size={20} color="#FF5722" />
                <Text style={{ color: '#FF5722', fontWeight: '700', fontSize: 15 }}>
                  Nouveau scan
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        )}

        {/* ── Détail ── */}
        {screen === 'detail' && pestDiag.result && (
          <View style={{ flex: 1 }}>
            <LinearGradient
              colors={['#C62828', '#FF5722']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{
                paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18,
                flexDirection: 'row', alignItems: 'center', gap: 12,
              }}
            >
              <Pressable
                onPress={() => setScreen('detection')}
                style={{
                  width: 36, height: 36, borderRadius: 12,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>
                  {pestDiag.result.name}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 1, fontStyle: 'italic' }}>
                  {pestDiag.result.scientificName}
                </Text>
              </View>
            </LinearGradient>
            <PestDetail
              pest={pestDiag.result}
              confidence={pestDiag.confidence}
              isMock={pestDiag.isMock}
              errorMessage={pestDiag.error}
              onBack={() => setScreen('detection')}
            />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}