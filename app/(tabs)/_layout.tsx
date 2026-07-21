import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { StyleSheet, View } from 'react-native';
import AdBanner from '@/components/AdBanner';
import { useTheme } from '@/constants/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={20} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors: c } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.tabActive,
        tabBarInactiveTintColor: c.tabInactive,
        tabBarStyle: {
          backgroundColor: c.tabBar,
          borderTopColor: c.tabBarBorder,
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom + 2,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        headerShown: false,
      }}
      // Single pinned banner shared across ALL tabs — one banner per screen,
      // rendered as a strip directly ABOVE the default tab bar. Because it sits
      // on top of BottomTabBar (which already pads insets.bottom), the banner is
      // always clear of the system navigation bar: this placement sidesteps the
      // edge-to-edge (SDK 55/57) bottom-clip trap where a bottom-anchored banner
      // gets cut off by the gesture bar. Mounted once here, it also survives tab
      // switches instead of reloading on every navigation.
      tabBar={(props) => (
        <View style={{ backgroundColor: c.tabBar }}>
          <AdBanner
            style={{
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: c.tabBarBorder,
              backgroundColor: c.background,
            }}
          />
          <BottomTabBar {...props} />
        </View>
      )}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Prayers',
          tabBarIcon: ({ color }) => <TabBarIcon name="clock-o" color={color} />,
        }}
      />
      <Tabs.Screen
        name="tracker"
        options={{
          title: 'Tracker',
          tabBarIcon: ({ color }) => <TabBarIcon name="check-square-o" color={color} />,
        }}
      />
      <Tabs.Screen
        name="dua"
        options={{
          title: 'Dua',
          tabBarIcon: ({ color }) => <TabBarIcon name="book" color={color} />,
        }}
      />
      <Tabs.Screen
        name="radio"
        options={{
          title: 'Tilawat',
          tabBarIcon: ({ color }) => <TabBarIcon name="headphones" color={color} />,
        }}
      />
      <Tabs.Screen
        name="qibla"
        options={{
          title: 'Qibla',
          tabBarIcon: ({ color }) => <TabBarIcon name="compass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
        }}
      />
    </Tabs>
  );
}
