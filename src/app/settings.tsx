import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { CameraSettings } from '../components/CameraSettings';
import { s } from '../components/ui';

export default function SettingsScreen() {
  return (
    <View style={s.page}>
      <Text accessibilityRole="header" style={s.title}>
        Manage cameras
      </Text>
      <CameraSettings onDone={() => router.push('/')} />
    </View>
  );
}
