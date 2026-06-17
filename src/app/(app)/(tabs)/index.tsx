import { ScrollView, View, Text, Pressable, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  WEATHER_DATA,
  MARKET_PRICES,
  DASHBOARD_ALERTS,
} from '@/data/mockData';
import { useUserProfile } from '../../../hooks/useUserProfile';
import { useLocation } from '../../../hooks/useLocation';
import type { MarketPrice } from '../../../types/types';

interface Alert {
  id: string;
  type: 'warning' | 'info' | 'success';
  icon: string;
  title: string;
  message: string;
  time: string;
}

interface ForecastDay {
  day: string;
  min: number;
  max: number;
  icon: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  route: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: '1', label: 'Diagnostic', icon: 'leaf', color: '#2E5C31', bg: '#E8F5E9', route: '/(app)/(tabs)/diagnostic' },
  { id: '2', label: 'Ravageurs', icon: 'bug', color: '#D95C14', bg: '#FFF3E0', route: '/(app)/ravageurs' },
  { id: '3', label: 'Assistant', icon: 'chatbubble-ellipses', color: '#1565C0', bg: '#E3F2FD', route: '/(app)/(tabs)/assistant' },
  { id: '4', label: 'Calendrier', icon: 'calendar', color: '#6A1B9A', bg: '#F3E5F5', route: '/(app)/calendrier' },
  { id: '5', label: 'Marchés', icon: 'trending-up', color: '#00695C', bg: '#E0F2F1', route: '/(app)/(tabs)/marche' },
  { id: '6', label: 'Profil', icon: 'person-circle', color: '#4E342E', bg: '#EFEBE9', route: '/(app)/(tabs)/profil' },
];

const CULTURE_EMOJIS: Record<string, string> = {
  mil: '🌾', sorgho: '🌾', mais: '🌽', riz: '🌾',
  niebe: '🫘', arachide: '🥜', soja: '🫘',
  sesame: '🌱', coton: '🌿',
  tomate: '🍅', oignon: '🧅', gombo: '🌿',
};

