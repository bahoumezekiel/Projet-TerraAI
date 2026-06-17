import { useState, useCallback } from 'react';
import { predictDisease, predictPest, checkBackendHealth } from '../services/api';
import { resolveDisease, resolvePest } from '../data/aiMapping';
import { DISEASES, PESTS } from '../data/mockData';
import type { Disease, Pest } from '../types/types';

type DiagnosticState<T> = {
  result: T | null;
  loading: boolean;
  isMock: boolean;
  confidence: number | null;
  error: string | null;
};

export function useDiseaseDiagnostic() {
  const [state, setState] = useState<DiagnosticState<Disease>>({
    result: null, loading: false, isMock: false, confidence: null, error: null,
  });

  const analyze = useCallback(async (imageUri: string) => {
    setState({ result: null, loading: true, isMock: false, confidence: null, error: null });

    console.log('[TerraAI][Disease] ── Démarrage analyse ──');
    console.log('[TerraAI][Disease] Image URI:', imageUri);

    try {
      console.log('[TerraAI][Disease] Vérification backend...');
      const online = await checkBackendHealth();
      console.log('[TerraAI][Disease] Backend online:', online);

      if (online) {
        console.log('[TerraAI][Disease] Envoi image au modèle IA...');
        const res = await predictDisease(imageUri);
        console.log('[TerraAI][Disease] ✅ Réponse backend reçue:', JSON.stringify(res, null, 2));

        const disease = resolveDisease(res.prediction, res.confidence);
        console.log('[TerraAI][Disease] ✅ Maladie résolue:', disease?.name ?? 'inconnue');
        console.log('[TerraAI][Disease] Confiance:', res.confidence, '%');

        setState({ result: disease, loading: false, isMock: false, confidence: res.confidence, error: null });
        return disease;
      }

      // Fallback mock
      console.warn('[TerraAI][Disease] ⚠️ Backend hors ligne — passage en mode démo');
      await new Promise((r) => setTimeout(r, 2800));
      const mock = DISEASES[Math.floor(Math.random() * DISEASES.length)];
      console.log('[TerraAI][Disease] 🎭 Mock utilisé:', mock?.name);
      setState({ result: mock, loading: false, isMock: true, confidence: null, error: null });
      return mock;

    } catch (err) {
      console.error('[TerraAI][Disease] ❌ Erreur pendant l\'analyse:', err);
      if (err instanceof Error) {
        console.error('[TerraAI][Disease] Message:', err.message);
        console.error('[TerraAI][Disease] Stack:', err.stack);
      }

      await new Promise((r) => setTimeout(r, 2800));
      const mock = DISEASES[Math.floor(Math.random() * DISEASES.length)];
      console.log('[TerraAI][Disease] 🎭 Mock de secours utilisé:', mock?.name);

      setState({
        result: mock, loading: false, isMock: true, confidence: null,
        error: 'Connexion au serveur impossible — résultat de démonstration affiché',
      });
      return mock;
    }
  }, []);

  const reset = useCallback(() => {
    console.log('[TerraAI][Disease] Reset diagnostic');
    setState({ result: null, loading: false, isMock: false, confidence: null, error: null });
  }, []);

  return { ...state, analyze, reset };
}

export function usePestDiagnostic() {
  const [state, setState] = useState<DiagnosticState<Pest>>({
    result: null, loading: false, isMock: false, confidence: null, error: null,
  });

  const analyze = useCallback(async (imageUri: string) => {
    setState({ result: null, loading: true, isMock: false, confidence: null, error: null });

    console.log('[TerraAI][Pest] ── Démarrage analyse ──');
    console.log('[TerraAI][Pest] Image URI:', imageUri);

    try {
      console.log('[TerraAI][Pest] Vérification backend...');
      const online = await checkBackendHealth();
      console.log('[TerraAI][Pest] Backend online:', online);

      if (online) {
        console.log('[TerraAI][Pest] Envoi image au modèle IA...');
        const res = await predictPest(imageUri);
        console.log('[TerraAI][Pest] ✅ Réponse backend reçue:', JSON.stringify(res, null, 2));

        const pest = resolvePest(res.prediction, res.confidence);
        console.log('[TerraAI][Pest] ✅ Ravageur résolu:', pest?.name ?? 'inconnu');
        console.log('[TerraAI][Pest] Confiance:', res.confidence, '%');
        console.log('[TerraAI][Pest] Top prédictions:', JSON.stringify(res.top_predictions, null, 2));

        setState({ result: pest, loading: false, isMock: false, confidence: res.confidence, error: null });
        return pest;
      }

      // Fallback mock
      console.warn('[TerraAI][Pest] ⚠️ Backend hors ligne — passage en mode démo');
      await new Promise((r) => setTimeout(r, 2000));
      const mock = PESTS[0];
      console.log('[TerraAI][Pest] 🎭 Mock utilisé:', mock?.name);
      setState({ result: mock, loading: false, isMock: true, confidence: null, error: null });
      return mock;

    } catch (err) {
      console.error('[TerraAI][Pest] ❌ Erreur pendant l\'analyse:', err);
      if (err instanceof Error) {
        console.error('[TerraAI][Pest] Message:', err.message);
        console.error('[TerraAI][Pest] Stack:', err.stack);
      }

      await new Promise((r) => setTimeout(r, 2000));
      const mock = PESTS[0];
      console.log('[TerraAI][Pest] 🎭 Mock de secours utilisé:', mock?.name);

      setState({
        result: mock, loading: false, isMock: true, confidence: null,
        error: 'Connexion au serveur impossible — résultat de démonstration affiché',
      });
      return mock;
    }
  }, []);

  const reset = useCallback(() => {
    console.log('[TerraAI][Pest] Reset diagnostic');
    setState({ result: null, loading: false, isMock: false, confidence: null, error: null });
  }, []);

  return { ...state, analyze, reset };
}