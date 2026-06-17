import type { Disease, Pest, DiagnosticHistory, MarketPrice, UserProfile, CropCalendar } from '../types/types';
// Données météo
export const WEATHER_DATA = {
  city: 'Ouagadougou',
  temperature: 34,
  condition: 'Partiellement nuageux',
  humidity: 58,
  icon: '⛅',
  forecast: [
    { day: 'Lun', min: 28, max: 35, icon: '☀️' },
    { day: 'Mar', min: 27, max: 34, icon: '⛅' },
    { day: 'Mer', min: 24, max: 31, icon: '🌧️' },
    { day: 'Jeu', min: 23, max: 29, icon: '🌧️' },
    { day: 'Ven', min: 26, max: 34, icon: '☀️' },
  ],
};

// Maladies agricoles
export const DISEASES: Disease[] = [
  {
    id: '1',
    name: 'Mildiou du Sorgho',
    severity: 'élevé',
    description: 'Maladie fongique causée par Peronosclerospora sorghi. Les symptômes incluent des stries jaunes sur les feuilles, un aspect filandreux et une poudre blanche. Peut causer des pertes de rendement allant jusqu\'à 80%.',
    treatments: [
      'Fongicide systémique (Ridamil 2g/L d\'eau)',
      'Application de Mancozèbe 3g/L',
      'Retrait des plantes infectées',
    ],
    prevention: [
      'Rotation des cultures (sorgho-légumineuse)',
      'Éviter l\'irrigation excessive',
      'Désinfection des outils agricoles',
    ],
    affectedCrops: ['Sorgho', 'Maïs', 'Mil'],
  },
  {
    id: '2',
    name: 'Rouille du Maïs',
    severity: 'modéré',
    description: 'Causée par Puccinia polysora. Pustules orangées à brunâtres sur les feuilles, entraînant une réduction du rendement de 10 à 40%.',
    treatments: [
      'Fongicide triazole (tébuconazole 250g/L) à 0.5L/ha',
      'Application de mancozèbe en début d\'infection',
      'Réduire la densité de semis',
    ],
    prevention: [
      'Semis précoce avant la saison des pluies',
      'Variétés tolérantes (SAMAZ, Espoir)',
      'Éviter l\'excès d\'azote',
    ],
    affectedCrops: ['Maïs'],
  },
  {
    id: '3',
    name: 'Anthracnose du Coton',
    severity: 'faible',
    description: 'Maladie causée par Colletotrichum gossypii. Taches brunes sur les capsules et les tiges, réduisant la qualité de la fibre.',
    treatments: [
      'Traitement cuprique (oxychlorure de cuivre 3g/L)',
      'Retrait des capsules infectées',
      'Application de fongicides systémiques',
    ],
    prevention: [
      'Semences certifiées et traitées',
      'Bonne aération entre les plants',
      'Irrigation contrôlée',
    ],
    affectedCrops: ['Coton'],
  },
  {
    id: '4',
    name: 'Helminthosporiose du Mil',
    severity: 'élevé',
    description: 'Maladie foliaire grave causée par Exserohilum turcicum. Taches allongées grisâtres à brunes sur les feuilles, pouvant détruire toute la récolte.',
    treatments: [
      'Fongicide à base de propiconazole',
      'Application de carbendazime',
      'Élimination des résidus de culture',
    ],
    prevention: [
      'Variétés résistantes locales',
      'Éviter la culture continue',
      'Fertilisation équilibrée NPK',
    ],
    affectedCrops: ['Mil', 'Sorgho'],
  },
];

