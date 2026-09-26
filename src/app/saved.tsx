import { useState } from 'react';
import { Image, Modal, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useCamera } from '../state/CameraProvider';
import type { SavedMedia } from '../media/types';
import { Button, Empty, Loading, colors, confirmDelete, s } from '../components/ui';

export default function SavedScreen() {
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
        <View style={{ gap: 10 }}>
          <Text style={[s.label, { color: colors.mint }]}>THE MOMENTS YOU KEEP</Text>
          <Text style={s.title}>Your little collection.</Text>
          <Text style={s.subtitle}>Saved here. Ready whenever you are.</Text>
        </View>
        <Text style={s.small}>
          {media.length} {media.length === 1 ? 'snapshot' : 'snapshots'}
        </Text>
      </View>
      {Platform.OS === 'web' && (
        <Text style={s.small}>
          Images are saved in this browser on this device. Export the ones you want to keep before
          clearing browser data.
        </Text>
      )}
      {media.length === 0 ? (
        <Empty
          title="Room for your first moment"
          text="Take a snapshot from your live camera. It will be waiting here, even when your camera is disconnected."
        >
          <Button title="Go to camera" onPress={() => router.push('/')} />
        </Empty>
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open snapshot from ${item.cameraName}`}
                onPress={() => setOpened(item)}
              >
                <Image source={{ uri: item.uri }} style={{ width: '100%', aspectRatio: 1.5 }} />
              </Pressable>
              <View style={{ padding: 18, paddingTop: 0, gap: 12 }}>
                <Text style={s.heading}>{item.cameraName}</Text>
                <Text style={s.small}>
                  {new Date(item.savedAt).toLocaleString()} · {Math.round(item.size / 1024)} KB
                </Text>
                <View style={s.row}>
                  <Button
                    title={Platform.OS === 'web' ? 'Export image' : 'Share image'}
                    secondary
                    onPress={() => handle(() => exportMedia(item))}
                  />
                  <Button
                    title="Delete"
                    secondary
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
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            backgroundColor: colors.bg,
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
              <Text style={s.text}>
                {opened.cameraName} · {new Date(opened.savedAt).toLocaleString()}
              </Text>
              <View style={s.row}>
                <Button title="Export snapshot" onPress={() => handle(() => exportMedia(opened))} />
                <Button title="Close image" secondary onPress={() => setOpened(undefined)} />
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}
