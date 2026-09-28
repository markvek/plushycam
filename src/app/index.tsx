import { useMemo, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fromByteArray } from 'base64-js';
import { jpegAspectRatio } from '../camera/mjpeg';
import { router } from 'expo-router';
import { useCamera } from '../state/CameraProvider';
import { Button, Loading, Pill, colors, s, tokens } from '../components/ui';
import { AppIcon } from '../components/AppIcon';
import { outline } from '../components/theme';
import { AppBackground } from '../components/AppBackground';
import { LoadingItem } from '../components/loading/LoadingItem';

export default function CameraScreen() {
  const {
    selected,
    profile,
    ready,
    state,
    connect,
    disconnect,
    capture,
    saving,
    captureInfo,
    checkingBridge,
    setNotice,
  } = useCamera();
  const [fullscreen, setFullscreen] = useState(false);
  const [decodeFailed, setDecodeFailed] = useState(false);
  // Web image-load events omit source dimensions; read the JPEG header instead.
  const frameAspectRatio = useMemo(
    () => (state.frame ? jpegAspectRatio(state.frame.bytes) : undefined) ?? 4 / 3,
    [state.frame],
  );
  const uri = useMemo(
    () => (state.frame ? `data:image/jpeg;base64,${fromByteArray(state.frame.bytes)}` : undefined),
    [state.frame],
  );
  const active = state.connection === 'connected' && state.live === 'playing' && !decodeFailed;
  const pending =
    checkingBridge || state.connection === 'connecting' || state.connection === 'reconnecting';
  const handle = (operation: () => Promise<unknown>) => {
    void operation().catch((error) =>
      setNotice(error instanceof Error ? error.message : 'Operation failed.'),
    );
  };
  if (!ready) return <Loading />;

  const preview = () => (
    <View style={[outline, { overflow: 'hidden', backgroundColor: colors.panel, width: '100%' }]}>
      <View
        style={[
          s.spread,
          {
            backgroundColor: colors.raised,
            padding: 12,
            borderBottomWidth: tokens.border,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[s.row, { gap: 8 }]}>
          <AppIcon name="camera" />
          <Text style={s.label}>Live view</Text>
        </View>
        <Pill
          text={
            active
              ? 'LIVE'
              : state.snapshot === 'capturing'
                ? 'SAVING'
                : pending
                  ? 'CONNECTING'
                  : 'OFFLINE'
          }
          active={active}
        />
      </View>
      <View
        testID="live-container"
        style={{
          backgroundColor: uri ? colors.ink : colors.bg,
          minHeight: uri ? undefined : 280,
          aspectRatio: uri ? frameAspectRatio : undefined,
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: uri ? 0 : 50,
          overflow: 'hidden',
        }}
      >
        {!uri && <AppBackground style={StyleSheet.absoluteFill}>{null}</AppBackground>}
        {uri ? (
          <Image
            testID="live-frame"
            accessibilityLabel="Live camera frame"
            source={{ uri }}
            resizeMode="contain"
            onLoad={() => setDecodeFailed(false)}
            onError={() => {
              setDecodeFailed(true);
              setNotice(
                'The camera frame could not be displayed. Check the firmware image format.',
              );
            }}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              opacity: active ? 1 : 0.3,
            }}
          />
        ) : (
          <View style={{ alignItems: 'center', gap: 16, paddingHorizontal: 20 }}>
            <LoadingItem size={176} />
            <Text
              style={[
                s.heading,
                s.onBackground,
                { fontFamily: tokens.font.title, fontWeight: 'normal', textAlign: 'center' },
              ]}
            >
              {pending ? 'Connecting…' : selected ? 'Camera disconnected' : 'No camera selected'}
            </Text>
          </View>
        )}
        {state.live === 'stalled' && (
          <View style={[s.alert, { position: 'absolute', bottom: 12, left: 12, right: 12 }]}>
            <Text style={s.text}>Feed interrupted · retry {state.attempt}</Text>
            <Text style={s.small}>
              {state.frame
                ? `Last frame received at ${new Date(state.frame.receivedAt).toLocaleTimeString()}`
                : 'Waiting for the first frame'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={s.page}>
      <Text accessibilityRole="header" style={s.title}>
        Camera
      </Text>
      {preview()}
      <View style={s.spread}>
        {selected && (
          <View style={{ gap: 4, flexShrink: 1 }}>
            <Text style={[s.heading, s.onBackground]}>{selected.nickname}</Text>
            <Text style={[s.small, s.mutedOnBackground]}>
              {profile?.model ?? 'Camera'} · {selected.host}
            </Text>
          </View>
        )}
        <View style={s.row}>
          {selected && profile ? (
            <>
              <Button
                icon={
                  state.connection === 'disconnected' && !checkingBridge ? 'connect' : 'disconnect'
                }
                title={
                  checkingBridge
                    ? 'Cancel connection'
                    : state.connection === 'disconnected'
                      ? 'Connect camera'
                      : 'Disconnect'
                }
                onPress={() =>
                  handle(
                    state.connection === 'disconnected' && !checkingBridge ? connect : disconnect,
                  )
                }
                secondary={state.connection !== 'disconnected'}
              />
              <Button
                icon="expand"
                title="Expand view"
                onPress={() => setFullscreen(true)}
                secondary
              />
            </>
          ) : (
            <Button icon="add" title="Add your camera" onPress={() => router.push('/settings')} />
          )}
          {(!profile || profile.capabilities.snapshot) && (
            <Button
              icon="camera"
              title={saving ? 'Saving footage…' : 'Save footage'}
              disabled={!active || saving || !profile?.capabilities.snapshot}
              onPress={() => {
                void capture();
              }}
            />
          )}
        </View>
      </View>
      {saving && (
        <Text style={[s.small, s.mutedOnBackground]}>
          Live view briefly pauses while saving.
        </Text>
      )}
      {captureInfo && (
        <View
          testID="footage-info"
          accessibilityLiveRegion="polite"
          style={{
            paddingVertical: 12,
            borderTopWidth: tokens.border,
            borderColor: colors.mutedOnBackground,
          }}
        >
          <Text style={[s.small, s.onBackground]}>{captureInfo}</Text>
        </View>
      )}
      {state.error && (
        <Text accessibilityRole="alert" style={[s.text, s.alert]}>
          {state.error}
        </Text>
      )}
      <Modal visible={fullscreen} animationType="fade" onRequestClose={() => setFullscreen(false)}>
        <AppBackground style={{ padding: 20, gap: 20 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          >
            {preview()}
          </ScrollView>
          <Button icon="close" title="Close expanded view" onPress={() => setFullscreen(false)} />
        </AppBackground>
      </Modal>
    </View>
  );
}
