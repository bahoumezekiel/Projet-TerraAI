import { useCallback, useEffect, useState } from 'react';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Traductions mooré de base pour les phrases communes
const MOORE_PHRASES: Record<string, string> = {
  greeting: 'Ne y windga TerraAI pʋgẽ',
  listening: 'Mam kelgda fo',
  analyzing: 'Mam tõnd sebre',
  result: 'Bõn-kãsems yaa',
  treatment: 'To-kãsems yaa',
};

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [langue, setLangue] = useState<'fr' | 'moore'>('fr');

  useEffect(() => {
    AsyncStorage.getItem('langue').then((val) => {
      if (val === 'moore') setLangue('moore');
    });
  }, []);

  const speak = useCallback(async (text: string, options?: {
    moorePhraseKey?: keyof typeof MOORE_PHRASES;
    forceLangue?: 'fr' | 'moore';
  }) => {
    // Arrêter si déjà en train de parler
    if (isSpeaking) {
      await Speech.stop();
    }

    const targetLangue = options?.forceLangue ?? langue;
    let textToSpeak = text;

    // En mooré, utiliser la phrase traduite si disponible
    if (targetLangue === 'moore' && options?.moorePhraseKey) {
      textToSpeak = MOORE_PHRASES[options.moorePhraseKey] ?? text;
    }

    setIsSpeaking(true);

    Speech.speak(textToSpeak, {
      language: targetLangue === 'moore' ? 'fr-FR' : 'fr-FR',
      rate: 0.85,
      pitch: 1.0,
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
    });
  }, [isSpeaking, langue]);

  const stop = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking, langue };
}