// Ravageurs agricoles
export const PESTS: Pest[] = [
  {
    id: '1',
    name: 'Chenille Légionnaire d\'Automne',
    scientificName: 'Spodoptera frugiperda',
    infectionRate: 67,
    description: 'Ravageur invasif d\'origine américaine. Les larves dévorent les feuilles du maïs et du sorgho, pouvant détruire une récolte entière.',
    treatments: [
      'Insecticide Emamectin benzoate (20g/ha)',
      'Lambda-cyhalothrine (15-30mL/ha)',
      'Lutte biologique avec Bacillus thuringiensis',
      'Collecte manuelle des larves tôt le matin',
    ],
    prevention: [
      'Surveillance hebdomadaire des cultures',
      'Pièges à phéromones pour détection précoce',
      'Semis précoce avant le pic d\'infestation',
      'Plantes compagnons (repoussent l\'insecte)',
    ],
  },
  {
    id: '2',
    name: 'Criquet Pèlerin',
    scientificName: 'Schistocerca gregaria',
    infectionRate: 85,
    description: 'Insecte migrateur pouvant former des essaims de milliards d\'individus. Un essaim peut consommer 100% des cultures en quelques heures.',
    treatments: [
      'Insecticide organophosphoré (malathion ULV)',
      'Fipronil (aérien ou terrestre)',
      'Coordination avec le CLCPRO pour traitement collectif',
    ],
    prevention: [
      'Surveillance CLCPRO et alertes nationales',
      'Traitement préventif des zones de reproduction',
      'Signalement immédiat aux autorités',
    ],
  },
  {
    id: '3',
    name: 'Puceron du Sorgho',
    scientificName: 'Melanaphis sacchari',
    infectionRate: 34,
    description: 'Insecte suceur qui se nourrit de la sève des plantes. Cause le jaunissement, le rabougrissement et peut transmettre des virus.',
    treatments: [
      'Imidaclopride (spray foliaire dilué)',
      'Savon insecticide naturel (2%)',
      'Prédateurs naturels: coccinelles, chrysopes',
    ],
    prevention: [
      'Éviter l\'excès d\'azote',
      'Espacement adéquat pour la ventilation',
      'Favoriser les ennemis naturels',
    ],
  },
];

// Historique des diagnostics
export const DIAGNOSTIC_HISTORY: DiagnosticHistory[] = [
  {
    id: '1',
    date: '2026-05-28',
    imageUri: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_c0006b1c-4ee3-4c4c-9b54-d17cfc05765d.jpg',
    disease: DISEASES[0],
    cropType: 'Sorgho',
  },
  {
    id: '2',
    date: '2026-05-22',
    imageUri: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_c121d376-9618-46ff-bb92-34658316e70a.jpg',
    disease: DISEASES[2],
    cropType: 'Coton',
  },
  {
    id: '3',
    date: '2026-05-15',
    imageUri: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_fc37e60b-957b-4b14-a5b8-e9ce73a6c999.jpg',
    disease: DISEASES[1],
    cropType: 'Maïs',
  },
];

