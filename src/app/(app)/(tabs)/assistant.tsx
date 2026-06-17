import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView,
  Pressable, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AI_RESPONSES, QUICK_QUESTIONS } from '../../../data/mockData';
import { useUserProfile } from '../../../hooks/useUserProfile';
import { useSpeech } from '../../../hooks/useSpeech';
import type { ChatMessage } from '../../../types/types';

function getAIResponse(userInput: string, key?: string): string {
  if (key && AI_RESPONSES[key]) return AI_RESPONSES[key];
  const input = userInput.toLowerCase();
  if (input.includes('semis') || input.includes('planter') || input.includes('semer')) return AI_RESPONSES.semis;
  if (input.includes('météo') || input.includes('pluie') || input.includes('temps')) return AI_RESPONSES.meteo;
  if (input.includes('prix') || input.includes('marché') || input.includes('vendre')) return AI_RESPONSES.prix;
  if (input.includes('maladie') || input.includes('ravageur') || input.includes('insecte')) return AI_RESPONSES.maladie;
  if (input.includes('engrais') || input.includes('fertilisant') || input.includes('npk')) return AI_RESPONSES.engrais;
  return `Merci pour votre question sur "${userInput}".\n\nJe suis votre assistant agricole pour le Burkina Faso. Je peux vous aider avec :\n\n🌾 Conseils de semis\n☁️ Prévisions météo\n📊 Prix des marchés\n🐛 Maladies et ravageurs\n🌱 Fertilisation`;
}

function getTime() {
  const n = new Date();
  return `${n.getHours().toString().padStart(2, '0')}:${n.getMinutes().toString().padStart(2, '0')}`;
}

// ─── Rendu message formaté ─────────────────────────────────────────────────
function MessageText({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <View style={{ gap: 2 }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <View key={i} style={{ height: 4 }} />;
        const isBold = line.startsWith('**') && line.includes('**', 2);
        const cleanLine = line.replace(/\*\*/g, '');
        return (
          <Text key={i} style={{
            fontSize: 14, lineHeight: 21, color: '#1A1A1A',
            fontWeight: isBold ? '700' : '400',
          }}>
            {cleanLine}
          </Text>
        );
      })}
    </View>
  );
}

