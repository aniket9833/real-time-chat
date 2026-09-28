import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const PALETTE = [
  '#6366F1',
  '#EC4899',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EF4444',
  '#14B8A6',
];

const colorFor = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1)
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
};

export default function UserAvatar({ name = '?', size = 44, isOnline }) {
  const { theme } = useTheme();
  const dot = Math.max(10, size * 0.28);
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colorFor(name),
          },
        ]}
      >
        <Text style={[styles.initial, { fontSize: size * 0.42 }]}>
          {name.charAt(0).toUpperCase()}
        </Text>
      </View>
      {isOnline ? (
        <View
          style={[
            styles.dot,
            {
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              backgroundColor: theme.online,
              borderColor: theme.surface,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#FFFFFF', fontWeight: '700' },
  dot: { position: 'absolute', right: 0, bottom: 0, borderWidth: 2 },
});
