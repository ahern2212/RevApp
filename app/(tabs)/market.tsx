import { StyleSheet, View } from 'react-native';

import Colors from '@/constants/Colors';

// Placeholder — the marketplace is coming later.
export default function MarketScreen() {
  return <View style={styles.wrap} />;
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
});
