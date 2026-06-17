/**Ce fichier est le layout des onglets de votre application.
 *  C'est lui qui crée la barre de navigation en bas de l'écran avec les 5 icônes. 
 * */
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2E5C31', // Couleur de l'icône active
        tabBarInactiveTintColor: '#9CA3AF', // Couleur des icônes inactives
        tabBarStyle: {
          backgroundColor: '#FFFFFF', // Couleur de fond de la barre de navigation
          borderTopWidth: 1, //epaisseur de la ligne de separation entre la barre de navigation et le contenu
          borderTopColor: '#E8E3D8', // Couleur de la ligne de separation
          height: 60,// hauteur de la barre de navigation
          paddingBottom: 8, //espace entre le bas de l'écran et les icônes
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="diagnostic"
        options={{
          title: 'Diagnostic',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="leaf" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'Assistant',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="marche"
        options={{
          title: 'Marchés',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}