// Prix des marchés agricoles
export const MARKET_PRICES: MarketPrice[] = [
  {
    id: '1',
    product: 'Maïs',
    unit: 'kg',
    category: 'céréale',
    prices: [
      { market: 'Ouagadougou', price: 185, variation: 3.2 },
      { market: 'Bobo-Dioulasso', price: 170, variation: -1.5 },
      { market: 'Koudougou', price: 175, variation: 0.8 },
      { market: 'Kaya', price: 190, variation: 5.1 },
    ],
    lastUpdated: '2026-06-03',
  },
  {
    id: '2',
    product: 'Sorgho',
    unit: 'kg',
    category: 'céréale',
    prices: [
      { market: 'Ouagadougou', price: 160, variation: 1.3 },
      { market: 'Bobo-Dioulasso', price: 148, variation: -2.0 },
      { market: 'Koudougou', price: 155, variation: 0.5 },
      { market: 'Kaya', price: 165, variation: 2.8 },
    ],
    lastUpdated: '2026-06-03',
  },
  {
    id: '3',
    product: 'Mil',
    unit: 'kg',
    category: 'céréale',
    prices: [
      { market: 'Ouagadougou', price: 195, variation: 6.5 },
      { market: 'Bobo-Dioulasso', price: 180, variation: 2.1 },
      { market: 'Koudougou', price: 188, variation: 4.2 },
      { market: 'Kaya', price: 200, variation: 8.3 },
    ],
    lastUpdated: '2026-06-03',
  },
  {
    id: '4',
    product: 'Niébé (haricot)',
    unit: 'kg',
    category: 'légumineuse',
    prices: [
      { market: 'Ouagadougou', price: 480, variation: -3.1 },
      { market: 'Bobo-Dioulasso', price: 450, variation: -4.5 },
      { market: 'Koudougou', price: 465, variation: -2.0 },
      { market: 'Kaya', price: 495, variation: -1.5 },
    ],
    lastUpdated: '2026-06-03',
  },
  {
    id: '5',
    product: 'Sésame',
    unit: 'kg',
    category: 'oléagineux',
    prices: [
      { market: 'Ouagadougou', price: 650, variation: 12.5 },
      { market: 'Bobo-Dioulasso', price: 620, variation: 10.2 },
      { market: 'Koudougou', price: 635, variation: 11.0 },
      { market: 'Kaya', price: 660, variation: 13.8 },
    ],
    lastUpdated: '2026-06-03',
  },
  {
    id: '6',
    product: 'Coton graine',
    unit: 'kg',
    category: 'oléagineux',
    prices: [
      { market: 'Ouagadougou', price: 275, variation: 0 },
      { market: 'Bobo-Dioulasso', price: 275, variation: 0 },
      { market: 'Koudougou', price: 275, variation: 0 },
      { market: 'Kaya', price: 275, variation: 0 },
    ],
    lastUpdated: '2026-06-03',
  },
  {
    id: '7',
    product: 'Tomate',
    unit: 'kg',
    category: 'maraîcher',
    prices: [
      { market: 'Ouagadougou', price: 350, variation: -8.2 },
      { market: 'Bobo-Dioulasso', price: 310, variation: -9.5 },
      { market: 'Koudougou', price: 330, variation: -7.0 },
      { market: 'Kaya', price: 360, variation: -6.5 },
    ],
    lastUpdated: '2026-06-03',
  },
  {
    id: '8',
    product: 'Oignon',
    unit: 'kg',
    category: 'maraîcher',
    prices: [
      { market: 'Ouagadougou', price: 280, variation: 4.8 },
      { market: 'Bobo-Dioulasso', price: 260, variation: 3.2 },
      { market: 'Koudougou', price: 270, variation: 3.9 },
      { market: 'Kaya', price: 290, variation: 5.5 },
    ],
    lastUpdated: '2026-06-03',
  },
];

// Données historiques pour graphiques
export const PRICE_HISTORY: Record<string, number[]> = {
  Maïs: [172, 174, 175, 173, 176, 178, 180, 179, 181, 182, 180, 183, 184, 182, 183, 185, 184, 186, 185, 183, 184, 185, 184, 183, 185, 184, 185, 186, 185, 185],
  Sorgho: [155, 157, 156, 158, 157, 158, 159, 160, 159, 158, 159, 160, 159, 160, 161, 160, 158, 159, 160, 161, 160, 159, 160, 161, 160, 158, 159, 160, 160, 160],
  Mil: [178, 179, 180, 182, 183, 184, 183, 185, 186, 185, 187, 188, 186, 187, 188, 190, 189, 191, 192, 191, 192, 193, 192, 194, 193, 194, 195, 195, 194, 195],
  Sésame: [560, 565, 568, 570, 575, 578, 582, 585, 588, 590, 595, 598, 600, 605, 608, 612, 615, 618, 620, 624, 628, 630, 635, 638, 640, 643, 645, 648, 650, 650],
};

