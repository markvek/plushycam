import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { cameraProfiles } from '../../cameras.config';
import { bridgeOrigin, normalizeHost, validPort } from '../camera/config';
import { useCamera } from '../state/CameraProvider';
import { recentEvents } from '../camera/diagnostics';
import { Button, Card, Field, Loading, Pill, colors, confirmDelete, s } from '../components/ui';

export default function SettingsScreen() {
  const { ready, cameras, selected, saveCamera, removeCamera, selectCamera, setNotice } =
    useCamera();
  const [editId, setEditId] = useState<string>();
  const [profileId, setProfileId] = useState(cameraProfiles[0].id);
  const [nickname, setNickname] = useState('My camera');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('80');
  const [bridge, setBridge] = useState('');
  const [showBridge, setShowBridge] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const profile = cameraProfiles.find((p) => p.id === profileId) ?? cameraProfiles[0];
  const reset = () => {
    setEditId(undefined);
    setNickname('My camera');
    setHost('');
    setPort(String(profile.connection.defaultPort));
    setBridge('');
    setError(undefined);
  };
  const handleError = (e: unknown) =>
    setNotice(e instanceof Error ? e.message : 'Could not update camera.');

  async function save() {
    setError(undefined);
    setBusy(true);
    try {
      if (!nickname.trim()) throw new Error('Give your camera a name.');
      const normalized = normalizeHost(host);
      const portNumber = Number(port);
      if (!validPort(portNumber)) throw new Error('Enter a port between 1 and 65535.');
      const browserBridge = bridge.trim() ? bridgeOrigin(bridge.trim()) : undefined;
      await saveCamera({
        id: editId ?? `camera-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        profileId: profile.id,
        nickname: nickname.trim(),
        host: normalized,
        port: portNumber,
        browserBridge,
      });
      router.push('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this camera.');
    } finally {
      setBusy(false);
    }
  }
  if (!ready) return <Loading />;

  return (
    <View style={s.page}>
      <View style={{ gap: 10 }}>
        <Text style={[s.label, { color: colors.mint }]}>A PLACE FOR EVERY CAMERA</Text>
        <Text style={s.title}>Your connections.</Text>
        <Text style={s.subtitle}>Set up a camera once. Come back to it whenever you like.</Text>
      </View>
      {cameras.length > 0 && (
        <View style={{ gap: 12 }}>
          <Text style={s.heading}>Saved cameras</Text>
          {cameras.map((camera) => (
            <Card key={camera.id}>
              <View style={s.spread}>
                <View style={{ gap: 6 }}>
                  <Text style={s.heading}>{camera.nickname}</Text>
                  <Text style={s.small}>
                    {camera.host}:{camera.port ?? 80} ·{' '}
                    {cameraProfiles.find((p) => p.id === camera.profileId)?.model ??
                      'Profile unavailable'}
                  </Text>
                </View>
                <Pill
                  text={camera.id === selected?.id ? 'Selected' : 'Saved'}
                  active={camera.id === selected?.id}
                />
              </View>
              <View style={s.row}>
                <Button
                  title={`Use ${camera.nickname}`}
                  secondary
                  onPress={() => {
                    void selectCamera(camera.id)
                      .then(() => router.push('/'))
                      .catch(handleError);
                  }}
                />
                <Button
                  title="Edit"
                  secondary
                  onPress={() => {
                    setEditId(camera.id);
                    setProfileId(camera.profileId);
                    setNickname(camera.nickname);
                    setHost(camera.host);
                    setPort(String(camera.port ?? 80));
                    setBridge(camera.browserBridge ?? '');
                    setShowBridge(Boolean(camera.browserBridge));
                  }}
                />
                <Button
                  title="Remove camera"
                  secondary
                  onPress={() =>
                    confirmDelete(
                      'Remove this camera? Saved images will remain in your library.',
                      () => {
                        void removeCamera(camera.id).catch(handleError);
                      },
                    )
                  }
                />
              </View>
            </Card>
          ))}
        </View>
      )}
      <Card>
        <View style={s.spread}>
          <Text style={s.heading}>{editId ? 'Edit camera' : 'Add a camera'}</Text>
          {editId && <Button title="Add another instead" secondary onPress={reset} />}
        </View>
        <Text style={s.label}>01 / CHOOSE YOUR CAMERA</Text>
        {[...new Set(cameraProfiles.map((p) => p.brand))].map((brand) => (
          <View key={brand} style={{ gap: 10 }}>
            <Text style={s.text}>{brand}</Text>
            {cameraProfiles
              .filter((p) => p.brand === brand)
              .map((p) => (
                <Pressable
                  key={p.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: profileId === p.id }}
                  onPress={() => {
                    setProfileId(p.id);
                    setPort(String(p.connection.defaultPort));
                  }}
                  style={{
                    padding: 18,
                    borderRadius: 12,
                    backgroundColor: profileId === p.id ? '#20392F' : colors.bg,
                    borderWidth: 1,
                    borderColor: profileId === p.id ? '#7DA88E' : colors.border,
                    gap: 5,
                  }}
                >
                  <Text style={s.text}>
                    {profileId === p.id ? '◉  ' : '○  '}
                    {p.model}
                  </Text>
                  <Text style={s.small}>
                    {p.capabilities.snapshot ? 'Live view · Snapshots' : 'Live view'}
                  </Text>
                </Pressable>
              ))}
          </View>
        ))}
        <Text style={s.subtitle}>{profile.connection.setupInstructions}</Text>
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
        <Text style={s.label}>02 / MAKE THE CONNECTION</Text>
        <Field
          label="Camera name"
          value={nickname}
          onChangeText={setNickname}
          maxLength={60}
          placeholder="Desk camera"
        />
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 3 }}>
            <Field
              label="Camera address"
              value={host}
              onChangeText={setHost}
              placeholder="192.168.1.100"
              maxLength={253}
            />
          </View>
          <View style={{ flex: 1, maxWidth: 130 }}>
            <Field
              label="Port"
              value={port}
              onChangeText={setPort}
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>
        </View>
        {Platform.OS === 'web' && (
          <View style={{ gap: 12 }}>
            <Pressable accessibilityRole="button" onPress={() => setShowBridge(!showBridge)}>
              <Text style={[s.text, { color: colors.mint }]}>
                {showBridge ? '−' : '+'} Browser connection help
              </Text>
            </Pressable>
            {showBridge && (
              <View style={{ gap: 12 }}>
                <Text style={s.small}>
                  The original XIAO firmware needs a local bridge for browser live view. Start it on
                  your Mac using the setup instructions in README.md, then enter its address below.
                  Native apps connect directly to your camera.
                </Text>
                <Field
                  label="Browser bridge address (optional)"
                  value={bridge}
                  onChangeText={setBridge}
                  placeholder="http://127.0.0.1:8787"
                />
              </View>
            )}
          </View>
        )}
        <View style={{ padding: 16, borderRadius: 10, backgroundColor: colors.bg }}>
          <Text style={s.small}>
            {profile.capabilities.snapshot
              ? 'This profile supports live video and snapshots.'
              : 'This profile supports live video.'}{' '}
            On-camera recordings and settings are not available. No cloud account is needed.
          </Text>
        </View>
        {error && (
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>
            {error}
          </Text>
        )}
        <View style={s.row}>
          <Button
            title={busy ? 'Saving…' : 'Save camera'}
            onPress={() => {
              void save();
            }}
            disabled={busy}
          />
          <Text style={s.small}>You can test the connection from the Camera screen.</Text>
        </View>
      </Card>
      <View style={{ gap: 12 }}>
        <Pressable accessibilityRole="button" onPress={() => setShowHistory(!showHistory)}>
          <Text style={[s.text, { color: colors.mint }]}>
            {showHistory ? '−' : '+'} Connection history
          </Text>
        </Pressable>
        {showHistory && (
          <Card>
            <Text style={s.small}>
              Recent activity from this app session. Addresses and images are not included.
            </Text>
            {recentEvents().length === 0 ? (
              <Text style={s.small}>No connection activity yet.</Text>
            ) : (
              recentEvents()
                .slice(-15)
                .reverse()
                .map((event, i) => (
                  <Text key={`${event.at}-${i}`} style={s.small}>
                    {new Date(event.at).toLocaleTimeString()} · {event.event} · {event.state}
                    {event.attempt ? ` · retry ${event.attempt}` : ''}
                  </Text>
                ))
            )}
          </Card>
        )}
      </View>
    </View>
  );
}