// ─── Bulle de message ──────────────────────────────────────────────────────
function ChatBubble({ message, onSpeak }: { message: ChatMessage; onSpeak?: (text: string) => void }) {
  const isUser = message.role === 'user';
  return (
    <View style={{ marginBottom: 16, alignItems: isUser ? 'flex-end' : 'flex-start' }}>
      {!isUser && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <LinearGradient
            colors={['#2E7D52', '#2E5C31']}
            style={{
              width: 32, height: 32, borderRadius: 10,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 14 }}>🌿</Text>
          </LinearGradient>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#2E5C31' }}>TerraAI</Text>
        </View>
      )}

      <View style={{
        maxWidth: '85%',
        backgroundColor: isUser ? '#2E5C31' : '#FFFFFF',
        borderRadius: 18,
        borderBottomRightRadius: isUser ? 4 : 18,
        borderBottomLeftRadius: isUser ? 18 : 4,
        paddingHorizontal: 16,
        paddingVertical: 12,
        elevation: isUser ? 3 : 2,
        shadowColor: isUser ? '#2E5C31' : '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isUser ? 0.25 : 0.07,
        shadowRadius: 6,
      }}>
        {isUser ? (
          <Text style={{ fontSize: 14, lineHeight: 21, color: '#FFFFFF' }}>
            {message.content}
          </Text>
        ) : (
          <MessageText content={message.content} />
        )}
      </View>

      {/* Timestamp + bouton écouter */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, paddingHorizontal: 4 }}>
        <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{message.timestamp}</Text>
        {!isUser && onSpeak && (
          <Pressable onPress={() => onSpeak(message.content)}>
            <Ionicons name="volume-medium-outline" size={14} color="#9CA3AF" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Indicateur de frappe ─────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <LinearGradient
        colors={['#2E7D52', '#2E5C31']}
        style={{
          width: 32, height: 32, borderRadius: 10,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 14 }}>🌿</Text>
      </LinearGradient>
      <View style={{
        backgroundColor: '#FFFFFF', borderRadius: 18, borderBottomLeftRadius: 4,
        paddingHorizontal: 16, paddingVertical: 12,
        elevation: 2, shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4,
      }}>
        <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{
              width: 7, height: 7, borderRadius: 4,
              backgroundColor: '#A5D6A7',
            }} />
          ))}
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 4 }}>
            TerraAI écrit...
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Screen principal ─────────────────────────────────────────────────────
export default function AssistantScreen() {
  const { profile } = useUserProfile();
  const { speak, stop, isSpeaking } = useSpeech();

  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: '0',
    role: 'assistant',
    content: AI_RESPONSES.default,
    timestamp: getTime(),
  }]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, isTyping]);

  const handleSpeak = (text: string) => {
    const clean = text.replace(/\*\*/g, '').replace(/[#•]/g, '').replace(/\n+/g, '. ');
    if (isSpeaking) { stop(); return; }
    speak(clean);
  };

  const sendMessage = (text: string, key?: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: getTime(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      const response = getAIResponse(text, key);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: getTime(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);

      // Lecture automatique
      const clean = response.replace(/\*\*/g, '').replace(/[#•]/g, '').replace(/\n+/g, '. ');
      speak(clean);
    }, 600 + Math.random() * 900);
  };

  const resetConversation = () => {
    stop();
    setMessages([{ id: '0', role: 'assistant', content: AI_RESPONSES.default, timestamp: getTime() }]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F2EB' }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A3C28" />
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header */}
        <LinearGradient
          colors={['#1A3C28', '#2E5C31']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800' }}>
                🤖 Assistant IA
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#69F0AE' }} />
                <Text style={{ color: '#A5D6A7', fontSize: 12 }}>
                  Agentic AI · Actif
                  {profile.nom ? ` · Bonjour ${profile.nom.split(' ')[0]}` : ''}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {/* Bouton voix */}
              <Pressable
                onPress={() => isSpeaking ? stop() : null}
                style={{
                  width: 38, height: 38, borderRadius: 12,
                  backgroundColor: isSpeaking ? '#69F0AE' : 'rgba(255,255,255,0.15)',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons
                  name={isSpeaking ? 'volume-high' : 'volume-medium-outline'}
                  size={18}
                  color={isSpeaking ? '#1A3C28' : '#FFFFFF'}
                />
              </Pressable>
              {/* Bouton reset */}
              <Pressable
                onPress={resetConversation}
                style={{
                  width: 38, height: 38, borderRadius: 12,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name="refresh" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                onSpeak={msg.role === 'assistant' ? handleSpeak : undefined}
              />
            ))}
            {isTyping && <TypingIndicator />}
            <View style={{ height: 8 }} />
          </ScrollView>

          {/* Questions rapides */}
          <View style={{ backgroundColor: '#F5F2EB', paddingVertical: 8 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            >
              {QUICK_QUESTIONS.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => sendMessage(item.text, item.key)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderWidth: 1.5,
                    borderColor: '#A5D6A7',
                    elevation: 2,
                    shadowColor: '#2E5C31',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#2E5C31' }}>
                    {item.text}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Barre saisie */}
          <View style={{
            flexDirection: 'row', alignItems: 'flex-end', gap: 10,
            paddingHorizontal: 16, paddingVertical: 12,
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1, borderTopColor: '#F0EBE0',
          }}>
            <TextInput
              style={{
                flex: 1, backgroundColor: '#F5F2EB',
                borderRadius: 22, paddingHorizontal: 18,
                paddingTop: 12, paddingBottom: 12,
                fontSize: 14, color: '#1A1A1A',
                minHeight: 46, maxHeight: 110,
                borderWidth: 1.5, borderColor: '#E8E3D8',
              }}
              placeholder="Posez votre question agricole..."
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              multiline
              onSubmitEditing={() => sendMessage(inputText)}
            />
            <Pressable
              onPress={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isTyping}
              style={({ pressed }) => ({
                width: 46, height: 46, borderRadius: 16,
                backgroundColor: inputText.trim() && !isTyping ? '#2E5C31' : '#D1D5DB',
                alignItems: 'center', justifyContent: 'center',
                opacity: pressed ? 0.85 : 1,
                elevation: inputText.trim() ? 4 : 0,
                shadowColor: '#2E5C31',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3, shadowRadius: 4,
              })}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}