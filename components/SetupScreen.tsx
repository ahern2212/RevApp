import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';

type Mode = 'signIn' | 'signUp';

export function SetupScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
    <View style={styles.wrap}>
      <Text style={styles.kicker}>GARAGE</Text>
      <Text style={styles.title}>Instagram for cars.</Text>
      <Text style={styles.copy}>
        {isSignUp
          ? 'Create an account, post your build, and like what you see.'
          : 'Welcome back. Sign in to get to the feed.'}
      </Text>
      {isSignUp ? (
        <TextInput
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="your handle"
          placeholderTextColor={Colors.light.placeholder}
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
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={isSignUp ? 'new-password' : 'current-password'}
        placeholder="password (6+ characters)"
        placeholderTextColor={Colors.light.placeholder}
        style={styles.input}
        onSubmitEditing={() => canSubmit && submit()}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Pressable
        accessibilityRole="button"
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
        disabled={!canSubmit}
        onPress={submit}>
        {busy ? (
          <ActivityIndicator color={Colors.light.onTint} />
        ) : (
          <Text style={styles.buttonText}>{isSignUp ? 'Create account' : 'Sign in'}</Text>
        )}
      </Pressable>
      <Pressable accessibilityRole="button" onPress={switchMode} style={styles.switch}>
        <Text style={styles.switchText}>
          {isSignUp ? 'Already have an account? Sign in' : "New here? Create an account"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    padding: 28,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
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
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
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
