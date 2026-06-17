import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MARKET_PRICES, PRICE_HISTORY } from '../../../data/mockData';
import type { MarketPrice } from '../../../types/types';

const MARKETS = ['Tous', 'Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Kaya'];
const CATEGORIES = [
  { key: 'all', label: '🌐 Tout' },
  { key: 'céréale', label: '🌾 Céréales' },
  { key: 'légumineuse', label: '🫘 Légumineuses' },
  { key: 'oléagineux', label: '🥜 Oléagineux' },
  { key: 'maraîcher', label: '🍅 Maraîcher' },
];

const CATEGORY_EMOJIS: Record<string, string> = {
  céréale: '🌾', légumineuse: '🫘', oléagineux: '🥜', maraîcher: '🍅',
};

// ─── Mini graphique barres ─────────────────────────────────────────────────
function MiniChart({ data, color }: { data: number[]; color: string }) {
  const last14 = data.slice(-14);
  const min = Math.min(...last14);
  const max = Math.max(...last14);
  const range = max - min || 1;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 32 }}>
      {last14.map((value, i) => {
        const h = Math.max(4, ((value - min) / range) * 28);
        const isLast = i === last14.length - 1;
        return (
          <View key={i} style={{
            width: 5, height: h, borderRadius: 2,
            backgroundColor: isLast ? color : `${color}55`,
          }} />
        );
      })}
    </View>
  );
}

// ─── Card prix ─────────────────────────────────────────────────────────────
function PriceCard({ item, selectedMarket, onPress }: {
  item: MarketPrice; selectedMarket: string; onPress: () => void;
}) {
  const marketPrices = selectedMarket === 'Tous'
    ? item.prices
    : item.prices.filter((p) => p.market === selectedMarket);
  const displayPrice = marketPrices[0];
  const isPositive = (displayPrice?.variation ?? 0) >= 0;
  const isLargeChange = Math.abs(displayPrice?.variation ?? 0) > 10;
  const chartData = PRICE_HISTORY[item.product];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        opacity: pressed ? 0.92 : 1,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07, shadowRadius: 8,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        {/* Produit */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <View style={{
            width: 48, height: 48, borderRadius: 16,
            backgroundColor: '#F5F2EB',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 24 }}>{CATEGORY_EMOJIS[item.category]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A' }}>
              {item.product}
            </Text>
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>
              Prix au {item.unit}
            </Text>
          </View>
        </View>

        {/* Prix + variation */}
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#1A1A1A' }}>
            {displayPrice?.price ?? '--'}
            <Text style={{ fontSize: 12, fontWeight: '400', color: '#9CA3AF' }}> FCFA</Text>
          </Text>
          {displayPrice && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              backgroundColor: isPositive ? '#F0FDF4' : '#FFF1F2',
              borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4,
              marginTop: 4,
            }}>
              <Ionicons
                name={isPositive ? 'trending-up' : 'trending-down'}
                size={12}
                color={isPositive ? '#16A34A' : '#DC2626'}
              />
              <Text style={{
                fontSize: 11, fontWeight: '700',
                color: isPositive ? '#16A34A' : '#DC2626',
              }}>
                {isPositive ? '+' : ''}{displayPrice.variation}%
              </Text>
              {isLargeChange && (
                <Text style={{ fontSize: 11 }}>{isPositive ? '🔥' : '⚠️'}</Text>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Mini chart */}
      {chartData && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 11, color: '#9CA3AF' }}>14 derniers jours</Text>
          <MiniChart data={chartData} color={isPositive ? '#2E5C31' : '#DC2626'} />
        </View>
      )}
    </Pressable>
  );
}

