// frontend/App.js - WITH NOTIFICATION SETUP
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import notificationService from './services/notificationService';
import Sidebar from './components/Sidebar';
import ItemScreen from './components/ItemScreen';
import RecipeScreen from './components/RecipeScreen';
import RatingScreen from './components/RatingScreen';
import LoginScreen from './components/LoginScreen';

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('items');
  const [darkMode, setDarkMode] = useState(false);
  
  const { user, loading } = useAuth();

  // Register for notifications when user logs in
  useEffect(() => {
    if (user) {
      console.log('📱 User logged in, registering for notifications...');
      
      // Register for push notifications
      notificationService.registerForPushNotifications(user.uid)
        .then(token => {
          if (token) {
            console.log('✅ Push notifications registered');
          } else {
            console.log('⚠️ Could not register push notifications');
          }
        })
        .catch(error => {
          console.error('❌ Error registering notifications:', error);
        });

      // Set up notification listeners
      notificationService.setupNotificationListeners();

      // Cleanup on unmount or logout
      return () => {
        notificationService.removeNotificationListeners();
      };
    }
  }, [user]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  const theme = {
    bg: darkMode ? '#0F172A' : '#F8FAFC',
    card: darkMode ? '#1E293B' : '#FFFFFF',
    text: darkMode ? '#F1F5F9' : '#0F172A',
    textMuted: darkMode ? '#94A3B8' : '#64748B',
    border: darkMode ? '#334155' : '#E2E8F0',
    primary: '#3B82F6',
    sidebar: darkMode ? '#1E293B' : '#FFFFFF',
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen theme={theme} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>
        {activeTab === 'items' && <ItemScreen theme={theme} darkMode={darkMode} />}
        {activeTab === 'recipe' && <RecipeScreen theme={theme} darkMode={darkMode} />}
        {activeTab === 'rating' && <RatingScreen theme={theme} darkMode={darkMode} />}
      </View>

      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        darkMode={darkMode}
        onThemeToggle={() => setDarkMode(!darkMode)}
        theme={theme}
        user={user}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar 
          barStyle="light-content" 
          backgroundColor="#1E293B" 
        />
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});