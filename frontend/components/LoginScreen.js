import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LoginScreen({ theme }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // for signup
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  
  const [mainError, setMainError] = useState('');
  
  const { login, signup } = useAuth();

  // Password strength
  const checkPasswordStrength = (pass) => {
    const criteria = {
      length: pass.length >= 8,
      uppercase: /[A-Z]/.test(pass),
      lowercase: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pass),
    };

    const strength = Object.values(criteria).filter(Boolean).length;
    
    if (strength <= 2) return { label: 'Weak', color: '#DC2626', score: strength };
    if (strength <= 3) return { label: 'Fair', color: '#EA580C', score: strength };
    if (strength <= 4) return { label: 'Good', color: '#CA8A04', score: strength };
    return { label: 'Strong', color: '#22C55E', score: strength };
  };

  const passwordStrength = password && isSignup ? checkPasswordStrength(password) : null;

  // email validation
  const validateEmail = (email) => {
    if (!isSignup) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('');
      return true;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Invalid email format');
      return false;
    }
    setEmailError('');
    return true;
  };

  // password validation
  const validatePassword = (pass) => {
    if (!isSignup) return;
    
    if (!pass) {
      setPasswordError('');
      return true;
    }
    
    if (pass.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    }
    
    const hasUpperCase = /[A-Z]/.test(pass);
    const hasLowerCase = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      setPasswordError('Must contain uppercase, lowercase, and number');
      return false;
    }
    
    setPasswordError('');
    return true;
  };

  // Confirm password validation
  const validateConfirmPassword = (confirm) => {
    if (!isSignup) return;
    
    if (!confirm) {
      setConfirmPasswordError('');
      return true;
    }
    if (confirm !== password) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    }
    setConfirmPasswordError('');
    return true;
  };

  const handleSubmit = async () => {
    setMainError('');
    
    if (!email.trim()) {
      setMainError('Please enter your email address');
      return;
    }

    if (!password.trim()) {
      setMainError('Please enter your password');
      return;
    }

    if (isSignup) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setMainError('Please enter a valid email address');
        return;
      }

      if (password.length < 8) {
        setMainError('Password must be at least 8 characters long');
        return;
      }

      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      
      if (!hasUpperCase || !hasLowerCase || !hasNumber) {
        setMainError('Password must contain uppercase, lowercase, and number');
        return;
      }

      if (password !== confirmPassword) {
        setMainError('Passwords do not match');
        return;
      }
    }

    setLoading(true);

    try {
      console.log(' Attempting authentication...');
      console.log('Mode:', isSignup ? 'Signup' : 'Login');
      
      const result = isSignup 
        ? await signup(email.trim(), password)
        : await login(email.trim(), password);

      console.log('Auth result:', result);

      if (!result.success) {
        const errorMessage = getErrorMessage(result.error);
        setMainError(errorMessage);
      } else {
        console.log(' Authentication successful!');
      }
    } catch (error) {
      console.error(' Unexpected auth error:', error);
      setMainError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (error) => {
    const errorCode = error?.code || error?.message || '';
    
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/user-disabled':
        return 'This account has been disabled';
      case 'auth/user-not-found':
        return 'No account found with this email';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/invalid-credential':
        return 'Invalid email or password';
      case 'auth/email-already-in-use':
        return 'This email is already registered';
      case 'auth/weak-password':
        return 'Password is too weak';
      case 'auth/operation-not-allowed':
        return 'Email/password login is not enabled';
      case 'auth/too-many-requests':
        return 'Too many attempts. Try again later';
      case 'auth/network-request-failed':
        return 'Network error. Check your connection';
      default:
        return error?.message || 'Authentication failed';
    }
  };

  const toggleMode = () => {
    setIsSignup(!isSignup);
    setPassword('');
    setConfirmPassword('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setMainError('');
  };

  const getLogoSize = () => {
    if (Platform.OS === 'web') {
      return {
        width: Math.min(SCREEN_WIDTH * 0.3, 150),
        height: Math.min(SCREEN_WIDTH * 0.3, 150),
      };
    } else {
      return {
        width: Math.min(SCREEN_WIDTH * 0.4, 180),
        height: Math.min(SCREEN_WIDTH * 0.4, 180),
      };
    }
  };

  const logoSize = getLogoSize();

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Image
              source={require('../assets/logo.png')}
              style={[styles.logo, logoSize]}
              resizeMode="contain"
            />
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              {isSignup ? 'Create your account' : 'Welcome back'}
            </Text>
          </View>

          {mainError ? (
            <View style={styles.mainErrorContainer}>
              <Text style={styles.mainErrorIcon}>⚠️</Text>
              <Text style={styles.mainErrorText}>{mainError}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Email</Text>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    color: theme.text, 
                    borderColor: emailError ? '#DC2626' : theme.border,
                    backgroundColor: theme.card 
                  }
                ]}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  validateEmail(text);
                  setMainError('');
                }}
                placeholder="your@email.com"
                placeholderTextColor={theme.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
              />
              {emailError && isSignup ? (
                <Text style={styles.errorText}>{emailError}</Text>
              ) : null}
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.input, 
                    styles.passwordInput,
                    { 
                      color: theme.text, 
                      borderColor: passwordError && isSignup ? '#DC2626' : theme.border,
                      backgroundColor: theme.card 
                    }
                  ]}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (isSignup) validatePassword(text);
                    if (confirmPassword && isSignup) validateConfirmPassword(confirmPassword);
                    setMainError('');
                  }}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                />
                <TouchableOpacity 
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeIconText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
              
              {/* Password Requirements (Signup only) */}
              {isSignup && (
                <View style={styles.passwordRequirements}>
                  <Text style={[styles.requirementText, password.length >= 8 && styles.requirementMet]}>
                    ✓ At least 8 characters
                  </Text>
                  <Text style={[styles.requirementText, /[A-Z]/.test(password) && styles.requirementMet]}>
                    ✓ One uppercase letter
                  </Text>
                  <Text style={[styles.requirementText, /[a-z]/.test(password) && styles.requirementMet]}>
                    ✓ One lowercase letter
                  </Text>
                  <Text style={[styles.requirementText, /[0-9]/.test(password) && styles.requirementMet]}>
                    ✓ One number
                  </Text>
                  
                  {passwordStrength && password.length > 0 && (
                    <View style={styles.strengthContainer}>
                      <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                        Strength: {passwordStrength.label}
                      </Text>
                      <View style={styles.strengthBar}>
                        {[...Array(5)].map((_, i) => (
                          <View
                            key={i}
                            style={[
                              styles.strengthSegment,
                              i < passwordStrength.score && { backgroundColor: passwordStrength.color }
                            ]}
                          />
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Confirm Password */}
            {isSignup && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Confirm Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.passwordInput,
                      { 
                        color: theme.text, 
                        borderColor: confirmPasswordError ? '#DC2626' : theme.border,
                        backgroundColor: theme.card 
                      }
                    ]}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      validateConfirmPassword(text);
                      setMainError('');
                    }}
                    placeholder="••••••••"
                    placeholderTextColor={theme.textMuted}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity 
                    style={styles.eyeIcon}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Text style={styles.eyeIconText}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
                  </TouchableOpacity>
                </View>
                {confirmPasswordError ? (
                  <Text style={styles.errorText}>{confirmPasswordError}</Text>
                ) : confirmPassword && !confirmPasswordError ? (
                  <Text style={styles.successText}>✓ Passwords match</Text>
                ) : null}
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isSignup ? 'Create Account' : 'Log In'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Toggle Mode */}
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={toggleMode}
              disabled={loading}
            >
              <Text style={[styles.toggleButtonText, { color: theme.primary }]}>
                {isSignup 
                  ? 'Already have an account? Log In' 
                  : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textMuted }]}>
              🔒 Your data is secure and private
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  mainErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  mainErrorIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  mainErrorText: {
    flex: 1,
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 45,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  eyeIconText: {
    fontSize: 20,
  },
  passwordRequirements: {
    marginTop: 8,
    paddingLeft: 4,
  },
  requirementText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  requirementMet: {
    color: '#22C55E',
  },
  strengthContainer: {
    marginTop: 8,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  strengthBar: {
    flexDirection: 'row',
    gap: 4,
    height: 4,
  },
  strengthSegment: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
    marginLeft: 4,
  },
  successText: {
    fontSize: 12,
    color: '#22C55E',
    marginTop: 4,
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButton: {
    padding: 16,
    alignItems: 'center',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
  },
});