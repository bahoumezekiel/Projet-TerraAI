import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CROP_CALENDAR } from '../../data/mockData';
import type { CropCalendar } from '../../types/types';

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const MONTHS_FULL = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const ACTIVITY_COLORS = {
  semis:      { bg: '#FFF9C4', text: '#F57F17', label: 'Semis',      dot: '#F59E0B' },
  croissance: { bg: '#E8F5E9', text: '#2E5C31', label: 'Croissance', dot: '#16A34A' },
  recolte:    { bg: '#FFF3E0', text: '#E65100', label: 'Récolte',    dot: '#F97316' },
  aucun:      { bg: 'transparent', text: 'transparent', label: '', dot: 'transparent' },
};

function getActivityType(crop: CropCalendar, month: number): keyof typeof ACTIVITY_COLORS {
  const inRange = (m: number, s: number, e: number) =>
    s <= e ? m >= s && m <= e : m >= s || m <= e;
  if (inRange(month, crop.sowing.start, crop.sowing.end)) return 'semis';
  if (inRange(month, crop.growing.start, crop.growing.end)) return 'croissance';
  if (inRange(month, crop.harvest.start, crop.harvest.end)) return 'recolte';
  return 'aucun';
}

// ─── Ligne calendrier ─────────────────────────────────────────────────────────
function CropRow({ crop, currentMonth }: { crop: CropCalendar; currentMonth: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
      <View style={{ width: 68, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ fontSize: 14 }}>{crop.emoji}</Text>
        <Text style={{ fontSize: 11, fontWeight: '600', color: '#374151' }} numberOfLines={1}>
          {crop.crop}
        </Text>
      </View>
      <View style={{ flex: 1, flexDirection: 'row', gap: 2 }}>
        {MONTHS.map((_, i) => {
          const month = i + 1;
          const activity = getActivityType(crop, month);
          const isCurrent = month === currentMonth;
          const cfg = ACTIVITY_COLORS[activity];
          return (
            <View key={month} style={{
              flex: 1, height: 26, borderRadius: 5,
              backgroundColor: activity !== 'aucun' ? cfg.bg : '#F0EDE6',
              borderWidth: isCurrent ? 2 : 0,
              borderColor: isCurrent ? '#2E5C31' : 'transparent',
              alignItems: 'center', justifyContent: 'center',
            }}>
              {activity !== 'aucun' && (
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: cfg.dot }} />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Card détail culture ──────────────────────────────────────────────────────
function CropDetailCard({ crop, currentMonth }: { crop: CropCalendar; currentMonth: number }) {
  const activity = getActivityType(crop, currentMonth);
  const cfg = ACTIVITY_COLORS[activity];

  return (
    <View style={{
      backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, marginBottom: 14,
      elevation: 3, shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8,
    }}>
      {/* En-tête */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <View style={{
          width: 52, height: 52, borderRadius: 16,
          backgroundColor: `${crop.color}20`,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 26 }}>{crop.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A1A1A' }}>
            {crop.crop}
          </Text>
          {activity !== 'aucun' ? (
            <View style={{
              alignSelf: 'flex-start', marginTop: 4,
              backgroundColor: cfg.bg, borderRadius: 20,
              paddingHorizontal: 10, paddingVertical: 4,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: cfg.text }}>
                ⏳ {cfg.label} en cours
              </Text>
            </View>
          ) : (
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
              Hors saison
            </Text>
          )}
        </View>
      </View>

      {/* Phases */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {[
          { label: '🌱 Semis', start: crop.sowing.start, end: crop.sowing.end, bg: '#FFF9C4', color: '#F57F17' },
          { label: '📈 Croissance', start: crop.growing.start, end: crop.growing.end, bg: '#E8F5E9', color: '#2E5C31' },
          { label: '🌾 Récolte', start: crop.harvest.start, end: crop.harvest.end, bg: '#FFF3E0', color: '#E65100' },
        ].map((phase) => (
          <View key={phase.label} style={{
            flex: 1, backgroundColor: phase.bg,
            borderRadius: 14, padding: 10, alignItems: 'center',
          }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: phase.color, textAlign: 'center' }}>
              {phase.label}
            </Text>
            <Text style={{ fontSize: 11, color: phase.color, marginTop: 3, textAlign: 'center' }}>
              {MONTHS[phase.start - 1]} – {MONTHS[(phase.end - 1 + 12) % 12]}
            </Text>
          </View>
        ))}
      </View>

      {/* Conseils */}
      <View style={{
        backgroundColor: '#F5F2EB', borderRadius: 14, padding: 14,
      }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 }}>
          💡 Conseils pratiques
        </Text>
        {crop.tips.map((tip, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <View style={{
              width: 6, height: 6, borderRadius: 3,
              backgroundColor: '#2E5C31', marginTop: 6, flexShrink: 0,
            }} />
            <Text style={{ flex: 1, fontSize: 12, color: '#4B5563', lineHeight: 18 }}>{tip}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Screen principal ─────────────────────────────────────────────────────────
export default function CalendrierScreen() {
  const router = useRouter();
  const [selectedCrop, setSelectedCrop] = useState<CropCalendar | null>(null);
  const currentMonth = 6;

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F2EB' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A3C28" />
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header */}
        <LinearGradient
          colors={['#1A3C28', '#2E5C31']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{
            paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18,
            flexDirection: 'row', alignItems: 'center', gap: 12,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 36, height: 36, borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800' }}>
              📅 Calendrier Agricole
            </Text>
            <Text style={{ color: '#A5D6A7', fontSize: 11, marginTop: 1 }}>
              Saison 2026 · Burkina Faso
            </Text>
          </View>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Card mois actuel */}
          <LinearGradient
            colors={['#2E7D52', '#2E5C31']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 20, padding: 18, marginBottom: 16,
              flexDirection: 'row', alignItems: 'center', gap: 14,
            }}
          >
            <Text style={{ fontSize: 36 }}>🌧️</Text>
            <View>
              <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800' }}>
                {MONTHS_FULL[currentMonth - 1]} 2026
              </Text>
              <Text style={{ color: '#A5D6A7', fontSize: 13, marginTop: 3 }}>
                Saison des pluies en cours
              </Text>
            </View>
          </LinearGradient>

          {/* Légende */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {Object.entries(ACTIVITY_COLORS)
              .filter(([k]) => k !== 'aucun')
              .map(([key, val]) => (
                <View key={key} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: val.bg, borderRadius: 20,
                  paddingHorizontal: 12, paddingVertical: 6,
                }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: val.dot }} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: val.text }}>
                    {val.label}
                  </Text>
                </View>
              ))}
          </View>

          {/* Grille calendrier */}
          <View style={{
            backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 16,
            elevation: 3, shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8,
          }}>
            {/* Labels mois */}
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <View style={{ width: 68 }} />
              <View style={{ flex: 1, flexDirection: 'row', gap: 2 }}>
                {MONTHS.map((m, i) => (
                  <View key={m} style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{
                      fontSize: 10,
                      color: i + 1 === currentMonth ? '#2E5C31' : '#9CA3AF',
                      fontWeight: i + 1 === currentMonth ? '800' : '400',
                    }}>
                      {m[0]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            {CROP_CALENDAR.map((crop) => (
              <CropRow key={crop.id} crop={crop} currentMonth={currentMonth} />
            ))}
          </View>

          {/* Alertes saison */}
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 }}>
            ⚠️ Alertes de la saison
          </Text>
          {[
            { emoji: '🌾', title: 'Semis du mil — Période optimale', desc: 'Conditions météo favorables. Semez avant le 15 juillet.', color: '#F57F17', bg: '#FFF9C4', border: '#F59E0B' },
            { emoji: '🌽', title: 'Maïs — Semis en retard !', desc: 'La fenêtre de semis optimale se ferme. Agissez rapidement.', color: '#DC2626', bg: '#FFF1F2', border: '#EF4444' },
            { emoji: '☔', title: 'Pluies attendues mercredi', desc: 'Préparez vos champs : 25–35mm de précipitations prévues.', color: '#1565C0', bg: '#EFF6FF', border: '#3B82F6' },
          ].map((alert, i) => (
            <View key={i} style={{
              backgroundColor: alert.bg, borderRadius: 16,
              padding: 14, marginBottom: 10,
              flexDirection: 'row', alignItems: 'flex-start', gap: 12,
              borderLeftWidth: 4, borderLeftColor: alert.border,
              elevation: 2, shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
            }}>
              <Text style={{ fontSize: 22 }}>{alert.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: alert.color }}>
                  {alert.title}
                </Text>
                <Text style={{ fontSize: 12, color: alert.color, opacity: 0.8, marginTop: 3, lineHeight: 18 }}>
                  {alert.desc}
                </Text>
              </View>
            </View>
          ))}

          {/* Filtres cultures */}
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginTop: 8, marginBottom: 12 }}>
            📋 Détails par culture
          </Text>
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 14 }}
            contentContainerStyle={{ gap: 8 }}
          >
            <Pressable
              onPress={() => setSelectedCrop(null)}
              style={{
                paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20,
                backgroundColor: selectedCrop === null ? '#2E5C31' : '#FFFFFF',
                borderWidth: 1.5,
                borderColor: selectedCrop === null ? '#2E5C31' : '#E8E3D8',
                elevation: 2, shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: selectedCrop === null ? '#FFFFFF' : '#4B5563' }}>
                Toutes
              </Text>
            </Pressable>
            {CROP_CALENDAR.map((crop) => (
              <Pressable
                key={crop.id}
                onPress={() => setSelectedCrop(selectedCrop?.id === crop.id ? null : crop)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
                  backgroundColor: selectedCrop?.id === crop.id ? '#2E5C31' : '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: selectedCrop?.id === crop.id ? '#2E5C31' : '#E8E3D8',
                  elevation: 2, shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
                }}
              >
                <Text style={{ fontSize: 14 }}>{crop.emoji}</Text>
                <Text style={{
                  fontSize: 13, fontWeight: '700',
                  color: selectedCrop?.id === crop.id ? '#FFFFFF' : '#4B5563',
                }}>
                  {crop.crop}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Cards détail */}
          {selectedCrop
            ? <CropDetailCard crop={selectedCrop} currentMonth={currentMonth} />
            : CROP_CALENDAR.map((crop) => (
                <CropDetailCard key={crop.id} crop={crop} currentMonth={currentMonth} />
              ))
          }
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}