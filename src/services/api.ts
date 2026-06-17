const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
const TIMEOUT_MS = 20000;

export type TopPrediction = {
  class_name: string;
  confidence: number;
};

export type PredictionResult = {
  model_type: 'disease' | 'pest';
  prediction: string;
  confidence: number;
  top_predictions: TopPrediction[];
};

// ─── Vérifie si le backend répond ────────────────────────────────────────────
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${BASE_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Appel générique de prédiction ───────────────────────────────────────────
async function uploadImage(endpoint: string, imageUri: string): Promise<PredictionResult> {
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    name: 'photo.jpg',
    type: 'image/jpeg',
  } as any);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Erreur serveur ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

export const predictDisease = (imageUri: string) => uploadImage('/predict/disease', imageUri);
export const predictPest = (imageUri: string) => uploadImage('/predict/pest', imageUri);