const CULTURE_LABELS: Record<string, string> = {
  mil: 'Mil', sorgho: 'Sorgho', mais: 'Maïs', riz: 'Riz',
  niebe: 'Niébé', arachide: 'Arachide', soja: 'Soja',
  sesame: 'Sésame', coton: 'Coton',
  tomate: 'Tomate', oignon: 'Oignon', gombo: 'Gombo',
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function getInitiale(nom: string | null): string {
  if (!nom) return '?';
  return nom.charAt(0).toUpperCase();
}

// ─── Météo ────────────────────────────────────────────────────────────────────
function WeatherCard({ city }: { city: string }) {
  const w = WEATHER_DATA as {
    temperature: number; condition: string;
    humidity: number; icon: string; forecast: ForecastDay[];
  };

  return (
    <View style={{
      borderRadius: 20,
      overflow: 'hidden',
      marginBottom: 20,
      elevation: 6,
      shadowColor: '#1B4D3E',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
    }}>
      <LinearGradient
        colors={['#1B4D3E', '#2E7D52', '#388E3C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 20 }}
      >
        {/* Ville + condition */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <Ionicons name="location" size={13} color="#A5D6A7" />
              <Text style={{ color: '#A5D6A7', fontSize: 12 }}>{city}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
              <Text style={{ fontSize: 56, fontWeight: '800', color: '#FFFFFF', lineHeight: 60 }}>
                {w.temperature}°
              </Text>
              <Text style={{ fontSize: 32, marginBottom: 6 }}>{w.icon}</Text>
            </View>
            <Text style={{ color: '#C8E6C9', fontSize: 13, marginTop: 2 }}>{w.condition}</Text>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="water" size={13} color="#A5D6A7" />
                <Text style={{ color: '#A5D6A7', fontSize: 12 }}>{w.humidity}% humidité</Text>
              </View>
            </View>
          </View>

          {/* Prévisions */}
          <View style={{
            backgroundColor: 'rgba(0,0,0,0.15)',
            borderRadius: 14,
            padding: 12,
            gap: 6,
          }}>
            {w.forecast.map((day) => (
              <View key={day.day} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: '#C8E6C9', fontSize: 11, width: 28 }}>{day.day}</Text>
                <Text style={{ fontSize: 13 }}>{day.icon}</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>
                  {day.min}°/{day.max}°
                </Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── Accès rapide ─────────────────────────────────────────────────────────────
function QuickActionCard({ action, onPress }: { action: QuickAction; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: '30%',
        backgroundColor: action.bg,
        borderRadius: 18,
        padding: 14,
        alignItems: 'center',
        elevation: pressed ? 2 : 4,
        shadowColor: action.color,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      <View style={{
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: action.color,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        elevation: 3,
        shadowColor: action.color,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      }}>
        <Ionicons name={action.icon as any} size={24} color="#FFFFFF" />
      </View>
      <Text style={{
        fontSize: 11,
        fontWeight: '700',
        color: action.color,
        textAlign: 'center',
        lineHeight: 14,
      }}>
        {action.label}
      </Text>
    </Pressable>
  );
}

// ─── Alerte ───────────────────────────────────────────────────────────────────
function AlertCard({ alert }: { alert: Alert }) {
  const config = {
    warning: { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E', iconBg: '#FEF3C7' },
    info:    { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF', iconBg: '#DBEAFE' },
    success: { bg: '#F0FDF4', border: '#22C55E', text: '#166534', iconBg: '#DCFCE7' },
  };
  const c = config[alert.type];

  return (
    <View style={{
      backgroundColor: c.bg,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      borderLeftWidth: 4,
      borderLeftColor: c.border,
    }}>
      <View style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: c.iconBg,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Text style={{ fontSize: 18 }}>{alert.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 2 }}>
          {alert.title}
        </Text>
        <Text style={{ fontSize: 12, color: c.text, opacity: 0.8, lineHeight: 17 }}>
          {alert.message}
        </Text>
        <Text style={{ fontSize: 11, color: c.text, opacity: 0.5, marginTop: 4 }}>
          {alert.time}
        </Text>
      </View>
    </View>
  );
}

// ─── Prix ─────────────────────────────────────────────────────────────────────
function PrixRow({ item, index, total }: { item: MarketPrice; index: number; total: number }) {
  const ouagaPrice = item.prices.find((p) => p.market === 'Ouagadougou');
  const isPositive = (ouagaPrice?.variation ?? 0) >= 0;
  const isLast = index === total - 1;

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: '#F5F0E8',
    }}>
      <Text style={{ fontSize: 22, marginRight: 12 }}>
        {item.category === 'céréale' ? '🌾'
          : item.category === 'légumineuse' ? '🫘'
          : item.category === 'oléagineux' ? '🥜'
          : '🍅'}
      </Text>
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#1A1A1A' }}>
        {item.product}
      </Text>
      <Text style={{ fontSize: 13, color: '#6B7280', marginRight: 10 }}>
        {ouagaPrice?.price} FCFA
      </Text>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: isPositive ? '#F0FDF4' : '#FFF1F2',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 20,
      }}>
        <Ionicons
          name={isPositive ? 'trending-up' : 'trending-down'}
          size={12}
          color={isPositive ? '#16A34A' : '#DC2626'}
        />
        <Text style={{ fontSize: 11, fontWeight: '700', color: isPositive ? '#16A34A' : '#DC2626' }}>
          {Math.abs(ouagaPrice?.variation ?? 0)}%
        </Text>
      </View>
    </View>
  );
}

// ─── Screen principal ─────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useUserProfile();
  const location = useLocation();

  const displayCity = location.city ?? profile.regionLabel ?? 'Burkina Faso';
  const displayNom = profile.nom ?? 'Agriculteur';
  const topPrices = MARKET_PRICES.slice(0, 3);

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F2EB' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1B4D3E" />
      <SafeAreaView style={{ flex: 1 }}>

        {/* ── Header dégradé ── */}
        <LinearGradient
          colors={['#1A3C28', '#2E5C31']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#A5D6A7', fontSize: 13 }}>
                {getGreeting()} 👋
              </Text>
              <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginTop: 2 }}>
                {displayNom}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Ionicons name="location-outline" size={12} color="#A5D6A7" />
                <Text style={{ color: '#A5D6A7', fontSize: 12 }}>
                  {displayCity}
                  {profile.superficie ? ` · ${profile.superficie}` : ''}
                </Text>
              </View>
            </View>

            {/* Avatar */}
            <View style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: 'rgba(255,255,255,0.18)',
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.3)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#FFFFFF' }}>
                {getInitiale(profile.nom)}
              </Text>
            </View>
          </View>

          {/* Badges */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'rgba(255,255,255,0.12)',
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#69F0AE' }} />
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>
                Agentic AI actif
              </Text>
            </View>

            {profile.regionLabel && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: 'rgba(255,255,255,0.12)',
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}>
                <Ionicons name="map-outline" size={11} color="#A5D6A7" />
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>
                  {profile.regionLabel}
                </Text>
              </View>
            )}

            {profile.cultures.length > 0 && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: 'rgba(255,255,255,0.12)',
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}>
                <Text style={{ fontSize: 11 }}>🌱</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>
                  {profile.cultures.length} culture{profile.cultures.length > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        >
          {/* Météo */}
          <WeatherCard city={displayCity} />

          {/* Mes cultures */}
          {profile.cultures.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 }}>
                🌱 Mes cultures
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
                  {profile.cultures.map((c) => (
                    <View key={c} style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: '#FFFFFF',
                      borderRadius: 20,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      elevation: 2,
                      shadowColor: '#2E5C31',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 3,
                    }}>
                      <Text style={{ fontSize: 16 }}>{CULTURE_EMOJIS[c] ?? '🌿'}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#2E5C31' }}>
                        {CULTURE_LABELS[c] ?? c}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Accès rapide */}
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 }}>
            Accès rapide
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
            {QUICK_ACTIONS.map((action) => (
              <QuickActionCard
                key={action.id}
                action={action}
                onPress={() => router.push(action.route as any)}
              />
            ))}
          </View>

          {/* Alertes */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A' }}>
              Alertes du jour
            </Text>
            <View style={{
              backgroundColor: '#D95C14',
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 3,
            }}>
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                {DASHBOARD_ALERTS.length}
              </Text>
            </View>
          </View>
          {DASHBOARD_ALERTS.map((alert: Alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}

          {/* Prix */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A' }}>
              Prix du jour
            </Text>
            <Pressable onPress={() => router.push('/(app)/(tabs)/marche')}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#2E5C31' }}>
                Voir tout →
              </Text>
            </Pressable>
          </View>

          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            overflow: 'hidden',
            elevation: 3,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            marginBottom: 20,
          }}>
            {topPrices.map((item, index) => (
              <PrixRow key={item.id} item={item} index={index} total={topPrices.length} />
            ))}
          </View>

          {/* Banner saisonnier */}
          <View style={{ borderRadius: 20, overflow: 'hidden', height: 150 }}>
            <Image
              style={{ width: '100%', height: '100%' }}
              source={{ uri: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_c121d376-9618-46ff-bb92-34658316e70a.jpg' }}
              contentFit="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: 16,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                🌾 Saison des pluies 2026
              </Text>
              <Text style={{ color: '#E0E0E0', fontSize: 12, marginTop: 2 }}>
                Période optimale pour les semis de mil et sorgho
              </Text>
            </LinearGradient>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}