// ─── Modal détail ──────────────────────────────────────────────────────────
function PriceDetailModal({ item, onClose }: { item: MarketPrice; onClose: () => void }) {
  const bestPrice = [...item.prices].sort((a, b) => b.price - a.price)[0];

  return (
    <View style={{
      position: 'absolute', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end', zIndex: 100,
    }}>
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <View style={{
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        maxHeight: '85%',
      }}>
        {/* Handle */}
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ width: 44, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0' }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Header modal */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <View style={{
              width: 56, height: 56, borderRadius: 18,
              backgroundColor: '#F5F2EB',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 28 }}>{CATEGORY_EMOJIS[item.category]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#1A1A1A' }}>
                {item.product}
              </Text>
              <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                Mis à jour le {item.lastUpdated}
              </Text>
            </View>
          </View>

          {/* Meilleur prix */}
          <View style={{
            backgroundColor: '#E8F5E9', borderRadius: 18, padding: 16,
            marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 12,
          }}>
            <View style={{
              width: 42, height: 42, borderRadius: 14,
              backgroundColor: '#2E5C31', alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="star" size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={{ fontSize: 12, color: '#2E7D32', fontWeight: '600' }}>
                Meilleur prix actuellement
              </Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#1B5E20', marginTop: 2 }}>
                {bestPrice.market} — {bestPrice.price} FCFA/kg
              </Text>
            </View>
          </View>

          {/* Prix par marché */}
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 }}>
            Prix par marché
          </Text>
          {item.prices.map((p, i) => {
            const isPos = p.variation >= 0;
            const isBest = p.market === bestPrice.market;
            return (
              <View key={p.market} style={{
                flexDirection: 'row', alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 14,
                borderBottomWidth: i < item.prices.length - 1 ? 1 : 0,
                borderBottomColor: '#F5F0E8',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{
                    width: 34, height: 34, borderRadius: 10,
                    backgroundColor: isBest ? '#E8F5E9' : '#F5F2EB',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Ionicons name="location" size={16} color={isBest ? '#2E5C31' : '#9CA3AF'} />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: isBest ? '700' : '500', color: '#1A1A1A' }}>
                    {p.market}
                    {isBest ? ' ⭐' : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A' }}>
                    {p.price} FCFA
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: isPos ? '#16A34A' : '#DC2626', marginTop: 1 }}>
                    {isPos ? '↑' : '↓'} {Math.abs(p.variation)}% cette semaine
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Graphique 30 jours */}
          {PRICE_HISTORY[item.product] && (
            <View style={{ marginTop: 20 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 }}>
                Tendance 30 jours
              </Text>
              <View style={{
                backgroundColor: '#F5F2EB', borderRadius: 16, padding: 16,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 90 }}>
                  {PRICE_HISTORY[item.product].map((value, i) => {
                    const data = PRICE_HISTORY[item.product];
                    const min = Math.min(...data);
                    const max = Math.max(...data);
                    const range = max - min || 1;
                    const h = Math.max(6, ((value - min) / range) * 80);
                    const isLast = i === data.length - 1;
                    const trend = item.prices[0].variation >= 0;
                    return (
                      <View key={i} style={{
                        flex: 1, height: h, borderRadius: 3,
                        backgroundColor: isLast
                          ? (trend ? '#2E5C31' : '#DC2626')
                          : (trend ? '#A5D6A7' : '#FFCDD2'),
                      }} />
                    );
                  })}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Il y a 30 jours</Text>
                  <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Aujourd'hui</Text>
                </View>
              </View>
            </View>
          )}

          {/* Bouton fermer */}
          <Pressable
            onPress={onClose}
            style={{
              backgroundColor: '#2E5C31', borderRadius: 18,
              paddingVertical: 16, alignItems: 'center', marginTop: 20,
              elevation: 4, shadowColor: '#2E5C31',
              shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>Fermer</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Screen principal ──────────────────────────────────────────────────────
export default function MarcheScreen() {
  const [selectedMarket, setSelectedMarket] = useState('Tous');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState<MarketPrice | null>(null);

  const filteredPrices = MARKET_PRICES.filter(
    (item) => selectedCategory === 'all' || item.category === selectedCategory
  );

  const hausses = MARKET_PRICES.filter((item) => (item.prices[0]?.variation ?? 0) > 0).length;
  const baisses = MARKET_PRICES.filter((item) => (item.prices[0]?.variation ?? 0) < 0).length;

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F2EB' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A3C28" />
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header */}
        <LinearGradient
          colors={['#1A3C28', '#2E5C31']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800' }}>
                📊 Prix des Marchés
              </Text>
              <Text style={{ color: '#A5D6A7', fontSize: 12, marginTop: 3 }}>
                Mis à jour · 03/06/2026 à 7h00
              </Text>
            </View>
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
              flexDirection: 'row', alignItems: 'center', gap: 6,
            }}>
              <Ionicons name="notifications" size={14} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
                Alertes
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            {[
              { label: 'Hausses', value: `↑ ${hausses}`, color: '#69F0AE' },
              { label: 'Baisses', value: `↓ ${baisses}`, color: '#FFB74D' },
              { label: 'Produits', value: `${MARKET_PRICES.length}`, color: '#FFFFFF' },
              { label: 'Marchés', value: '4', color: '#FFFFFF' },
            ].map((s) => (
              <View key={s.label} style={{
                flex: 1, backgroundColor: 'rgba(255,255,255,0.12)',
                borderRadius: 14, padding: 10, alignItems: 'center',
              }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: s.color }}>
                  {s.value}
                </Text>
                <Text style={{ fontSize: 10, color: '#C8E6C9', marginTop: 2 }}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Filtres marché */}
        <View style={{ backgroundColor: '#FFFFFF', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0EBE0' }}>
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {MARKETS.map((market) => {
              const isSelected = selectedMarket === market;
              return (
                <Pressable
                  key={market}
                  onPress={() => setSelectedMarket(market)}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: isSelected ? '#2E5C31' : '#F5F2EB',
                    borderWidth: 1.5,
                    borderColor: isSelected ? '#2E5C31' : '#E8E3D8',
                  }}
                >
                  <Text style={{
                    fontSize: 13, fontWeight: '600',
                    color: isSelected ? '#FFFFFF' : '#4B5563',
                  }}>
                    {market === 'Tous' ? '📍 Tous' : market}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Filtres catégorie */}
        <View style={{ backgroundColor: '#FFFFFF', paddingBottom: 10 }}>
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => setSelectedCategory(cat.key)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: isSelected ? '#F59E0B' : '#FFF9C4',
                  }}
                >
                  <Text style={{
                    fontSize: 12, fontWeight: '600',
                    color: isSelected ? '#FFFFFF' : '#92400E',
                  }}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Liste */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Alerte sésame */}
          <View style={{
            backgroundColor: '#FFFBEB', borderRadius: 16, padding: 14,
            marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10,
            borderLeftWidth: 4, borderLeftColor: '#F59E0B',
            elevation: 2, shadowColor: '#F59E0B',
            shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 4,
          }}>
            <Text style={{ fontSize: 20 }}>🔥</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#92400E' }}>
                Opportunité de vente
              </Text>
              <Text style={{ fontSize: 12, color: '#92400E', marginTop: 2, lineHeight: 17 }}>
                Sésame +12.5% cette semaine à Ouagadougou — Excellent moment pour vendre !
              </Text>
            </View>
          </View>

          {filteredPrices.map((item) => (
            <PriceCard
              key={item.id}
              item={item}
              selectedMarket={selectedMarket}
              onPress={() => setSelectedItem(item)}
            />
          ))}
        </ScrollView>
      </SafeAreaView>

      {/* Modal */}
      {selectedItem && (
        <PriceDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </View>
  );
}