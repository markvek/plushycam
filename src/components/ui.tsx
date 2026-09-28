import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { colors, tokens, outline, pixelShadow } from './theme';
import { AppIcon, type AppIconName } from './AppIcon';
export { colors, tokens } from './theme';

export const s = StyleSheet.create({
  onBackground: { color: colors.onBackground },
  mutedOnBackground: { color: colors.mutedOnBackground },
  page: { gap: tokens.space.xl, paddingBottom: tokens.space.xl },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, maxWidth: '100%' },
  spread: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: { ...outline, ...pixelShadow, backgroundColor: colors.panel, padding: 22, gap: 16 },
  title: {
    color: colors.onBackground,
    fontFamily: tokens.font.title,
    fontSize: 32,
    lineHeight: 39,
  },
  subtitle: { color: colors.muted, fontFamily: tokens.font.body, fontSize: 15, lineHeight: 23 },
  label: {
    color: colors.text,
    fontFamily: tokens.font.body,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heading: {
    color: colors.text,
    fontFamily: tokens.font.body,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '600',
  },
  text: { color: colors.text, fontFamily: tokens.font.body, fontSize: 14, lineHeight: 22 },
  small: { color: colors.muted, fontFamily: tokens.font.body, fontSize: 13, lineHeight: 20 },
  field: {
    ...outline,
    color: colors.text,
    backgroundColor: colors.white,
    padding: 13,
    minHeight: 50,
    fontFamily: tokens.font.body,
    fontSize: 16,
  },
  divider: { height: tokens.border, backgroundColor: colors.border },
  alert: { ...outline, backgroundColor: colors.pink, padding: 16 },
});

// All interactive surfaces share keyboard focus, hover, and physical press feedback.
export function PixelControl({
  children,
  style,
  selected,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  selected?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      {...props}
      aria-selected={props.accessibilityState?.selected}
      aria-checked={props.accessibilityState?.checked}
      aria-expanded={props.accessibilityState?.expanded}
      aria-disabled={props.disabled || props.accessibilityState?.disabled}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={(event) => {
        setFocused(true);
        props.onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        props.onBlur?.(event);
      }}
      style={({ pressed }) => [
        outline,
        pixelShadow,
        {
          minHeight: 48,
          justifyContent: 'center',
          padding: 12,
          gap: 6,
          backgroundColor: selected ? colors.mint : colors.panel,
          maxWidth: '100%',
        },
        style,
        hovered && !props.disabled && { backgroundColor: tokens.button.hover },
        focused && {
          borderColor: colors.focus,
          outlineColor: colors.focus,
          outlineWidth: 2,
          outlineStyle: 'solid',
        },
        pressed &&
          !props.disabled && {
            backgroundColor: tokens.button.active,
            transform: [{ translateX: tokens.button.shift }, { translateY: tokens.button.shift }],
            boxShadow: [],
          },
        props.disabled && {
          backgroundColor: tokens.button.disabled,
          boxShadow: [],
          borderColor: colors.border,
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

export function PixelButton({
  title,
  onPress,
  disabled,
  secondary,
  danger,
  testID,
  icon,
  expanded,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
  testID?: string;
  icon?: AppIconName;
  expanded?: boolean;
}) {
  return (
    <PixelControl
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled, expanded }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={{
        backgroundColor: danger ? colors.pink : secondary ? colors.panel : tokens.button.default,
        paddingHorizontal: 17,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      {icon && <AppIcon name={icon} color={disabled ? colors.muted : colors.ink} />}
      <Text
        style={{
          color: disabled ? colors.muted : colors.ink,
          fontFamily: tokens.font.body,
          fontSize: 15,
          fontWeight: '600',
          lineHeight: 22,
          textAlign: 'center',
          flexShrink: 1,
        }}
      >
        {title}
      </Text>
    </PixelControl>
  );
}
export const Button = PixelButton;

export function PixelIconButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PixelControl
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ width: 48, alignItems: 'center', backgroundColor: colors.yellow }}
    >
      <AppIcon name="close" />
    </PixelControl>
  );
}

export function PixelInput({ label, ...props }: TextInputProps & { label: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        style={[
          s.field,
          focused && {
            borderColor: colors.focus,
            backgroundColor: colors.panel,
            boxShadow: [{ ...tokens.shadow, color: colors.focus }],
          },
          props.style,
        ]}
      />
    </View>
  );
}
export const Field = PixelInput;

export function PixelBadge({ text, active }: { text: string; active?: boolean }) {
  return (
    <View
      style={{
        ...outline,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: active ? colors.mint : colors.panel,
        alignSelf: 'flex-start',
        maxWidth: '100%',
      }}
    >
      <View style={{ width: 8, height: 8, backgroundColor: active ? '#326027' : colors.muted }} />
      <Text
        style={{ color: colors.ink, fontFamily: tokens.font.body, fontSize: 14, flexShrink: 1 }}
      >
        {text}
      </Text>
    </View>
  );
}
export const Pill = PixelBadge;

export function PixelProgressBar({
  value,
  label,
  status,
  color = colors.mint,
}: {
  value: number;
  label: string;
  status: string;
  color?: string;
}) {
  const percent = Math.max(0, Math.min(100, value));
  return (
    <View style={{ gap: 8 }}>
      <View style={s.spread}>
        <Text style={s.label}>{label}</Text>
        <Text style={s.label}>{status}</Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={status}
        style={{
          ...outline,
          flexDirection: 'row',
          padding: 2,
          gap: 2,
          height: 12,
          backgroundColor: colors.panel,
        }}
      >
        {Array.from({ length: 12 }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: i < Math.round((percent / 100) * 12) ? color : '#E2DFD1',
            }}
          />
        ))}
      </View>
    </View>
  );
}

export function PixelStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 4, flex: 1, minWidth: 110 }}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.heading}>{value}</Text>
    </View>
  );
}
export function CameraGlyph({ size = 64 }: { size?: number }) {
  return <AppIcon name="camera" size={size} />;
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
    <PixelCard
      style={{ alignItems: 'center', paddingVertical: 36, gap: 20, backgroundColor: colors.screen }}
    >
      <AppIcon name="album" size={40} />
      <Text style={[s.heading, { textAlign: 'center' }]}>{title}</Text>
      <Text style={[s.subtitle, { maxWidth: 440, textAlign: 'center' }]}>{text}</Text>
      {children}
    </PixelCard>
  );
}
export function Loading() {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading PlushyCam"
      style={{ padding: 50, gap: 20, alignItems: 'center' }}
    >
      <ActivityIndicator color={colors.onBackground} />
      <Text style={[s.label, s.onBackground]}>Loading…</Text>
    </View>
  );
}
export function PixelCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[s.card, style]}>{children}</View>;
}
export const Card = PixelCard;
export function confirmDelete(title: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(title)) onConfirm();
  } else {
    Alert.alert(title, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: onConfirm },
    ]);
  }
}
