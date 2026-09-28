import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ConnectionBanner from '../components/ConnectionBanner';
import EmptyState from '../components/EmptyState';
import OnlineStatus from '../components/OnlineStatus';
import UserAvatar from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getErrorMessage, getUsers } from '../services/api';
import { subscribe } from '../services/socket';
import { displayName } from '../utils/formatTime';

export default function UserListScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadUsers = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setError(null);
      setUsers(await getUsers());
    } catch (err) {
      if (!silent) setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refetch whenever the screen gains focus (e.g. returning from a chat)
  useFocusEffect(
    useCallback(() => {
      loadUsers({ silent: true });
    }, [loadUsers]),
  );

  // Initial load shows errors; later refreshes are silent
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Live presence updates + refresh after reconnect
  useEffect(() => {
    const offs = [
      subscribe('user:online', ({ userId }) =>
        setUsers((prev) => {
          if (!prev.some((u) => u._id === userId)) {
            loadUsers({ silent: true });
            return prev;
          }
          return prev.map((u) =>
            u._id === userId ? { ...u, isOnline: true } : u,
          );
        }),
      ),
      subscribe('user:offline', ({ userId, lastSeen }) =>
        setUsers((prev) =>
          prev.map((u) =>
            u._id === userId ? { ...u, isOnline: false, lastSeen } : u,
          ),
        ),
      ),
      subscribe('connect', () => loadUsers({ silent: true })),
    ];
    return () => offs.forEach((off) => off());
  }, [loadUsers]);

  const confirmLogout = useCallback(() => {
    const message = `Log out of ${displayName(user.username)}?`;
    if (Platform.OS === 'web') {
      if (globalThis.confirm(message)) logout();
      return;
    }

    Alert.alert('Log out', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  }, [user.username, logout]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable
            onPress={toggleTheme}
            hitSlop={8}
            style={styles.headerButton}
            accessibilityLabel="Toggle dark mode"
          >
            <Text style={styles.headerIcon}>{isDark ? '☀️' : '🌙'}</Text>
          </Pressable>
          <Pressable
            onPress={confirmLogout}
            hitSlop={8}
            style={styles.headerButton}
            accessibilityLabel="Log out"
          >
            <Text style={[styles.logout, { color: theme.primary }]}>
              Logout
            </Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation, isDark, theme.primary, toggleTheme, confirmLogout]);

  const renderItem = ({ item }) => (
    <Pressable
      onPress={() => navigation.navigate('Chat', { partner: item })}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? theme.inputBackground : theme.surface,
          borderBottomColor: theme.border,
        },
      ]}
    >
      <UserAvatar name={item.username} isOnline={item.isOnline} />
      <View style={styles.rowText}>
        <Text style={[styles.name, { color: theme.text }]}>
          {displayName(item.username)}
        </Text>
        <OnlineStatus isOnline={item.isOnline} lastSeen={item.lastSeen} />
      </View>
    </Pressable>
  );

  let body;
  if (loading) {
    body = <EmptyState loading title="Loading conversations..." />;
  } else if (error) {
    body = (
      <EmptyState
        title="Couldn't load users"
        subtitle={error}
        actionLabel="Try again"
        onAction={() => {
          setLoading(true);
          loadUsers();
        }}
      />
    );
  } else {
    body = (
      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          loadUsers();
        }}
        contentContainerStyle={
          users.length === 0 ? styles.emptyList : undefined
        }
        ListEmptyComponent={
          <EmptyState
            title="No users found"
            subtitle="Log in with another username on a second device to start chatting."
          />
        }
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ConnectionBanner />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyList: { flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { marginLeft: 14, flex: 1 },
  name: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: { fontSize: 20 },
  logout: { fontSize: 15, fontWeight: '600' },
});
