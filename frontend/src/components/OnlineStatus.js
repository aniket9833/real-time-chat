import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { formatLastSeen } from '../utils/formatTime';

export default function OnlineStatus({ isOnline, lastSeen }) {
  const { theme } = useTheme();
  const [, setTick] = useState(0);

  // Keep "Last seen X min ago" fresh
  useEffect(() => {
    if (isOnline) return undefined;
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, [isOnline]);

  if (isOnline) {
    return (
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: theme.online }]} />
        <Text style={[styles.text, { color: theme.online }]}>Online</Text>
      </View>
    );
  }
  return (
    <Text style={[styles.text, { color: theme.secondaryText }]}>
      {formatLastSeen(lastSeen)}
    </Text>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  text: { fontSize: 13 },
});
