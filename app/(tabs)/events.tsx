import { StyleSheet, View } from 'react-native';

import Colors from '@/constants/Colors';

// Placeholder — events are coming later.
export default function EventsScreen() {
  return <View style={styles.wrap} />;
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
});
