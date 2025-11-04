// frontend/components/Sidebar.js - OVERLAY WITH BACKDROP
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform, TouchableWithoutFeedback } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

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
  const slideAnim = React.useRef(new Animated.Value(-280)).current;
  const backdropAnim = React.useRef(new Animated.Value(0)).current;
  const { logout } = useAuth();

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: isOpen ? 0 : -280,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: isOpen ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, [isOpen]);

  const handleLogout = async () => {
    console.log('🚪 Logout clicked');
    
    if (!logout) {
      console.error('❌ logout is null/undefined');
      return;
    }
    
    try {
      const result = await logout();
      console.log('Logout result:', result);
      
      if (result && result.success) {
        console.log('✅ Logout successful!');
        
        if (Platform.OS === 'web') {
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      } else {
        console.error('❌ Logout returned failure:', result?.error);
      }
    } catch (error) {
      console.error('❌ Exception during logout:', error);
    }
  };

  const getUserInitials = () => {
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  if (!isOpen) {
    // Only show toggle button when closed
    return (
      <TouchableOpacity
        style={[styles.toggleButton, { backgroundColor: theme.card }]}
        onPress={onToggle}
      >
        <View style={styles.hamburger}>
          <View style={[styles.line, { backgroundColor: theme.text }]} />
          <View style={[styles.line, { backgroundColor: theme.text }]} />
          <View style={[styles.line, { backgroundColor: theme.text }]} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <>
      {/* Backdrop - Click to close */}
      <TouchableWithoutFeedback onPress={onToggle}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropAnim,
              pointerEvents: isOpen ? 'auto' : 'none',
            }
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Sidebar */}
      <Animated.View
        style={[
          styles.sidebar,
          { 
            backgroundColor: theme.sidebar,
            borderRightColor: theme.border,
            transform: [{ translateX: slideAnim }] 
          }
        ]}
      >
        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onToggle}
        >
          <Text style={[styles.closeButtonText, { color: theme.text }]}>✕</Text>
        </TouchableOpacity>

        {/* Profile */}
        <View style={[styles.profile, { borderBottomColor: theme.border }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getUserInitials()}</Text>
          </View>
          <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
            {user?.email || 'User'}
          </Text>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'items' && styles.tabActive
            ]}
            onPress={() => onTabChange('items')}
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
              activeTab === 'recipe' && styles.tabActive
            ]}
            onPress={() => onTabChange('recipe')}
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
              activeTab === 'rating' && styles.tabActive
            ]}
            onPress={() => onTabChange('rating')}
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

        {/* Bottom Section */}
        <View style={[styles.bottomSection, { borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={styles.themeButton}
            onPress={onThemeToggle}
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
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    padding: 24,
    paddingTop: 60,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    borderRightWidth: 1,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 28,
    fontWeight: '300',
  },
  profile: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
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
  tabActive: {
    backgroundColor: '#3B82F6',
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