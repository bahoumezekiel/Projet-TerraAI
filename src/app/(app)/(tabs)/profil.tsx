import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable,
  TextInput, Switch, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DIAGNOSTIC_HISTORY } from '../../../data/mockData';
import { useUserProfile } from '../../../hooks/useUserProfile';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ALL_CROPS = ['mil', 'sorgho', 'mais', 'coton', 'sesame', 'niebe', 'arachide', 'riz'];
const CROP_LABELS: Record<string, string> = {
  mil: 'Mil', sorgho: 'Sorgho', mais: 'Maïs', riz: 'Riz',
  niebe: 'Niébé', arachide: 'Arachide', soja: 'Soja',
  sesame: 'Sésame', coton: 'Coton',
  tomate: 'Tomate', oignon: 'Oignon', gombo: 'Gombo',
};
const CROP_EMOJIS: Record<string, string> = {
  mil: '🌾', sorgho: '🌾', mais: '🌽', riz: '🌾',
  niebe: '🫘', arachide: '🥜', soja: '🫘',
  sesame: '🌱', coton: '🌿',
  tomate: '🍅', oignon: '🧅', gombo: '🌿',
};

const KPI_DATA = [
  { label: 'Diagnostics',     value: '12', icon: '🌿', color: '#2E5C31', bg: '#E8F5E9' },
  { label: 'Scans',           value: '7',  icon: '🐛', color: '#D95C14', bg: '#FFF3E0' },
  { label: 'Questions IA',    value: '34', icon: '💬', color: '#1565C0', bg: '#E3F2FD' },
  { label: 'Alertes',         value: '18', icon: '🔔', color: '#6A1B9A', bg: '#F3E5F5' },
];

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

type TabType = 'profil' | 'activite' | 'parametres';

function getInitiale(nom: string | null): string {
  if (!nom) return '?';
  return nom.charAt(0).toUpperCase();
}

