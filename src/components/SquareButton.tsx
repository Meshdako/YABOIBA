import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

type SquareButtonProps = {
  label: string;
  onPress: () => void;
  size?: number;
  borderRadius?: number;
  variant?: 'number' | 'action' | 'accent' | 'danger';
  textColor?: string;
  disabled?: boolean;
};

export function SquareButton({
  label,
  onPress,
  size = 72,
  borderRadius = 18,
  variant = 'number',
  textColor,
  disabled = false,
}: SquareButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius },
        variant === 'action' && styles.action,
        variant === 'accent' && styles.accent,
        variant === 'danger' && styles.danger,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.text,
          variant === 'accent' && styles.accentText,
          variant === 'danger' && styles.dangerText,
          textColor ? { color: textColor } : null,
          disabled && styles.disabledText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: '#3b3b3b',
    backgroundColor: '#151515',
    justifyContent: 'center',
    alignItems: 'center',
  },
  action: {
    backgroundColor: '#2e2e2e',
    borderColor: '#4a4a4a',
  },
  accent: {
    backgroundColor: '#1d3a2a',
    borderColor: '#2e5c43',
  },
  danger: {
    backgroundColor: '#3a1d1d',
    borderColor: '#5c2e2e',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.35,
  },
  disabledText: {
    color: '#666',
  },
  text: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '600',
  },
  accentText: {
    color: '#7ee2a8',
  },
  dangerText: {
    color: '#e87e7e',
  },
});
