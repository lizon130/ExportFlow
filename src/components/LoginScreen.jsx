// src/components/LoginScreen.js
import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Keyboard,
} from 'react-native';

const LoginScreen = ({onLoginSuccess}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const passwordInputRef = useRef(null);
  const scrollViewRef = useRef(null);

  const API_BASE_URL = 'http://192.168.9.45:7000';

  // ✅ ফিক্সড JWT পার্সিং ফাংশন - atob ব্যবহার করে
  const parseJwtAndGetUserId = token => {
    try {
      console.log('Parsing JWT token...');
      
      if (!token || typeof token !== 'string') {
        console.error('Invalid token format');
        return null;
      }

      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('Invalid JWT structure. Parts:', parts.length);
        return null;
      }

      // পে-লোড পার্ট নিন (index 1)
      const payload = parts[1];
      console.log('Payload part length:', payload.length);
      
      // Base64 URL decode
      let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      
      // Base64 প্যাডিং যোগ করুন
      while (base64.length % 4) {
        base64 += '=';
      }
      
      console.log('Base64 payload length:', base64.length);
      
      // ✅ সঠিকভাবে base64 ডিকোড করার জন্য Buffer বা atob ব্যবহার
      let decodedString;
      
      if (Platform.OS === 'web') {
        // Web এর জন্য
        decodedString = atob(base64);
      } else {
        // React Native এর জন্য - Buffer ব্যবহার করুন
        // Buffer গ্লোবালি উপলব্ধ না হলে 'buffer' প্যাকেজ ইনস্টল করুন
        // npm install buffer
        const {Buffer} = require('buffer');
        decodedString = Buffer.from(base64, 'base64').toString('utf-8');
      }
      
      console.log('Decoded string:', decodedString);
      
      // JSON পার্স করুন
      const decoded = JSON.parse(decodedString);
      console.log('Decoded JWT payload:', decoded);
      
      // userId খুঁজুন - বিভিন্ন সম্ভাব্য ফিল্ড চেক করুন
      let userId = decoded.sub || decoded.userId || decoded.id || decoded.user_id || decoded.uid;
      
      if (!userId) {
        // সব ফিল্ড প্রিন্ট করুন
        console.log('Available fields in JWT:', Object.keys(decoded));
        console.log('Full decoded object:', JSON.stringify(decoded, null, 2));
        
        // যদি sub ফিল্ডে সংখ্যা থাকে
        if (decoded.sub) {
          userId = decoded.sub;
        } else if (decoded.userId) {
          userId = decoded.userId;
        } else if (decoded.id) {
          userId = decoded.id;
        } else {
          console.error('No userId field found in JWT');
          return null;
        }
      }
      
      console.log('Extracted userId:', userId);
      return userId.toString();
      
    } catch (error) {
      console.error('Error parsing JWT:', error.message);
      console.error('Error stack:', error.stack);
      return null;
    }
  };

  // ✅ অল্টারনেটিভ: সরাসরি API থেকে userId নেওয়ার চেষ্টা করুন
  const handleLogin = async () => {
    Keyboard.dismiss();

    if (!email || !password) {
      setError('Please enter both email and password');
      setSuccessMessage('');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      console.log('Attempting login to:', `${API_BASE_URL}/api/Auth/login`);
      console.log('Login payload:', {username: email});

      const response = await fetch(`${API_BASE_URL}/api/Auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          username: email,
          password: password,
        }),
      });

      console.log('Response status:', response.status);

      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        let userId = null;
        
        // ✅ পদ্ধতি 1: JWT থেকে userId বের করার চেষ্টা
        if (data.accessToken) {
          userId = parseJwtAndGetUserId(data.accessToken);
        }
        
        // ✅ পদ্ধতি 2: যদি JWT parse কাজ না করে, API থেকে সরাসরি userId নিন
        if (!userId && data.userId) {
          userId = data.userId;
          console.log('Got userId directly from response:', userId);
        }
        
        // ✅ পদ্ধতি 3: যদি userId না পাওয়া যায়, ইউজারনেম ব্যবহার করুন অথবা fallback
        if (!userId) {
          console.warn('Could not extract userId, using email as fallback');
          userId = email.split('@')[0]; // email থেকে username অংশ নিন
        }

        // Store user data with userId and token
        const userInfo = {
          userId: userId,
          username: email.split('@')[0], // ইউজারনেম সেভ করুন
          email: email,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expireAt: data.expireAt,
        };

        console.log('Final User Info:', userInfo);
        console.log('Calling onLoginSuccess callback...');

        setSuccessMessage('Login Successful!');
        setError('');
        setEmail('');
        setPassword('');

        // Call onLoginSuccess
        if (onLoginSuccess) {
          await onLoginSuccess(userInfo);
          console.log('onLoginSuccess completed');
        }
      } else {
        console.error('Login failed:', data);
        setError(data.message || data.title || 'Login failed');
        setSuccessMessage('');
      }
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error stack:', error.stack);
      setError(`Cannot connect to server at ${API_BASE_URL}`);
      setSuccessMessage('');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
    if (passwordInputRef.current) {
      setTimeout(() => {
        passwordInputRef.current.focus();
      }, 50);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={true}
          nestedScrollEnabled={true}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoIconText}>📈</Text>
            </View>
            <Text style={styles.logoTitle}>ExportFlow</Text>
          </View>

          <View style={styles.card}>
            {successMessage !== '' && (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username / Email</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter username or email"
                  placeholderTextColor="#5b6b8c"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => {
                    passwordInputRef.current?.focus();
                  }}
                  blurOnSubmit={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🔑</Text>
                <TextInput
                  ref={passwordInputRef}
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#5b6b8c"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={togglePasswordVisibility}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                  activeOpacity={0.7}>
                  <Text style={styles.eyeIcon}>
                    {showPassword ? '🔒' : '🔓'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {error !== '' && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.buttonSpacing}>
              <TouchableOpacity
                style={styles.authButton}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}>
                <View style={styles.gradientButton}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Login to Dashboard</Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0c12',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoIcon: {
    width: 70,
    height: 70,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#3b82f6',
  },
  logoIconText: {
    fontSize: 28,
  },
  logoTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 6,
  },
  logoSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
  },
  card: {
    backgroundColor: '#12141c',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    minHeight: 50,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 15,
    padding: 0,
    margin: 0,
    height: Platform.OS === 'ios' ? 40 : 'auto',
  },
  eyeIcon: {
    fontSize: 18,
    marginLeft: 8,
    color: '#94a3b8',
  },
  buttonSpacing: {
    marginTop: 12,
    marginBottom: 8,
  },
  authButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  gradientButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: 'rgba(236,72,153,0.15)',
    borderWidth: 1,
    borderColor: '#ec4899',
    borderRadius: 12,
    padding: 10,
    marginTop: 14,
  },
  errorText: {
    fontSize: 11,
    color: '#f472b6',
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 12,
    padding: 10,
    marginBottom: 20,
  },
  successText: {
    fontSize: 12,
    color: '#34d399',
    textAlign: 'center',
    fontWeight: '500',
  },
  bottomPadding: {
    height: Platform.OS === 'ios' ? 20 : 30,
  },
});

export default LoginScreen;