// Calendrier agricole
export const CROP_CALENDAR: CropCalendar[] = [
  {
    id: '1',
    crop: 'Mil',
    emoji: '🌾',
    color: '#F59E0B',
    sowing: { start: 6, end: 7 },
    growing: { start: 7, end: 10 },
    harvest: { start: 10, end: 11 },
    tips: [
      'Semer après les premières pluies significatives (>20mm)',
      'Espacement recommandé: 0.8m x 0.4m',
      'Apporter de l\'urée à la levée (25kg/ha)',
      'Désherbage 3 semaines après semis',
    ],
  },
  {
    id: '2',
    crop: 'Sorgho',
    emoji: '🌾',
    color: '#10B981',
    sowing: { start: 6, end: 8 },
    growing: { start: 7, end: 11 },
    harvest: { start: 11, end: 12 },
    tips: [
      'Semis possible jusqu\'en août avec irrigation',
      'Tolérant à la sécheresse: idéal pour zones sahéliennes',
      'Phosphate naturel recommandé (100kg/ha)',
      'Surveiller le mildiou en début de croissance',
    ],
  },
  {
    id: '3',
    crop: 'Maïs',
    emoji: '🌽',
    color: '#FBBF24',
    sowing: { start: 5, end: 7 },
    growing: { start: 6, end: 9 },
    harvest: { start: 9, end: 10 },
    tips: [
      'Variétés recommandées: SAMAZ, Espoir, CMS 8501',
      'Besoin en eau: 500-800mm par cycle',
      'Fertilisation NPK 14-23-14 au semis (150kg/ha)',
      'Protection contre la chenille légionnaire obligatoire',
    ],
  },
  {
    id: '4',
    crop: 'Coton',
    emoji: '🌿',
    color: '#E5E7EB',
    sowing: { start: 5, end: 6 },
    growing: { start: 6, end: 11 },
    harvest: { start: 11, end: 1 },
    tips: [
      'Traitement obligatoire des semences (délai)',
      'Programme de traitement insecticide SOPITEX',
      'Ne pas dépasser 2 récoltes par saison',
      'Rotation avec légumineuses recommandée',
    ],
  },
  {
    id: '5',
    crop: 'Sésame',
    emoji: '🌱',
    color: '#8B5CF6',
    sowing: { start: 6, end: 7 },
    growing: { start: 7, end: 10 },
    harvest: { start: 10, end: 11 },
    tips: [
      'Culture à haute valeur économique (export)',
      'Sol bien drainé indispensable',
      'Semis en ligne à 40cm d\'espacement',
      'Récolte avant complète maturité (capsules)',
    ],
  },
];

// Alertes du tableau de bord
export const DASHBOARD_ALERTS = [
  {
    id: '1',
    type: 'warning' as const,
    icon: '🐛',
    title: 'Alerte Ravageurs',
    message: 'Chenilles légionnaires signalées dans la région Centre. Vérifiez vos champs de maïs.',
    time: 'Il y a 2h',
  },
  {
    id: '2',
    type: 'info' as const,
    icon: '☔',
    title: 'Pluies prévues',
    message: 'Précipitations de 25-35mm attendues mercredi-jeudi. Bon pour le semis du mil.',
    time: 'Il y a 4h',
  },
  {
    id: '3',
    type: 'success' as const,
    icon: '📈',
    title: 'Hausse du sésame',
    message: 'Le prix du sésame a augmenté de +12.5% cette semaine à Ouagadougou.',
    time: 'Aujourd\'hui',
  },
];

// Profil utilisateur par défaut
export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Moussa Kabaré',
  phone: '+226 70 12 34 56',
  region: 'Centre-Nord',
  village: 'Boulsa',
  crops: ['Mil', 'Sorgho', 'Niébé'],
  surface: '5 hectares',
  memberSince: 'Mars 2026',
};

