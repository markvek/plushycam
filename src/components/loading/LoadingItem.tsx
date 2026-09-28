import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, Pressable, StyleSheet, View } from 'react-native';
import WireGlobe from './WireGlobe';
import { LoadingTitle } from './LoadingTitle';
import { loadingColors } from './globe';

// Shared by the standalone preview and the camera's empty state.
export function LoadingItem({ size }: { size: number }) {
  const [reducedMotion, setReducedMotion] = useState(true);
  const [active, setActive] = useState(AppState.currentState !== 'background');
  const [paused, setPaused] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReducedMotion(value);
      })
      .catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    const app = AppState.addEventListener('change', (value) => setActive(value === 'active'));
    return () => {
      mounted = false;
      motion?.remove();
      app?.remove();
    };
  }, []);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={paused ? 'Resume globe rotation' : 'Pause globe rotation'}
      accessibilityHint="Motion stays off when reduced motion is enabled."
      accessibilityState={{ disabled: reducedMotion }}
      disabled={reducedMotion}
      onPress={() => setPaused((value) => !value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[styles.stage, { width: size, height: size }, focused && styles.focused]}
    >
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        aria-hidden
      >
        <WireGlobe size={size} spinning={active && !paused && !reducedMotion} />
        <View style={styles.title}>
          <LoadingTitle width={size * 0.86} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  focused: { outlineColor: loadingColors.title, outlineWidth: 2, outlineStyle: 'solid' },
  title: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
