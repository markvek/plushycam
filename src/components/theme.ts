import { Platform, type ViewStyle } from 'react-native';

// One palette and geometry for screens, controls, and the game HUD.
export const colors = {
  bg: '#F6F4EF',
  onBackground: '#222344',
  mutedOnBackground: '#5D5B69',
  panel: '#FFFBEA',
  raised: '#D9C8FF',
  border: '#222344',
  text: '#222344',
  muted: '#2D2D48',
  mint: '#BBEF67',
  ink: '#222344',
  danger: '#A01D42',
  pink: '#FF9EC9',
  yellow: '#FFDC62',
  cyan: '#7EE5EE',
  screen: '#D4F5A0',
  white: '#FFFFFF',
  disabled: '#E6E5E0',
  focus: '#606AA0',
};
export const tokens = {
  background: { textureOpacity: 0.65 },
  font: {
    title: 'RobotoMono-Bold',
    rounded: Platform.select({
      ios: 'ui-rounded',
      android: 'sans-serif',
      default: 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", system-ui, sans-serif',
    }),
    body: Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui' }),
  },
  border: 1,
  radius: 12,
  space: { xs: 4, sm: 8, md: 12, lg: 20, xl: 28, xxl: 40 },
  shadow: { offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 0, color: colors.border },
  button: {
    default: colors.yellow,
    hover: colors.mint,
    active: colors.cyan,
    disabled: colors.disabled,
    shift: 1,
  },
};
export const appFonts = {
  [tokens.font.title]: require('../../assets/fonts/RobotoMono-Bold.ttf'),
};
export const pixelShadow: ViewStyle = { boxShadow: [] };
export const outline = {
  borderWidth: tokens.border,
  borderColor: colors.border,
  borderRadius: tokens.radius,
} satisfies ViewStyle;
