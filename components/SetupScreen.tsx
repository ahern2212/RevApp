import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { FeaturedSlideshow } from '@/components/FeaturedSlideshow';
import { GlassBackdrop } from '@/components/GlassBackdrop';
import { PressableScale } from '@/components/PressableScale';
import Colors from '@/constants/Colors';
import { blurTint, glass } from '@/constants/glass';
import { useAuth } from '@/context/AuthContext';
import { type FeaturedPhoto, fetchFeaturedPhotos } from '@/lib/featured';
import { cleanHandle } from '@/lib/handles';

type Mode = 'signIn' | 'signUp';

export function SetupScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [photos, setPhotos] = useState<FeaturedPhoto[]>([]);
  const onPhotos = photos.length > 0;

  // Featured cars behind the form (your picks, then the community's favorites).
  useEffect(() => {
    let cancelled = false;
    fetchFeaturedPhotos().then((next) => !cancelled && setPhotos(next));
    return () => {
      cancelled = true;
    };
  }, []);

  const isSignUp = mode === 'signUp';
  const canSubmit =
    !busy && email.trim() && password.length >= 6 && (!isSignUp || username.trim());

  const submit = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = isSignUp
      ? await signUp(email, password, username)
      : await signIn(email, password);
    setBusy(false);
    if (result.error) setError(result.error);
    else if (result.needsConfirmation) setNotice('Check your email to confirm your account, then sign in.');
  };

  const switchMode = () => {
    setMode(isSignUp ? 'signIn' : 'signUp');
    setError(null);
    setNotice(null);
  };

  return (
    <View style={styles.page}>
      <GlassBackdrop />
      {onPhotos ? <FeaturedSlideshow photos={photos} /> : null}
      <View style={styles.wrap}>
      <Animated.View entering={FadeInUp.duration(500)} style={[styles.card, onPhotos && styles.cardOnPhoto]}>
      {onPhotos ? <BlurView intensity={60} tint={blurTint} style={StyleSheet.absoluteFill} /> : null}
      <Text style={styles.kicker}>REVAPP</Text>
      <Text style={styles.title}>Instagram for cars.</Text>
      <Text style={styles.copy}>
        {isSignUp
          ? 'Create an account, post your build, and like what you see.'
          : 'Welcome back. Sign in to get to the feed.'}
      </Text>
      {isSignUp ? (
        <TextInput
          value={username}
          onChangeText={(text) => setUsername(cleanHandle(text, 24))}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="your handle (letters, numbers, . and _)"
          placeholderTextColor={Colors.light.placeholder}
          accessibilityLabel="Handle"
          style={styles.input}
        />
      ) : null}
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        placeholder="email"
        placeholderTextColor={Colors.light.placeholder}
        style={styles.input}
      />
      <View style={styles.passwordRow}>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          placeholder="password (6+ characters)"
          placeholderTextColor={Colors.light.placeholder}
          accessibilityLabel="Password"
          style={[styles.input, styles.passwordInput]}
          onSubmitEditing={() => canSubmit && submit()}
        />
        <Pressable
          onPress={() => setShowPassword((shown) => !shown)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          style={styles.eye}>
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={Colors.light.muted}
          />
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <PressableScale
        accessibilityRole="button"
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
        disabled={!canSubmit}
        onPress={submit}>
        {busy ? (
          <ActivityIndicator color={Colors.light.onTint} />
        ) : (
          <Text style={styles.buttonText}>{isSignUp ? 'Create account' : 'Sign in'}</Text>
        )}
      </PressableScale>
      <Pressable accessibilityRole="button" onPress={switchMode} style={styles.switch}>
        <Text style={styles.switchText}>
          {isSignUp ? 'Already have an account? Sign in' : "New here? Create an account"}
        </Text>
      </Pressable>
      </Animated.View>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  passwordRow: {
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eye: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  page: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  wrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    padding: 8,
  },
  // Over the photos the form sits on frosted glass so it stays readable.
  cardOnPhoto: {
    ...glass,
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
  },
  kicker: {
    color: Colors.light.tint,
    letterSpacing: 4,
    fontWeight: '800',
    marginBottom: 12,
  },
  title: {
    color: Colors.light.text,
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 12,
  },
  copy: {
    color: Colors.light.muted,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 28,
  },
  input: {
    ...glass,
    shadowOpacity: 0,
    color: Colors.light.text,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: Colors.light.onTint,
    fontWeight: '800',
    fontSize: 16,
  },
  error: {
    color: Colors.light.danger,
    marginBottom: 12,
  },
  notice: {
    color: Colors.light.text,
    marginBottom: 12,
  },
  switch: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchText: {
    color: Colors.light.muted,
    fontWeight: '600',
  },
});
