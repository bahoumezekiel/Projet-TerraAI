// src/types/types.ts

export type SeverityLevel = 'faible' | 'modéré' | 'élevé';

export type Disease = {
  id: string;
  name: string;
  severity: SeverityLevel;
  description: string;
  treatments: string[];
  prevention: string[];
  affectedCrops: string[];
};

export type Pest = {
  id: string;
  name: string;
  scientificName: string;
  infectionRate: number;
  description: string;
  treatments: string[];
  prevention: string[];
};

export type DiagnosticHistory = {
  id: string;
  date: string;
  imageUri: string;
  disease: Disease;
  cropType: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

export type MarketPrice = {
  id: string;
  product: string;
  unit: string;
  prices: {
    market: string;
    price: number;
    variation: number;
  }[];
  lastUpdated: string;
  category: 'céréale' | 'légumineuse' | 'oléagineux' | 'maraîcher';
};

export type UserProfile = {
  name: string;
  phone: string;
  region: string;
  village: string;
  crops: string[];
  surface: string;
  memberSince: string;
};

export type CropCalendar = {
  id: string;
  crop: string;
  emoji: string;
  color: string;
  sowing: { start: number; end: number };
  growing: { start: number; end: number };
  harvest: { start: number; end: number };
  tips: string[];
};