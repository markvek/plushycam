import type { ReactNode } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, tokens } from './theme';

// One static texture, reused by every route and fullscreen surface.
// Repeat keeps the grain fine on large displays; the solid base limits contrast.
export function AppBackground({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flex: 1, backgroundColor: colors.bg }, style]}>
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        accessible={false}
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Image
          source={require('../../assets/textures/offwhite-paper.png')}
          resizeMode="repeat"
          accessible={false}
          fadeDuration={0}
          style={{ width: '100%', height: '100%', opacity: tokens.background.textureOpacity }}
        />
      </View>
      {children}
    </View>
  );
}
