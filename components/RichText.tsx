import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import Colors from '@/constants/Colors';
import { showNotice } from '@/lib/confirm';
import { fetchProfileIdByUsername } from '@/lib/profiles';
import { tokenize } from '@/lib/richText';

/**
 * Caption/comment text with tappable #hashtags (open search) and @mentions (open the
 * driver's profile). Renders inline spans, so place it inside a <Text>.
 */
export function RichText({ text }: { text: string }) {
  const router = useRouter();

  const openMention = async (handle: string) => {
    try {
      const userId = await fetchProfileIdByUsername(handle);
      if (userId) router.push({ pathname: '/user/[userId]', params: { userId, name: handle } });
      else showNotice(`No driver called @${handle}`, 'They may have changed their username.');
    } catch (error) {
      console.warn('Failed to open mention', error);
    }
  };

  return (
    <>
      {tokenize(text).map((token, index) =>
        token.kind === 'text' ? (
          token.text
        ) : (
          <Text
            // Tokens have no ids and never reorder, so the index is a stable key.
            key={index}
            style={styles.link}
            accessibilityRole="link"
            onPress={() =>
              token.kind === 'tag'
                ? router.push({ pathname: '/search', params: { q: `#${token.tag}` } })
                : openMention(token.handle)
            }>
            {token.text}
          </Text>
        )
      )}
    </>
  );
}

const styles = StyleSheet.create({
  link: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
});
