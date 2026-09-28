import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { cameraProfiles } from '../../cameras.config';
import { bridgeOrigin, normalizeHost, validPort } from '../camera/config';
import { useCamera } from '../state/CameraProvider';
import { recentEvents } from '../camera/diagnostics';
import {
  Button,
  Card,
  Field,
  Loading,
  Pill,
  PixelControl,
  colors,
  confirmDelete,
  s,
  tokens,
} from './ui';
import { AppIcon } from './AppIcon';

export function CameraSettings({ onDone }: { onDone: () => void }) {
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
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this camera.');
    } finally {
      setBusy(false);
    }
  }
  if (!ready) return <Loading />;

  return (
    <View style={s.page}>
      {cameras.length > 0 && (
        <View style={{ gap: 12 }}>
          <Text style={[s.heading, s.onBackground]}>Saved cameras</Text>
          {cameras.map((camera) => (
            <Card key={camera.id} style={{ backgroundColor: colors.cyan }}>
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
                  icon="check"
                  title={`Use ${camera.nickname}`}
                  secondary
                  onPress={() => {
                    void selectCamera(camera.id)
                      .then(() => onDone())
                      .catch(handleError);
                  }}
                />
                <Button
                  icon="edit"
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
                  icon="delete"
                  title="Remove camera"
                  danger
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
          <View style={s.row}>
            <AppIcon name={editId ? 'edit' : 'add'} />
            <Text style={s.heading}>{editId ? 'Edit camera' : 'Add a camera'}</Text>
          </View>
          {editId && <Button icon="add" title="Add another instead" secondary onPress={reset} />}
        </View>
        <Text style={s.label}>Camera model</Text>
        {[...new Set(cameraProfiles.map((p) => p.brand))].map((brand) => (
          <View key={brand} style={{ gap: 10 }}>
            <Text style={s.text}>{brand}</Text>
            {cameraProfiles
              .filter((p) => p.brand === brand)
              .map((p) => (
                <PixelControl
                  key={p.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: profileId === p.id }}
                  onPress={() => {
                    setProfileId(p.id);
                    setPort(String(p.connection.defaultPort));
                  }}
                  style={{
                    padding: 18,
                    borderRadius: tokens.radius,
                    backgroundColor: profileId === p.id ? colors.mint : colors.panel,
                    borderWidth: tokens.border,
                    borderColor: colors.border,
                    gap: 5,
                  }}
                >
                  <View style={[s.row, { flexWrap: 'nowrap', gap: 8 }]}>
                    <AppIcon name={profileId === p.id ? 'selected' : 'radio'} />
                    <Text style={[s.text, { flexShrink: 1 }]}>{p.model}</Text>
                  </View>
                  <Text style={s.small}>
                    {p.capabilities.snapshot ? 'Live view · Snapshots' : 'Live view'}
                  </Text>
                </PixelControl>
              ))}
          </View>
        ))}
        <Text style={s.subtitle}>{profile.connection.setupInstructions}</Text>
        <View style={[s.divider, { marginVertical: 8 }]} />
        <Text style={s.label}>Connection details</Text>
        <Field
          label="Camera name"
          value={nickname}
          onChangeText={setNickname}
          maxLength={60}
          placeholder="Desk camera"
        />
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 3, minWidth: 0 }}>
            <Field
              label="Camera address"
              value={host}
              onChangeText={setHost}
              placeholder="192.168.1.100"
              maxLength={253}
            />
          </View>
          <View style={{ flex: 1, minWidth: 74, maxWidth: 130 }}>
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
            <Button
              icon={showBridge ? 'up' : 'down'}
              title="Browser connection help"
              secondary
              expanded={showBridge}
              onPress={() => setShowBridge(!showBridge)}
            />
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
        <View
          style={{
            padding: 16,
            borderWidth: tokens.border,
            borderColor: colors.border,
            backgroundColor: colors.cyan,
          }}
        >
          <Text style={s.small}>On-camera recordings and settings are not supported.</Text>
        </View>
        {error && (
          <Text accessibilityRole="alert" style={[s.text, s.alert]}>
            {error}
          </Text>
        )}
        <View style={s.row}>
          <Button
            icon="save"
            title={busy ? 'Saving…' : 'Save camera'}
            onPress={() => {
              void save();
            }}
            disabled={busy}
          />
        </View>
      </Card>
      <View style={{ gap: 12 }}>
        <Button
          icon={showHistory ? 'up' : 'down'}
          title="Connection history"
          secondary
          expanded={showHistory}
          onPress={() => setShowHistory(!showHistory)}
        />
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
