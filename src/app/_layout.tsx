import { Slot, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { CameraProvider, useCamera } from '../state/CameraProvider';
import { CameraGlyph, colors, s } from '../components/ui';

const navigation = [
  { path: '/', title: 'Camera', symbol: '◉' },
  { path: '/saved', title: 'Saved media', symbol: '▧' },
  { path: '/settings', title: 'Cameras', symbol: '⊞' },
] as const;

function Shell() {
  const path = usePathname();
  const { width } = useWindowDimensions();
  const mobile = width < 700;
  const { notice, setNotice } = useCamera();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <View style={{ borderBottomWidth: 1, borderColor: colors.border }}>
        <View
          style={{
            width: '100%',
            maxWidth: 1240,
            alignSelf: 'center',
            paddingHorizontal: mobile ? 22 : 36,
            minHeight: 88,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="PlushyCam home"
            onPress={() => router.push('/')}
            style={[s.row, { gap: 12 }]}
          >
            <CameraGlyph size={29} />
            <Text
              style={{ color: colors.text, fontWeight: '700', fontSize: 24, letterSpacing: -1 }}
            >
              plushycam<Text style={{ color: colors.mint }}>.</Text>
            </Text>
          </Pressable>
          {!mobile && (
            <View style={[s.row, { gap: 6 }]}>
              {navigation.map((item) => (
                <Pressable
                  key={item.path}
                  accessibilityRole="link"
                  accessibilityState={{ selected: path === item.path }}
                  onPress={() => router.push(item.path)}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 13,
                    borderRadius: 10,
                    backgroundColor: path === item.path ? colors.raised : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      color: path === item.path ? colors.mint : colors.muted,
                      fontWeight: '600',
                    }}
                  >
                    {item.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          {!mobile && <Text style={s.small}>YOUR CAMERA. YOUR CONNECTION.</Text>}
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{
          width: '100%',
          maxWidth: 1240,
          alignSelf: 'center',
          padding: mobile ? 22 : 36,
          paddingTop: mobile ? 28 : 40,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {notice && (
          <View
            accessibilityRole="alert"
            style={{
              backgroundColor: '#21382F',
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <Text style={[s.text, { flex: 1, color: colors.mint }]}>{notice}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss message"
              onPress={() => setNotice(undefined)}
            >
              <Text style={[s.text, { padding: 6 }]}>×</Text>
            </Pressable>
          </View>
        )}
        <Slot />
        <View
          style={[
            s.spread,
            { borderTopWidth: 1, borderColor: colors.border, paddingTop: 22, marginTop: 20 },
          ]}
        >
          <Text style={s.small}>A closer connection to your world.</Text>
          <Text style={s.small}>LOCAL FIRST · PLUSHYCAM 0.1</Text>
        </View>
      </ScrollView>
      {mobile && (
        <View
          style={{
            flexDirection: 'row',
            borderTopWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.panel,
          }}
        >
          {navigation.map((item) => (
            <Pressable
              accessibilityRole="link"
              accessibilityState={{ selected: path === item.path }}
              key={item.path}
              onPress={() => router.push(item.path)}
              style={{ flex: 1, alignItems: 'center', padding: 15, gap: 4 }}
            >
              <Text
                style={{ color: path === item.path ? colors.mint : colors.muted, fontSize: 20 }}
              >
                {item.symbol}
              </Text>
              <Text
                style={{ color: path === item.path ? colors.mint : colors.muted, fontSize: 11 }}
              >
                {item.title}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <CameraProvider>
        <Shell />
      </CameraProvider>
    </SafeAreaProvider>
  );
}
