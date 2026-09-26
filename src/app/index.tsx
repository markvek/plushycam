import { useMemo, useState } from 'react';
import { Image, Modal, Text, View, useWindowDimensions } from 'react-native';
import { fromByteArray } from 'base64-js';
import { router } from 'expo-router';
import { useCamera } from '../state/CameraProvider';
import { Button, CameraGlyph, Card, Loading, Pill, colors, s } from '../components/ui';

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
    checkingBridge,
    media,
    setNotice,
  } = useCamera();
  const [fullscreen, setFullscreen] = useState(false);
  const [decodeFailed, setDecodeFailed] = useState(false);
  const { width } = useWindowDimensions();
  const wide = width >= 900;
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

  const preview = (large = false) => (
    <View
      style={{
        backgroundColor: '#050A0D',
        borderRadius: large ? 0 : 16,
        overflow: 'hidden',
        aspectRatio: 16 / 10,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {uri ? (
        <Image
          testID="live-frame"
          accessibilityLabel="Live camera frame"
          source={{ uri }}
          resizeMode="contain"
          onLoad={() => setDecodeFailed(false)}
          onError={() => {
            setDecodeFailed(true);
            setNotice('The camera frame could not be displayed. Check the firmware image format.');
          }}
          style={{ position: 'absolute', width: '100%', height: '100%', opacity: active ? 1 : 0.3 }}
        />
      ) : (
        <View style={{ alignItems: 'center', gap: 24 }}>
          <View
            style={{
              padding: 35,
              borderWidth: 1,
              borderColor: '#233B3C',
              borderRadius: 100,
              backgroundColor: '#101F22',
            }}
          >
            <CameraGlyph size={60} />
          </View>
          <Text style={{ color: colors.text, fontSize: 19 }}>
            {selected ? 'Your next view is one tap away' : 'A new point of view starts here'}
          </Text>
          <Text style={[s.small, { textAlign: 'center', maxWidth: 260 }]}>
            {selected
              ? 'Connect your camera to bring it into focus.'
              : 'Add your camera to see what it sees.'}
          </Text>
        </View>
      )}
      <View style={{ position: 'absolute', left: 16, top: 16 }}>
        <Pill
          text={
            active
              ? 'LIVE'
              : state.snapshot === 'capturing'
                ? 'TAKING SNAPSHOT'
                : pending
                  ? 'CONNECTING'
                  : 'OFFLINE'
          }
          active={active}
        />
      </View>
      <View style={{ position: 'absolute', right: 16, top: 18 }}>
        <Text style={[s.small, { color: '#B2C6CB' }]}>PLUSHYCAM / 01</Text>
      </View>
      {state.live === 'stalled' && (
        <View
          style={{
            position: 'absolute',
            bottom: 18,
            left: 18,
            right: 18,
            backgroundColor: '#19272DEE',
            padding: 12,
            borderRadius: 8,
          }}
        >
          <Text style={s.text}>Feed interrupted · retry {state.attempt}</Text>
          <Text style={s.small}>
            {state.frame
              ? `Last frame received at ${new Date(state.frame.receivedAt).toLocaleTimeString()}`
              : 'Waiting for the first frame'}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={s.page}>
      <View style={s.spread}>
        <View style={{ gap: 10 }}>
          <Text style={[s.label, { color: colors.mint }]}>YOUR EVERYDAY VIEW</Text>
          <Text style={s.title}>
            {selected ? 'Let’s see what’s out there.' : 'A little camera. A bigger view.'}
          </Text>
          <Text style={s.subtitle}>Connect locally. Stay in the moment. Keep what matters.</Text>
        </View>
        <Pill text={selected ? 'CAMERA CONFIGURED' : 'LET’S GET CONNECTED'} />
      </View>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 24, alignItems: 'stretch' }}>
        <View style={{ flex: wide ? 2.25 : undefined, gap: 18 }}>
          {preview()}
          <View style={s.spread}>
            <View style={{ gap: 5 }}>
              <Text style={s.heading}>{selected?.nickname ?? 'Your camera, right here'}</Text>
              <Text style={s.small}>
                {profile
                  ? `${profile.brand} · ${profile.model}`
                  : 'Ready for your first connection'}
              </Text>
            </View>
            <View style={s.row}>
              {selected && profile ? (
                <>
                  <Button
                    title={
                      checkingBridge
                        ? 'Cancel connection'
                        : state.connection === 'disconnected'
                          ? 'Connect camera'
                          : 'Disconnect'
                    }
                    onPress={() =>
                      handle(
                        state.connection === 'disconnected' && !checkingBridge
                          ? connect
                          : disconnect,
                      )
                    }
                    secondary={state.connection !== 'disconnected'}
                  />
                  <Button title="Expand view" onPress={() => setFullscreen(true)} secondary />
                </>
              ) : (
                <Button title="Add your camera" onPress={() => router.push('/settings')} />
              )}
            </View>
          </View>
          {state.error && (
            <Text accessibilityRole="alert" style={[s.small, { color: colors.danger }]}>
              {state.error}
            </Text>
          )}
        </View>
        <View style={{ flex: wide ? 1 : undefined, gap: 18 }}>
          <Card>
            <Text style={s.label}>CAMERA CONNECTION</Text>
            <View style={s.spread}>
              <CameraGlyph size={36} />
              <Pill text={active ? 'Connected' : 'Not connected'} active={active} />
            </View>
            <Text style={s.heading}>{profile?.model ?? 'Make it yours'}</Text>
            <Text style={s.subtitle}>
              {selected
                ? 'A direct link to your camera, over your local network.'
                : 'Choose your camera model, add its address, and you’re ready to look around.'}
            </Text>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <View style={s.spread}>
              <Text style={s.small}>Connection</Text>
              <Text style={s.text}>Local Wi-Fi</Text>
            </View>
            <View style={s.spread}>
              <Text style={s.small}>Address</Text>
              <Text style={s.text}>{selected?.host ?? 'Not configured'}</Text>
            </View>
            <Button
              title={selected ? 'Manage cameras' : 'Set up a camera'}
              secondary
              onPress={() => router.push('/settings')}
            />
          </Card>
          {(!profile || profile.capabilities.snapshot) && (
            <Card style={{ backgroundColor: '#18352B', borderColor: '#305443' }}>
              <Text style={[s.label, { color: colors.mint }]}>KEEP A LITTLE MOMENT</Text>
              <Text style={s.heading}>See something worth saving?</Text>
              <Text style={s.subtitle}>Take a snapshot and keep it in your own library.</Text>
              <Button
                title={saving ? 'Saving snapshot…' : 'Take snapshot'}
                disabled={!active || saving || !profile?.capabilities.snapshot}
                onPress={() => {
                  void capture();
                }}
              />
              {saving && <Text style={s.small}>Live view briefly pauses for your snapshot.</Text>}
            </Card>
          )}
        </View>
      </View>
      <View style={s.spread}>
        <View style={{ gap: 6 }}>
          <Text style={s.heading}>Your recent moments</Text>
          <Text style={s.small}>
            {media.length
              ? `${media.length} saved ${media.length === 1 ? 'snapshot' : 'snapshots'}`
              : 'Your snapshots will feel right at home here.'}
          </Text>
        </View>
        <Button title="Open library" secondary onPress={() => router.push('/saved')} />
      </View>
      {media.length > 0 ? (
        <View style={[s.row, { alignItems: 'stretch' }]}>
          {media.slice(0, 3).map((item) => (
            <View key={item.id} style={{ flex: 1, minWidth: 180, gap: 9 }}>
              <Image
                source={{ uri: item.uri }}
                style={{ width: '100%', aspectRatio: 1.7, borderRadius: 12 }}
              />
              <Text style={s.small}>
                {item.cameraName} ·{' '}
                {new Date(item.savedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View
          style={{
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: colors.border,
            borderRadius: 16,
            padding: 28,
          }}
        >
          <Text style={[s.small, { textAlign: 'center' }]}>
            No snapshots yet. Connect your camera and capture your first moment.
          </Text>
        </View>
      )}
      <Modal visible={fullscreen} animationType="fade" onRequestClose={() => setFullscreen(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.bg,
            justifyContent: 'center',
            padding: 20,
            gap: 20,
          }}
        >
          {preview(true)}
          <Button title="Close expanded view" onPress={() => setFullscreen(false)} />
        </View>
      </Modal>
    </View>
  );
}
