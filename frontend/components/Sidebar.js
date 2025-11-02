// frontend/components/Sidebar.js - DEBUG LOGOUT
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert, Platform } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

export default function Sidebar({ 
  isOpen, 
  onToggle, 
  activeTab, 
  onTabChange, 
  darkMode, 
  onThemeToggle, 
  theme,
  user 
}) {
  const slideAnim = React.useRef(new Animated.Value(isOpen ? 0 : -280)).current;

  React.useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOpen ? 0 : -280,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  const handleLogout = () => {
    console.log('=== LOGOUT CLICKED ===');
    console.log('Current user:', user?.email);
    console.log('Auth object:', auth);
    console.log('Auth currentUser:', auth.currentUser?.email);
    
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => console.log('Logout cancelled')
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            console.log('=== STARTING LOGOUT ===');
            
            try {
              console.log('Calling signOut...');
              await signOut(auth);
              
              console.log('✅ signOut completed');
              
              // Force reload
              console.log('Forcing reload...');
              if (Platform.OS === 'web') {
                window.location.href = window.location.origin;
              }
            } catch (error) {
              console.error('=== LOGOUT ERROR ===');
              console.error('Error:', error);
              console.error('Error code:', error.code);
              console.error('Error message:', error.message);
              Alert.alert('Logout Failed', error.message);
            }
          }
        }
      ],
      { cancelable: false }
    );
  };

  const getUserInitials = () => {
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.toggleButton, { backgroundColor: theme.card }]}
        onPress={onToggle}
      >
        <View style={styles.toggleIcon}>
          <View style={styles.hamburger}>
            <View style={[styles.line, { backgroundColor: theme.text }]} />
            <View style={[styles.line, { backgroundColor: theme.text }]} />
            <View style={[styles.line, { backgroundColor: theme.text }]} />
          </View>
        </View>
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.sidebar,
          { backgroundColor: theme.sidebar, transform: [{ translateX: slideAnim }] }
        ]}
      >
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getUserInitials()}</Text>
          </View>
          <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
            {user?.email || 'User'}
          </Text>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[
              styles.tab,
              { 
                backgroundColor: activeTab === 'items' ? '#3B82F6' : 'transparent',
              }
            ]}
            onPress={() => {
              console.log('Items tab clicked');
              onTabChange('items');
            }}
          >
            <Text style={styles.tabEmoji}>🧺</Text>
            <Text style={[
              styles.tabText,
              { color: activeTab === 'items' ? '#FFFFFF' : theme.textMuted }
            ]}>
              Items
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              { 
                backgroundColor: activeTab === 'recipe' ? '#3B82F6' : 'transparent',
              }
            ]}
            onPress={() => {
              console.log('Recipe tab clicked');
              onTabChange('recipe');
            }}
          >
            <Text style={styles.tabEmoji}>🍳</Text>
            <Text style={[
              styles.tabText,
              { color: activeTab === 'recipe' ? '#FFFFFF' : theme.textMuted }
            ]}>
              Recipe
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              { 
                backgroundColor: activeTab === 'rating' ? '#3B82F6' : 'transparent',
              }
            ]}
            onPress={() => {
              console.log('Rating tab clicked');
              onTabChange('rating');
            }}
          >
            <Text style={styles.tabEmoji}>⭐</Text>
            <Text style={[
              styles.tabText,
              { color: activeTab === 'rating' ? '#FFFFFF' : theme.textMuted }
            ]}>
              Rating
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.themeButton}
            onPress={() => {
              console.log('Theme toggle clicked');
              onThemeToggle();
            }}
          >
            <Text style={styles.themeIcon}>{darkMode ? '🌙' : '☀️'}</Text>
            <Text style={[styles.themeText, { color: theme.textMuted }]}>
              {darkMode ? 'Dark' : 'Light'} Mode
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  toggleButton: {
    position: 'absolute',
    left: 16,
    top: 16,
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  toggleIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburger: {
    width: 20,
    gap: 4,
  },
  line: {
    width: '100%',
    height: 2,
    borderRadius: 1,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    padding: 24,
    paddingTop: 80,
    zIndex: 50,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  profile: {
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    width: '100%',
    textAlign: 'center',
  },
  tabs: {
    gap: 8,
    flex: 1,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 12,
  },
  tabEmoji: {
    fontSize: 20,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  bottomSection: {
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  themeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  themeIcon: {
    fontSize: 20,
  },
  themeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 12,
    backgroundColor: '#FEE2E2',
  },
  logoutIcon: {
    fontSize: 20,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DC2626',
  },
});