import { Link, Slot, usePathname } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { Image, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { CameraProvider, useCamera } from '../state/CameraProvider';
import { PixelControl, PixelIconButton, colors, s, tokens } from '../components/ui';
import { AppIcon, type AppIconName } from '../components/AppIcon';
import { AppBackground } from '../components/AppBackground';
import { appFonts } from '../components/theme';

const navigation: { path: '/' | '/saved' | '/settings'; title: string; icon: AppIconName }[] = [
  { path: '/', title: 'Camera', icon: 'camera' },
  { path: '/saved', title: 'Open library', icon: 'album' },
  { path: '/settings', title: 'Manage cameras', icon: 'settings' },
];

function Shell() {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const compact = width < 840;
  const { notice, setNotice } = useCamera();
  if (pathname === '/loading') return <Slot />;
  return (
    <AppBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <View
          style={{
            width: '100%',
            maxWidth: 1080,
            alignSelf: 'center',
            padding: width < 700 ? 18 : 32,
            gap: 20,
            flexDirection: compact ? 'column' : 'row',
            alignItems: compact ? 'stretch' : 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={s.row}>
            <Image
              source={require('../../assets/plushycam-logo.png')}
              accessibilityLabel="PlushyCam logo"
              resizeMode="contain"
              style={{ width: 44, height: 44 }}
            />
            <Text
              style={{
                fontFamily: tokens.font.title,
                fontSize: 30,
                color: colors.onBackground,
              }}
            >
              plushycam.
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: compact ? 8 : 12 }}>
            {navigation.map((item) => (
              <Link key={item.path} href={item.path} asChild>
                <PixelControl
                  accessibilityRole="link"
                  accessibilityLabel={item.title}
                  accessibilityState={{ selected: pathname === item.path }}
                  selected={pathname === item.path}
                  style={{
                    flex: compact ? 1 : undefined,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: compact ? 6 : 8,
                    paddingHorizontal: compact ? 8 : 14,
                  }}
                >
                  <AppIcon name={item.icon} size={compact ? 18 : 20} />
                  <Text
                    style={{
                      color: colors.text,
                      fontFamily: tokens.font.body,
                      fontWeight: '600',
                      fontSize: width < 400 ? 12 : 14,
                      flexShrink: 1,
                    }}
                  >
                    {item.title}
                  </Text>
                </PixelControl>
              </Link>
            ))}
          </View>
        </View>
        <ScrollView
          key={pathname}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            width: '100%',
            maxWidth: 1080,
            alignSelf: 'center',
            paddingHorizontal: width < 700 ? 18 : 32,
            paddingBottom: 32,
            gap: 24,
          }}
        >
          {notice && (
            <View
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={[s.alert, s.row]}
            >
              <Text style={[s.text, { flex: 1 }]}>{notice}</Text>
              <PixelIconButton label="Dismiss message" onPress={() => setNotice(undefined)} />
            </View>
          )}
          <Slot />
        </ScrollView>
      </SafeAreaView>
    </AppBackground>
  );
}

export default function Layout() {
  const [fontsLoaded, fontError] = useFonts(appFonts);
  if (!fontsLoaded && !fontError) return <AppBackground>{null}</AppBackground>;
  return (
    <SafeAreaProvider>
      <CameraProvider>
        <Shell />
      </CameraProvider>
    </SafeAreaProvider>
  );
}
