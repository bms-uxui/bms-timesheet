import React from 'react';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import { theme } from '../lib/theme';

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({ title, onPress, variant = 'primary', disabled, style }) {
  const isGhost = variant === 'ghost';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        isGhost ? styles.buttonGhost : styles.buttonPrimary,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
        style,
      ]}>
      <Text style={[styles.buttonText, isGhost && styles.buttonTextGhost]}>{title}</Text>
    </Pressable>
  );
}

export function Label({ children }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Input(props) {
  return <TextInput style={styles.input} placeholderTextColor={theme.colors.muted} {...props} />;
}

export function Badge({ children, variant = 'miss' }) {
  const bg = variant === 'ok' ? '#dcfce7' : variant === 'warn' ? '#fef3c7' : '#fee2e2';
  const fg = variant === 'ok' ? theme.colors.ok : variant === 'warn' ? theme.colors.warn : theme.colors.danger;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{children}</Text>
    </View>
  );
}

export function Callout({ children, variant = 'info' }) {
  const bg = variant === 'error' ? '#fef2f2' : theme.colors.accentSoft;
  const fg = variant === 'error' ? theme.colors.danger : theme.colors.text;
  const border = variant === 'error' ? '#fecaca' : '#bae6fd';
  return (
    <View style={[styles.callout, { backgroundColor: bg, borderColor: border }]}>
      <Text style={{ color: fg, fontSize: 14 }}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.radius.sm,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: { backgroundColor: theme.colors.accent },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonPressed: { opacity: 0.85, transform: [{ translateY: 1 }] },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  buttonTextGhost: { color: theme.colors.accent },
  label: { fontSize: 13, color: theme.colors.muted, fontWeight: '500', marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.colors.text,
    minHeight: 44,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  callout: {
    padding: 12,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    marginTop: 12,
  },
});
