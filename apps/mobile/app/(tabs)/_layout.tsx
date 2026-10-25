import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import BookOpenIcon from '@/assets/brand/book-open.svg';
import CompassIcon from '@/assets/brand/compass.svg';
import CookingPotIcon from '@/assets/brand/cooking-pot.svg';
import HouseIcon from '@/assets/brand/house.svg';
import UserIcon from '@/assets/brand/user-round.svg';
import { fontFamilyFor } from '@/src/fonts';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { colors } from '@/src/theme/tokens';

export default function TabLayout() {
  const { t } = useTranslation();
  const { language, direction } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const labelFont = fontFamilyFor(language, 'body');

  const tabLabel = ({ color, children }: { color: ColorValue; children: string }) => (
    <Text numberOfLines={2} style={[styles.label, { color, fontFamily: labelFont }]}>
      {children}
    </Text>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.sage,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: [styles.bar, { height: 64 + insets.bottom, paddingBottom: Math.max(insets.bottom, 6) }],
        tabBarItemStyle: styles.item,
        headerStyle: { backgroundColor: colors.paper },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: fontFamilyFor(language, 'section') },
        sceneStyle: { backgroundColor: colors.paper, direction },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          headerShown: false,
          tabBarLabel: tabLabel,
          tabBarIcon: ({ focused }) => (
            <TabGlyph focused={focused}>
              <HouseIcon />
            </TabGlyph>
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: t('tabs.discover'),
          tabBarLabel: tabLabel,
          tabBarIcon: ({ focused }) => (
            <TabGlyph focused={focused}>
              <CompassIcon />
            </TabGlyph>
          ),
        }}
      />
      <Tabs.Screen
        name="kitchen"
        options={{
          title: t('tabs.kitchen'),
          tabBarLabel: tabLabel,
          tabBarIcon: ({ focused }) => (
            <TabGlyph focused={focused}>
              <CookingPotIcon />
            </TabGlyph>
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: t('tabs.recipes'),
          tabBarLabel: tabLabel,
          tabBarIcon: ({ focused }) => (
            <TabGlyph focused={focused}>
              <BookOpenIcon />
            </TabGlyph>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarLabel: tabLabel,
          tabBarIcon: ({ focused }) => (
            <TabGlyph focused={focused}>
              <UserIcon />
            </TabGlyph>
          ),
        }}
      />
    </Tabs>
  );
}

function TabGlyph({ focused, children }: { focused: boolean; children: ReactNode }) {
  return <View style={[styles.glyph, focused ? styles.glyphActive : styles.glyphIdle]}>{children}</View>;
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.card,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  item: {
    minHeight: 48,
    paddingTop: 2,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  glyph: {
    minWidth: 44,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphActive: {
    backgroundColor: colors.sageWash,
    opacity: 1,
  },
  glyphIdle: {
    opacity: 0.72,
  },
});
