import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { GlassBackdrop } from '@/components/GlassBackdrop';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useGarage } from '@/context/GarageContext';
import { useProfile, useProfiles } from '@/context/ProfilesContext';
import { confirm, showError } from '@/lib/confirm';
import { cleanHandle, HANDLE_MAX, isValidHandle } from '@/lib/handles';
import { BIO_MAX, deleteMyAccount, updateMyProfile, updateUsername } from '@/lib/profiles';
import { unregisterPush } from '@/lib/push';

type PickedImage = { uri: string; mimeType?: string };

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, refresh } = useGarage();
  const { setUsername: setAuthUsername } = useAuth();
  const { setProfile } = useProfiles();
  const profile = useProfile(user?.id);

  // null = untouched (use the saved values); set once the user edits.
  const [bio, setBio] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [image, setImage] = useState<PickedImage | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);

  if (!user || !profile) {
    return (
      <View style={styles.wrap}>
        <ActivityIndicator color={Colors.light.tint} style={styles.loading} />
      </View>
    );
  }

  const currentBio = bio ?? profile.bio;
  const currentUsername = username ?? user.username;
  const usernameChanged = currentUsername !== user.username;
  const usernameValid = isValidHandle(currentUsername);
  const previewUri = image ? image.uri : removeAvatar ? null : profile.avatarUri;
  const profileChanged = bio !== null || image !== null || removeAvatar;
  const changed = profileChanged || usernameChanged;
  const canSave = changed && usernameValid && busy === null;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setImage({ uri: result.assets[0].uri, mimeType: result.assets[0].mimeType });
      setRemoveAvatar(false);
    }
  };

  const save = async () => {
    setBusy('save');
    try {
      if (usernameChanged) {
        await updateUsername(user.id, currentUsername);
        setAuthUsername(currentUsername);
        refresh(); // posts show the new name
      }
      const updated = profileChanged
        ? await updateMyProfile(profile, { bio: currentBio, image: image ?? undefined, removeAvatar })
        : profile;
      setProfile({ ...updated, username: currentUsername });
      router.back();
    } catch (error) {
      showError('Could not save profile', error);
    } finally {
      setBusy(null);
    }
  };

  const deleteAccount = async () => {
    const first = await confirm(
      'Delete your account?',
      'This permanently deletes your profile, posts, photos, likes, comments, saves and events. It can’t be undone.',
      'Continue'
    );
    if (!first) return;
    const second = await confirm(
      'Are you absolutely sure?',
      `Your account "${user.username}" and everything in it will be gone for good.`,
      'Delete forever'
    );
    if (!second) return;

    setBusy('delete');
    try {
      await unregisterPush().catch(() => {});
      await deleteMyAccount(user.id);
      // Signing out swaps the app to the sign-in screen.
    } catch (error) {
      setBusy(null);
      showError('Could not delete account', error);
    }
  };

  return (
    <View style={styles.screen}>
      <GlassBackdrop />
      <ScrollView
      style={styles.list}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets>
      <View style={styles.photoBlock}>
        <Pressable
          onPress={pickImage}
          accessibilityRole="button"
          accessibilityLabel="Change profile picture">
          <Avatar name={user.username} size={112} uri={previewUri ?? null} />
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={16} color={Colors.light.onTint} />
          </View>
        </Pressable>
        <View style={styles.photoActions}>
          <Text style={styles.link} onPress={pickImage} accessibilityRole="button">
            {previewUri ? 'Change picture' : 'Add a picture'}
          </Text>
          {previewUri ? (
            <Text
              style={styles.linkMuted}
              onPress={() => {
                setImage(null);
                setRemoveAvatar(true);
              }}
              accessibilityRole="button">
              Remove
            </Text>
          ) : null}
        </View>
      </View>

      <Text style={styles.label}>Username</Text>
      <View style={[styles.handleRow, !usernameValid && styles.inputError]}>
        <Text style={styles.at}>@</Text>
        <TextInput
          value={currentUsername}
          onChangeText={(text) => setUsername(cleanHandle(text))}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={HANDLE_MAX}
          accessibilityLabel="Username"
          style={styles.handleInput}
        />
      </View>
      <Text style={[styles.hint, !usernameValid && styles.hintError]}>
        {usernameValid
          ? 'Lowercase letters, numbers, dots and underscores. Your old name frees up for others.'
          : 'At least 2 characters: lowercase letters, numbers, dots or underscores.'}
      </Text>

      <Text style={styles.label}>Bio</Text>
      <TextInput
        value={currentBio}
        onChangeText={setBio}
        placeholder="Your ride, your crew, your city…"
        placeholderTextColor={Colors.light.placeholder}
        maxLength={BIO_MAX}
        multiline
        accessibilityLabel="Bio"
        style={styles.input}
      />
      <Text style={styles.counter}>
        {currentBio.length}/{BIO_MAX}
      </Text>

      <Pressable
        onPress={save}
        disabled={!canSave}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSave, busy: busy === 'save' }}
        style={[styles.button, !canSave && styles.buttonDisabled]}>
        <Text style={styles.buttonText}>{busy === 'save' ? 'Saving…' : 'Save'}</Text>
      </Pressable>

      <View style={styles.danger}>
        <Text style={styles.dangerTitle}>Delete account</Text>
        <Text style={styles.dangerText}>
          Permanently removes your account and everything you’ve posted.
        </Text>
        <Pressable
          onPress={deleteAccount}
          disabled={busy !== null}
          accessibilityRole="button"
          style={[styles.dangerButton, busy !== null && styles.buttonDisabled]}>
          <Text style={styles.dangerButtonText}>
            {busy === 'delete' ? 'Deleting…' : 'Delete my account'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  wrap: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  list: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  loading: {
    marginTop: 48,
  },
  photoBlock: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.tint,
    borderWidth: 2,
    borderColor: Colors.light.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 20,
  },
  link: {
    color: Colors.light.tint,
    fontWeight: '700',
  },
  linkMuted: {
    color: Colors.light.muted,
    fontWeight: '600',
  },
  label: {
    color: Colors.light.muted,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 6,
    marginTop: 8,
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    paddingLeft: 14,
  },
  inputError: {
    borderColor: Colors.light.danger,
  },
  at: {
    color: Colors.light.muted,
    fontSize: 16,
    fontWeight: '700',
  },
  handleInput: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 12,
    paddingLeft: 2,
    paddingRight: 14,
  },
  hint: {
    color: Colors.light.muted,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
    lineHeight: 17,
  },
  hintError: {
    color: Colors.light.danger,
  },
  input: {
    minHeight: 96,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
    color: Colors.light.text,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  counter: {
    color: Colors.light.muted,
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 12,
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
  danger: {
    marginTop: 40,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(179, 38, 30, 0.3)',
    backgroundColor: 'rgba(179, 38, 30, 0.05)',
    gap: 8,
  },
  dangerTitle: {
    color: Colors.light.danger,
    fontWeight: '800',
    fontSize: 16,
  },
  dangerText: {
    color: Colors.light.text,
    lineHeight: 20,
  },
  dangerButton: {
    marginTop: 4,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.danger,
  },
  dangerButtonText: {
    color: Colors.light.danger,
    fontWeight: '800',
  },
});
