import { useSafeAreaInsets } from 'react-native-safe-area-context';

// The tab bar floats over screens (absolute, blurred), so scrollable tab screens need
// this much bottom padding for their last item to clear it. React Navigation's tab bar
// is ~49–56pt tall plus the home-indicator inset; the extra few points are breathing room.
const TAB_BAR_HEIGHT = 64;

export function useTabBarSpace(): number {
  return useSafeAreaInsets().bottom + TAB_BAR_HEIGHT;
}
