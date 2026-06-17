import { DISEASES, PESTS } from './mockData';
import type { Disease, Pest } from '../types/types';

// ─── Mapping classes maladies (New Plant Diseases Dataset) → DISEASES locaux ──
export const DISEASE_CLASS_MAP: Record<string, string> = {
  'Corn_(maize)___Common_rust_':                          'Rouille du Maïs',
  'Corn_(maize)___Northern_Leaf_Blight':                  'Helminthosporiose du Mil',
  'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot':   'Helminthosporiose du Mil',
  'Corn_(maize)___healthy':                               '__HEALTHY__',
  'Cotton___diseased':                                    'Anthracnose du Coton',
  'Cotton___healthy':                                     '__HEALTHY__',
  'Tomato___Late_blight':                                 'Mildiou du Sorgho',
  'Tomato___Early_blight':                                'Mildiou du Sorgho',
  'Tomato___healthy':                                     '__HEALTHY__',
};

// ─── Mapping classes ravageurs (Balanced Pest Dataset) → PESTS locaux ─────────
export const PEST_CLASS_MAP: Record<string, string> = {
  'Aphids':      'Puceron du Sorgho',
  'Armyworm':    "Chenille Légionnaire d'Automne",
  'Grasshopper': 'Criquet Pèlerin',
  'Locust':      'Criquet Pèlerin',
  'Whitefly':    'Puceron du Sorgho',
};

// ─── Résout une prédiction IA vers un objet Disease complet ──────────────────
export function resolveDisease(className: string, confidence: number): Disease {
  const mapped = DISEASE_CLASS_MAP[className];

  if (mapped === '__HEALTHY__') {
    return {
      id: 'healthy',
      name: 'Plante saine',
      severity: 'faible',
      description: `Aucune maladie détectée (confiance ${confidence.toFixed(1)}%). Votre plante semble en bonne santé. Continuez la surveillance régulière.`,
      treatments: ['Aucun traitement nécessaire'],
      prevention: [
        'Continuer la surveillance hebdomadaire',
        'Maintenir une fertilisation équilibrée',
        'Assurer un arrosage régulier',
      ],
      affectedCrops: [],
    };
  }

  const found = DISEASES.find((d) => d.name === mapped);
  if (found) return found;

  return {
    id: 'unknown',
    name: className.replace(/_/g, ' ').replace(/-+/g, ' ').trim(),
    severity: confidence > 70 ? 'élevé' : confidence > 40 ? 'modéré' : 'faible',
    description: `Détection IA (confiance ${confidence.toFixed(1)}%). Cette classe n'est pas encore référencée dans notre base locale.`,
    treatments: ['Consultez un agent agricole pour confirmation'],
    prevention: ["Surveillez l'évolution de la plante"],
    affectedCrops: [],
  };
}

// ─── Résout une prédiction IA vers un objet Pest complet ──────────────────────
export function resolvePest(className: string, confidence: number): Pest {
  const mapped = PEST_CLASS_MAP[className];

  const found = PESTS.find((p) => p.name === mapped);
  if (found) return found;

  return {
    id: 'unknown',
    name: className.replace(/_/g, ' ').trim(),
    scientificName: 'Espèce non référencée',
    infectionRate: Math.round(confidence),
    description: `Détection IA (confiance ${confidence.toFixed(1)}%). Ce ravageur n'est pas encore référencé dans notre base locale.`,
    treatments: ['Consultez un agent agricole pour confirmation'],
    prevention: ['Surveillance régulière recommandée'],
  };
}