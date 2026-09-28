import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function ConnectionBanner() {
  const { connectionStatus } = useAuth();
  const { theme } = useTheme();
  const previous = useRef(connectionStatus);
  const [showConnected, setShowConnected] = useState(false);

  // Briefly confirm "Connected" after recovering from a drop
  useEffect(() => {
    let timer;
    if (connectionStatus === 'connected' && previous.current !== 'connected') {
      setShowConnected(true);
      timer = setTimeout(() => setShowConnected(false), 2000);
    }
    previous.current = connectionStatus;
    return () => clearTimeout(timer);
  }, [connectionStatus]);

  let label = null;
  let color = null;
  if (connectionStatus === 'connecting') {
    label = 'Connecting...';
    color = theme.warning;
  } else if (connectionStatus === 'disconnected') {
    label = 'Connection lost. Reconnecting...';
    color = theme.danger;
  } else if (showConnected) {
    label = 'Connected';
    color = theme.success;
  }
  if (!label) return null;

  return (
    <View
      style={[styles.banner, { backgroundColor: color }]}
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { paddingVertical: 6, alignItems: 'center' },
  text: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
});