// Réponses de l'assistant IA
export const AI_RESPONSES: Record<string, string> = {
  default: `Bonjour ! Je suis TerraAI, votre assistant agricole intelligent. Je suis là pour vous aider avec :

🌾 **Conseils de semis** adaptés à votre région
☁️ **Prévisions météo** et recommandations
📊 **Prix des marchés** en temps réel
🐛 **Maladies et ravageurs** - conseils de traitement
📅 **Calendrier agricole** personnalisé

Que puis-je faire pour vous aujourd'hui ?`,

  semis: `Pour la saison des pluies 2026 dans la région Centre-Nord, voici mes recommandations de semis :

**🌾 Mil (priorité haute) :**
- Semis optimal : 15 juin - 15 juillet
- Attendez des pluies > 20mm sur 3 jours consécutifs
- Variétés recommandées : IKMP-5, HKP

**🌾 Sorgho :**
- Semis possible jusqu'au 5 août
- Tolérant à la sécheresse, idéal après le mil

**🌽 Maïs :**
- Déjà en retard ! Semez avant le 10 juin
- Variété SAMAZ avec fertilisation NPK

Les prévisions indiquent des pluies mercredi - profitez-en !`,

  meteo: `**Météo Ouagadougou - Semaine en cours**

**Aujourd'hui : 34°C | Partiellement nuageux | Humidité 58%
Demain : 35°C | Ensoleillé
Mercredi : 31°C | Pluies 25-35mm
Jeudi : 29°C | Pluies légères 10-15mm
Vendredi : 34°C | Ensoleillé**

**Conseils basés sur la météo :**
- Profitez des pluies de mercredi pour les semis de mil
- Préparez vos champs dès aujourd'hui
- Vérifiez le drainage avant les fortes pluies`,

  prix: `**Prix des marchés - Ouagadougou (03/06/2026)**

| Produit | Prix/kg | Tendance |
|---------|---------|----------|
| Maïs | 185 FCFA | +3.2% |
| Sorgho | 160 FCFA | +1.3% |
| Mil | 195 FCFA | +6.5% |
| Sésame | 650 FCFA | +12.5% |
| Niébé | 480 FCFA | -3.1% |

**Conseil de vente :** Le sésame est au plus haut de la saison - c'est un bon moment pour vendre !
Meilleurs prix actuels à **Kaya** pour le mil et le maïs.`,

  maladie: `**Diagnostic et Prévention des Maladies**

Les maladies les plus fréquentes actuellement dans votre région :

**1. Mildiou du Sorgho** (risque élevé cette saison)
- Symptômes : stries jaunes sur feuilles, poudre blanche
- Traitement : Ridamil 2g/L ou Mancozèbe
- Prévention : variétés IRAT 204/208

**2. Chenille Légionnaire** (alerte active !)
- Signalée dans 3 villages voisins
- Vérifiez vos champs de maïs quotidiennement
- Traitement : Emamectin benzoate si larves > 1/plant

Utilisez l'outil **Diagnostic Photo** pour analyser votre plante et obtenir un diagnostic précis !`,

  engrais: `**Guide de Fertilisation pour la Saison 2026**

**Pour le Maïs :**
- Semis : NPK 14-23-14 → 150 kg/ha
- 21 jours après levée : Urée → 50 kg/ha
- 45 jours : Urée → 50 kg/ha

**Pour le Mil :**
- Semis : DAP (phosphate) → 50 kg/ha
- Levée : Urée → 25 kg/ha
- Réduire de 30% en année sèche

**Pour le Sorgho :**
- NPK 15-15-15 → 100 kg/ha au semis
- Complémenter avec urée si sol pauvre

Prix actuels engrais à Ouagadougou :
- Urée : 380 FCFA/kg
- NPK : 420 FCFA/kg
- DAP : 390 FCFA/kg`,
};

export const QUICK_QUESTIONS = [
  { id: '1', text: '🌾 Quand semer le mil ?', key: 'semis' },
  { id: '2', text: '☁️ Météo cette semaine', key: 'meteo' },
  { id: '3', text: '💰 Prix du marché', key: 'prix' },
  { id: '4', text: '🐛 Maladies courantes', key: 'maladie' },
  { id: '5', text: '🌱 Conseils engrais', key: 'engrais' },
];