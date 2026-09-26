import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

export const colors = {
  bg: '#0B1114',
  panel: '#121C21',
  raised: '#19272D',
  border: '#28383E',
  text: '#F2F6F4',
  muted: '#97A9AE',
  mint: '#BAF7D4',
  ink: '#153528',
  danger: '#FFB1A7',
};
export const s = StyleSheet.create({
  page: { gap: 28, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  spread: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    gap: 16,
  },
  title: { color: colors.text, fontSize: 34, fontWeight: '600', letterSpacing: -1.1 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 24 },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  heading: { color: colors.text, fontSize: 19, fontWeight: '600' },
  text: { color: colors.text, fontSize: 14, lineHeight: 22 },
  small: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  field: {
    color: colors.text,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    minHeight: 48,
    fontSize: 15,
  },
});

export function Button({
  title,
  onPress,
  disabled,
  secondary,
  danger,
  testID,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => ({
        backgroundColor: secondary ? colors.raised : danger ? colors.danger : colors.mint,
        opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        borderRadius: 10,
        minHeight: 46,
        paddingHorizontal: 20,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <Text
        style={{ color: secondary ? colors.text : colors.ink, fontSize: 14, fontWeight: '600' }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.text}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#60777F"
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
        style={[s.field, props.style]}
      />
    </View>
  );
}
export function Pill({ text, active }: { text: string; active?: boolean }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingVertical: 7,
        paddingHorizontal: 11,
        borderRadius: 20,
        backgroundColor: active ? '#203C30' : colors.raised,
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: active ? colors.mint : colors.muted,
        }}
      />
      <Text style={{ color: active ? colors.mint : colors.muted, fontSize: 11, fontWeight: '600' }}>
        {text}
      </Text>
    </View>
  );
}
export function CameraGlyph({ size = 64 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size * 0.74,
        borderRadius: size * 0.18,
        borderWidth: 2,
        borderColor: colors.mint,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: size * 0.35,
          height: size * 0.35,
          borderRadius: size,
          borderColor: colors.mint,
          borderWidth: 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: size * 0.12,
          top: size * 0.13,
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.mint,
        }}
      />
    </View>
  );
}
export function Empty({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={[s.card, { alignItems: 'center', paddingVertical: 60, gap: 20 }]}>
      <CameraGlyph />
      <Text style={s.heading}>{title}</Text>
      <Text style={[s.subtitle, { maxWidth: 440, textAlign: 'center' }]}>{text}</Text>
      {children}
    </View>
  );
}
export function Loading() {
  return <ActivityIndicator color={colors.mint} style={{ padding: 50 }} />;
}
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function confirmDelete(title: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(title)) onConfirm();
  } else {
    // A native confirmation keeps destructive actions accessible on mobile.
    Alert.alert(title, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: onConfirm },
    ]);
  }
}
