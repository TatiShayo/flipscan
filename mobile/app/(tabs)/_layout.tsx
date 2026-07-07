// Bottom tab shell: Scan (camera, the core loop) / History / Watchlist / Trending /
// Settings. Receipt-paper tab bar per the "appraiser's field tool" art direction —
// warm paper surface, hairline top border, ink/forest active state.
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { Icon, type IconName } from '@/components/Icon';

function TabIcon(name: IconName) {
  return ({ color }: { color: ColorValue }) => <Icon name={name} color={String(color)} size={22} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.flip,
        tabBarInactiveTintColor: Colors.inkFaint,
        tabBarStyle: {
          backgroundColor: Colors.paper,
          borderTopColor: Colors.paperEdge,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontFamily: Fonts.bodyMedium, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="scan" options={{ title: 'Scan', tabBarIcon: TabIcon('camera') }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: TabIcon('history') }} />
      <Tabs.Screen name="watchlist" options={{ title: 'Watchlist', tabBarIcon: TabIcon('star') }} />
      <Tabs.Screen name="trending" options={{ title: 'Trending', tabBarIcon: TabIcon('trending') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: TabIcon('settings') }} />
    </Tabs>
  );
}