export default function ProfilScreen() {
  const { profile, loading } = useUserProfile();
  const [activeTab, setActiveTab] = useState<TabType>('profil');
  const [isEditing, setIsEditing] = useState(false);
  const [editNom, setEditNom] = useState('');
  const [editTel, setEditTel] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [offlineMode, setOfflineMode] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const startEditing = () => {
    setEditNom(profile.nom ?? '');
    setEditTel(profile.telephone ?? '');
    setIsEditing(true);
  };

  const saveEdits = async () => {
    await AsyncStorage.multiSet([
      ['user_nom', editNom.trim()],
      ['user_telephone', editTel.trim()],
    ]);
    setIsEditing(false);
  };

  const resetOnboarding = async () => {
    await AsyncStorage.multiRemove([
      'onboarding_done', 'langue', 'region',
      'cultures', 'user_nom', 'user_telephone', 'user_superficie',
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F2EB' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A3C28" />
      <SafeAreaView style={{ flex: 1 }}>

        {/* ── Header ── */}
        <LinearGradient
          colors={['#1A3C28', '#2E5C31']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {/* Avatar initiale */}
            <View style={{
              width: 64, height: 64, borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#FFFFFF' }}>
                {getInitiale(profile.nom)}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800' }}>
                {profile.nom ?? 'Agriculteur'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                <Ionicons name="location" size={12} color="#A5D6A7" />
                <Text style={{ color: '#A5D6A7', fontSize: 12 }}>
                  {profile.regionLabel ?? 'Burkina Faso'}
                  {profile.superficie ? ` · ${profile.superficie}` : ''}
                </Text>
              </View>
              {profile.telephone && (
                <Text style={{ color: '#C8E6C9', fontSize: 11, marginTop: 2 }}>
                  {profile.telephone}
                </Text>
              )}
            </View>

            {/* Bouton modifier */}
            {activeTab === 'profil' && !isEditing && (
              <Pressable
                onPress={startEditing}
                style={{
                  width: 38, height: 38, borderRadius: 12,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name="pencil" size={16} color="#FFFFFF" />
              </Pressable>
            )}
          </View>

          {/* KPIs */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            {KPI_DATA.map((kpi) => (
              <View key={kpi.label} style={{
                flex: 1, backgroundColor: 'rgba(255,255,255,0.12)',
                borderRadius: 14, padding: 10, alignItems: 'center',
              }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>
                  {kpi.value}
                </Text>
                <Text style={{ fontSize: 10, color: '#C8E6C9', marginTop: 2, textAlign: 'center' }}>
                  {kpi.icon} {kpi.label}
                </Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── Onglets ── */}
        <View style={{
          flexDirection: 'row', backgroundColor: '#FFFFFF',
          borderBottomWidth: 1, borderBottomColor: '#F0EBE0',
        }}>
          {[
            { key: 'profil', label: 'Profil', icon: 'person' },
            { key: 'activite', label: 'Activité', icon: 'time' },
            { key: 'parametres', label: 'Paramètres', icon: 'settings' },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => { setActiveTab(tab.key as TabType); setIsEditing(false); }}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center',
                  justifyContent: 'center', gap: 5, paddingVertical: 14,
                  borderBottomWidth: isActive ? 2.5 : 0,
                  borderBottomColor: '#2E5C31',
                }}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={15}
                  color={isActive ? '#2E5C31' : '#9CA3AF'}
                />
                <Text style={{
                  fontSize: 13, fontWeight: '700',
                  color: isActive ? '#2E5C31' : '#9CA3AF',
                }}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >

          {/* ════ ONGLET PROFIL ════ */}
          {activeTab === 'profil' && !isEditing && (
            <View>
              {/* Infos personnelles */}
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 }}>
                Informations personnelles
              </Text>
              <View style={{
                backgroundColor: '#FFFFFF', borderRadius: 20, overflow: 'hidden',
                marginBottom: 20, elevation: 3, shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8,
              }}>
                {[
                  { icon: 'person', label: 'Nom complet', value: profile.nom ?? '—' },
                  { icon: 'call', label: 'Téléphone', value: profile.telephone ?? '—' },
                  { icon: 'map', label: 'Région', value: profile.regionLabel ?? '—' },
                  { icon: 'resize', label: 'Superficie', value: profile.superficie ?? '—' },
                  { icon: 'language', label: 'Langue', value: profile.langue === 'moore' ? 'Mooré 🇧🇫' : 'Français 🇫🇷' },
                ].map((field, i, arr) => (
                  <View key={field.label} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 14,
                    paddingHorizontal: 16, paddingVertical: 14,
                    borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                    borderBottomColor: '#F5F0E8',
                  }}>
                    <View style={{
                      width: 36, height: 36, borderRadius: 12,
                      backgroundColor: '#E8F5E9',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Ionicons name={field.icon as any} size={17} color="#2E5C31" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>
                        {field.label}
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A' }}>
                        {field.value}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Mes cultures */}
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 }}>
                🌱 Mes cultures
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                {profile.cultures.length > 0 ? profile.cultures.map((c) => (
                  <View key={c} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    backgroundColor: '#FFFFFF', borderRadius: 20,
                    paddingHorizontal: 14, paddingVertical: 8,
                    borderWidth: 1.5, borderColor: '#A5D6A7',
                    elevation: 2, shadowColor: '#2E5C31',
                    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3,
                  }}>
                    <Text style={{ fontSize: 16 }}>{CROP_EMOJIS[c] ?? '🌿'}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#2E5C31' }}>
                      {CROP_LABELS[c] ?? c}
                    </Text>
                  </View>
                )) : (
                  <Text style={{ fontSize: 13, color: '#9CA3AF' }}>
                    Aucune culture sélectionnée
                  </Text>
                )}
              </View>

              {/* Statistiques */}
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 }}>
                📊 Mes statistiques
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {KPI_DATA.map((kpi) => (
                  <View key={kpi.label} style={{
                    width: '47%', backgroundColor: kpi.bg,
                    borderRadius: 20, padding: 16, alignItems: 'center',
                    elevation: 2, shadowColor: kpi.color,
                    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6,
                  }}>
                    <Text style={{ fontSize: 28 }}>{kpi.icon}</Text>
                    <Text style={{ fontSize: 28, fontWeight: '800', color: kpi.color, marginTop: 4 }}>
                      {kpi.value}
                    </Text>
                    <Text style={{ fontSize: 12, color: kpi.color, opacity: 0.75, marginTop: 2 }}>
                      {kpi.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ════ ÉDITION ════ */}
          {activeTab === 'profil' && isEditing && (
            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 }}>
                ✏️ Modifier le profil
              </Text>

              <View style={{
                backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, marginBottom: 16,
                elevation: 3, shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8,
              }}>
                {[
                  { key: 'nom', label: 'Nom complet', value: editNom, setter: setEditNom, placeholder: 'Votre nom' },
                  { key: 'tel', label: 'Téléphone', value: editTel, setter: setEditTel, placeholder: '+226 XX XX XX XX' },
                ].map((field) => (
                  <View key={field.key} style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {field.label}
                    </Text>
                    <TextInput
                      value={field.value}
                      onChangeText={field.setter}
                      placeholder={field.placeholder}
                      placeholderTextColor="#C4C4C4"
                      style={{
                        backgroundColor: '#F5F2EB',
                        borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                        fontSize: 15, color: '#1A1A1A',
                        borderWidth: 1.5,
                        borderColor: field.value ? '#2E5C31' : '#E8E3D8',
                      }}
                    />
                  </View>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable
                  onPress={() => setIsEditing(false)}
                  style={{
                    flex: 1, borderRadius: 16, paddingVertical: 16,
                    alignItems: 'center', borderWidth: 2, borderColor: '#E8E3D8',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <Text style={{ fontWeight: '700', color: '#6B7280', fontSize: 15 }}>Annuler</Text>
                </Pressable>
                <Pressable
                  onPress={saveEdits}
                  style={{
                    flex: 1, borderRadius: 16, paddingVertical: 16,
                    alignItems: 'center', backgroundColor: '#2E5C31',
                    elevation: 4, shadowColor: '#2E5C31',
                    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6,
                  }}
                >
                  <Text style={{ fontWeight: '700', color: '#FFFFFF', fontSize: 15 }}>Enregistrer</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ════ ONGLET ACTIVITÉ ════ */}
          {activeTab === 'activite' && (
            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 }}>
                Historique des activités
              </Text>

              {/* Diagnostics récents */}
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#9CA3AF', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Diagnostics récents
              </Text>
              {DIAGNOSTIC_HISTORY.map((item) => {
                const date = new Date(item.date);
                const severityColor = item.disease.severity === 'élevé' ? '#DC2626'
                  : item.disease.severity === 'modéré' ? '#D97706' : '#16A34A';
                return (
                  <View key={item.id} style={{
                    backgroundColor: '#FFFFFF', borderRadius: 18, overflow: 'hidden',
                    marginBottom: 12, flexDirection: 'row',
                    elevation: 3, shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6,
                  }}>
                    <Image
                      style={{ width: 90, height: 90 }}
                      source={{ uri: item.imageUri }}
                      contentFit="cover"
                    />
                    <View style={{ width: 4, backgroundColor: severityColor }} />
                    <View style={{ flex: 1, padding: 12, justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }} numberOfLines={1}>
                        {item.disease.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>{item.cropType}</Text>
                      <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                        {date.getDate()} {MONTHS[date.getMonth()]} {date.getFullYear()}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* Timeline */}
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#9CA3AF', marginTop: 8, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Chronologie
              </Text>
              {[
                { time: "Aujourd'hui 08:12", action: 'Diagnostic maladie — Sorgho',     icon: '🌿', color: '#2E5C31' },
                { time: 'Hier 15:34',        action: 'Question IA sur les prix',         icon: '💬', color: '#1565C0' },
                { time: '01/06 09:00',       action: 'Scan ravageurs — Champ maïs',      icon: '🐛', color: '#D95C14' },
                { time: '30/05 11:22',       action: 'Consultation calendrier agricole', icon: '📅', color: '#6A1B9A' },
                { time: '28/05 16:45',       action: 'Diagnostic maladie — Sorgho',      icon: '🌿', color: '#2E5C31' },
              ].map((act, i, arr) => (
                <View key={i} style={{ flexDirection: 'row', gap: 14, marginBottom: 4 }}>
                  {/* Icône + ligne */}
                  <View style={{ alignItems: 'center', width: 40 }}>
                    <View style={{
                      width: 40, height: 40, borderRadius: 14,
                      backgroundColor: `${act.color}15`,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 18 }}>{act.icon}</Text>
                    </View>
                    {i < arr.length - 1 && (
                      <View style={{ width: 2, flex: 1, backgroundColor: '#E8E3D8', marginTop: 4, marginBottom: 4, minHeight: 20 }} />
                    )}
                  </View>
                  {/* Contenu */}
                  <View style={{ flex: 1, paddingTop: 8, paddingBottom: 20 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A' }}>
                      {act.action}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>
                      {act.time}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ════ ONGLET PARAMÈTRES ════ */}
          {activeTab === 'parametres' && (
            <View>
              {/* Préférences */}
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 }}>
                Préférences
              </Text>
              <View style={{
                backgroundColor: '#FFFFFF', borderRadius: 20, overflow: 'hidden',
                marginBottom: 20, elevation: 3, shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8,
              }}>
                {[
                  { icon: 'notifications', label: 'Notifications', desc: 'Alertes ravageurs, prix et météo', value: notifications, setter: setNotifications, color: '#6A1B9A' },
                  { icon: 'cloud-offline', label: 'Mode hors ligne', desc: 'Fonctionnalités sans connexion', value: offlineMode, setter: setOfflineMode, color: '#2E5C31' },
                  { icon: 'moon', label: 'Mode sombre', desc: 'Économise la batterie', value: darkMode, setter: setDarkMode, color: '#1565C0' },
                ].map((s, i, arr) => (
                  <View key={s.label} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 14,
                    paddingHorizontal: 16, paddingVertical: 14,
                    borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                    borderBottomColor: '#F5F0E8',
                  }}>
                    <View style={{
                      width: 38, height: 38, borderRadius: 12,
                      backgroundColor: `${s.color}15`,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Ionicons name={s.icon as any} size={18} color={s.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A' }}>{s.label}</Text>
                      <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>{s.desc}</Text>
                    </View>
                    <Switch
                      value={s.value}
                      onValueChange={s.setter}
                      trackColor={{ false: '#E0E0E0', true: '#A5D6A7' }}
                      thumbColor={s.value ? '#2E5C31' : '#9CA3AF'}
                    />
                  </View>
                ))}
              </View>

              {/* Langue */}
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 }}>
                Langue de l'interface
              </Text>
              <View style={{
                backgroundColor: '#FFFFFF', borderRadius: 20, overflow: 'hidden',
                marginBottom: 20, elevation: 3, shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8,
              }}>
                {[
                  { flag: '🇫🇷', lang: 'Français', code: 'fr' },
                  { flag: '🇧🇫', lang: 'Mooré', code: 'moore' },
                ].map((l, i, arr) => {
                  const isSelected = profile.langue === l.code;
                  return (
                    <View key={l.lang} style={{
                      flexDirection: 'row', alignItems: 'center', gap: 14,
                      paddingHorizontal: 16, paddingVertical: 14,
                      borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                      borderBottomColor: '#F5F0E8',
                      backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                    }}>
                      <Text style={{ fontSize: 24 }}>{l.flag}</Text>
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#1A1A1A' }}>
                        {l.lang}
                      </Text>
                      {isSelected && (
                        <View style={{
                          width: 28, height: 28, borderRadius: 10,
                          backgroundColor: '#2E5C31',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Refaire l'onboarding */}
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 }}>
                Configuration
              </Text>
              <Pressable
                onPress={resetOnboarding}
                style={{
                  backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16,
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  marginBottom: 20, elevation: 2, shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
                  borderWidth: 1.5, borderColor: '#E8E3D8',
                }}
              >
                <View style={{
                  width: 38, height: 38, borderRadius: 12,
                  backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="refresh-circle" size={20} color="#D95C14" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A' }}>
                    Refaire la configuration
                  </Text>
                  <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>
                    Changer langue, région ou cultures
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
              </Pressable>

              {/* À propos */}
              <LinearGradient
                colors={['#E8F5E9', '#F0FDF4']}
                style={{ borderRadius: 20, padding: 20, marginBottom: 8 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <Text style={{ fontSize: 28 }}>🌍</Text>
                  <View>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#2E5C31' }}>TerraAI</Text>
                    <Text style={{ fontSize: 11, color: '#4CAF50', marginTop: 1 }}>Version prototype 1.0</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 13, color: '#4B5563', lineHeight: 20, marginBottom: 14 }}>
                  Plateforme intelligente d'assistance agricole pour les agriculteurs du Burkina Faso. Combine IA, vision par ordinateur et Agentic AI.
                </Text>
                {[
                  { icon: 'mail', text: 'bahoumzekiel70@gmail.com' },
                  { icon: 'trophy', text: 'Candidat STIC\'26 — Sahal Tech Innovation Challenge' },
                  { icon: 'calendar', text: 'Juin 2026' },
                ].map((info) => (
                  <View key={info.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Ionicons name={info.icon as any} size={13} color="#2E5C31" />
                    <Text style={{ fontSize: 12, color: '#2E5C31', flex: 1 }}>{info.text}</Text>
                  </View>
                ))}
              </LinearGradient>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}