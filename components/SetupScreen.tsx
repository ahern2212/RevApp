import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useGarage } from '@/context/GarageContext';

export function SetupScreen() {
  const { signIn } = useGarage();
  const [username, setUsername] = useState('');

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>GARAGE</Text>
      <Text style={styles.title}>Instagram for cars.</Text>
      <Text style={styles.copy}>
        Pick a handle, post your build, and like what you see. This first version stays on your
        device so you can try the feed on the web or on an iPhone.
      </Text>
      <TextInput
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="your handle"
        placeholderTextColor={Colors.dark.muted}
        style={styles.input}
      />
      <Pressable
        accessibilityRole="button"
        style={[styles.button, !username.trim() && styles.buttonDisabled]}
        disabled={!username.trim()}
        onPress={() => signIn(username)}>
        <Text style={styles.buttonText}>Enter the feed</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    padding: 28,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  kicker: {
    color: Colors.dark.tint,
    letterSpacing: 4,
    fontWeight: '800',
    marginBottom: 12,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 12,
  },
  copy: {
    color: Colors.dark.muted,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 28,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.card,
    color: Colors.dark.text,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: Colors.dark.tint,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});
