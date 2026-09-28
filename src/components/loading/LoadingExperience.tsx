import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppBackground } from '../AppBackground';
import { LoadingItem } from './LoadingItem';

export function LoadingExperience() {
  const { width, height } = useWindowDimensions();
  const size = Math.max(1, Math.min(width - 16, height - 32, 880)) / 5;
  return (
    <AppBackground>
      <View testID="loading-screen" style={styles.screen}>
        <StatusBar style="dark" />
        <Text accessibilityRole="header" style={styles.srOnly}>
          PLUSHY CAM001
        </Text>
        <LoadingItem size={size} />
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
});
