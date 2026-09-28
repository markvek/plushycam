import { useFonts } from 'expo-font';
import { Platform, Text } from 'react-native';
import { loadingColors } from './globe';
import { appFonts, tokens } from '../theme';

export function LoadingTitle({ width }: { width: number }) {
  const [loaded, error] = useFonts(appFonts);
  if (!loaded && !error) return null;

  return (
    <Text
      testID="loading-title"
      accessible={false}
      aria-hidden
      allowFontScaling={false}
      style={{
        width,
        fontFamily: loaded
          ? tokens.font.title
          : Platform.select({ ios: 'Menlo', default: 'monospace' }),
        fontSize: width / 4,
        lineHeight: width * 0.28,
        letterSpacing: width * 0.01,
        textAlign: 'center',
        includeFontPadding: false,
        color: loadingColors.title,
        textShadowColor: loadingColors.shadow,
        textShadowOffset: { width: width * 0.006, height: width * 0.009 },
        textShadowRadius: 0,
      }}
    >
      {'PLUSHY\nCAM001'}
    </Text>
  );
}
