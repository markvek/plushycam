import { useState } from 'react';
import { Image, Modal, Platform, Text, View, useWindowDimensions } from 'react-native';
import { AppBackground } from './AppBackground';
import { useCamera } from '../state/CameraProvider';
import type { SavedMedia } from '../media/types';
import { Button, Loading, PixelControl, PixelBadge, colors, confirmDelete, s, tokens } from './ui';

export function SavedCollection({ onCamera }: { onCamera: () => void }) {
  const { media, ready, removeMedia, exportMedia, setNotice } = useCamera();
  const [opened, setOpened] = useState<SavedMedia>();
  const { width } = useWindowDimensions();
  const handle = (operation: () => Promise<unknown>) => {
    void operation().catch((e) =>
      setNotice(e instanceof Error ? e.message : 'Could not complete this action.'),
    );
  };
  if (!ready) return <Loading />;
  return (
    <View style={s.page}>
      <View style={s.spread}>
        <View style={{ gap: 10, maxWidth: '100%' }}>
          <Text accessibilityRole="header" style={s.title}>
            Library
          </Text>
        </View>
        <PixelBadge
          text={`${media.length} ${media.length === 1 ? 'snapshot' : 'snapshots'}`}
          active={media.length > 0}
        />
      </View>
      {Platform.OS === 'web' && (
        <Text
          style={[
            s.small,
            s.mutedOnBackground,
            {
              paddingVertical: 4,
            },
          ]}
        >
          Saved in this browser. Export images before clearing browser data.
        </Text>
      )}
      {media.length === 0 ? (
        <View style={{ paddingVertical: 24, gap: 8 }}>
          <Text style={[s.text, s.onBackground]}>No saved snapshots</Text>
          <Text style={[s.small, s.mutedOnBackground]}>Take a snapshot from the Camera page.</Text>
          <View style={s.row}>
            <Button icon="camera" title="Go to camera" secondary onPress={onCamera} />
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
          {media.map((item) => (
            <View
              key={item.id}
              style={[
                s.card,
                {
                  padding: 0,
                  overflow: 'hidden',
                  width: width < 650 ? '100%' : width < 1000 ? '47%' : '31%',
                },
              ]}
            >
              <PixelControl
                accessibilityRole="button"
                accessibilityLabel={`Open snapshot from ${item.cameraName}`}
                onPress={() => setOpened(item)}
                style={{
                  padding: 0,
                  borderWidth: 0,
                  borderBottomWidth: tokens.border,
                  boxShadow: [],
                  backgroundColor: colors.raised,
                }}
              >
                <Image source={{ uri: item.uri }} style={{ width: '100%', aspectRatio: 1.5 }} />
              </PixelControl>
              <View style={{ padding: 18, paddingTop: 0, gap: 12 }}>
                <Text style={s.heading}>{item.cameraName}</Text>
                <Text style={s.small}>
                  {new Date(item.savedAt).toLocaleString()} · {Math.round(item.size / 1024)} KB
                </Text>
                <View style={s.row}>
                  <Button
                    icon={Platform.OS === 'web' ? 'download' : 'share'}
                    title={Platform.OS === 'web' ? 'Export image' : 'Share image'}
                    secondary
                    onPress={() => handle(() => exportMedia(item))}
                  />
                  <Button
                    icon="delete"
                    title="Delete"
                    danger
                    onPress={() =>
                      confirmDelete('Delete this saved snapshot from this device?', () =>
                        handle(() => removeMedia(item)),
                      )
                    }
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
      <Modal visible={Boolean(opened)} onRequestClose={() => setOpened(undefined)}>
        <AppBackground
          style={{
            justifyContent: 'center',
            padding: 24,
            gap: 22,
          }}
        >
          {opened && (
            <>
              <Image
                source={{ uri: opened.uri }}
                resizeMode="contain"
                style={{ width: '100%', flex: 1 }}
              />
              <Text style={[s.text, s.onBackground]}>
                {opened.cameraName} · {new Date(opened.savedAt).toLocaleString()}
              </Text>
              <View style={s.row}>
                <Button
                  icon="download"
                  title="Export snapshot"
                  onPress={() => handle(() => exportMedia(opened))}
                />
                <Button
                  icon="close"
                  title="Close image"
                  secondary
                  onPress={() => setOpened(undefined)}
                />
              </View>
            </>
          )}
        </AppBackground>
      </Modal>
    </View>
  );
}
