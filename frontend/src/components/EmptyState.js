import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function EmptyState({
  title,
  subtitle,
  loading,
  actionLabel,
  onAction,
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator
          size="large"
          color={theme.primary}
          style={styles.spinner}
        />
      ) : null}
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
          {subtitle}
        </Text>
      ) : null}
      {actionLabel ? (
        <Pressable
          onPress={onAction}
          style={[styles.button, { backgroundColor: theme.primary }]}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, { color: theme.onPrimary }]}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  spinner: { marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  button: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonText: { fontWeight: '600', fontSize: 15 },
});
