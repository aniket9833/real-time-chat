import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function TypingIndicator({ name }) {
  const { theme } = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: theme.secondaryText }]}>
        {name} is typing...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 6 },
  text: { fontSize: 13, fontStyle: 'italic' },
});
