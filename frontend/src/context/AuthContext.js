import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';
import * as api from '../services/api';
import {
  connectSocket,
  disconnectSocket,
  getConnectionStatus,
  onStatusChange,
  reconnectIfNeeded,
  setSocketAuthErrorHandler,
} from '../services/socket';
import { clearUser, getStoredUser, saveUser } from '../utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState(
    getConnectionStatus(),
  );

  // The API user and socket must exist BEFORE screens mount and subscribe to events,
  // so this runs synchronously rather than in an effect.
  const startSession = useCallback((sessionUser) => {
    api.setApiUser(sessionUser._id);
    connectSocket(sessionUser);
    setUser(sessionUser);
  }, []);

  const logout = useCallback(async () => {
    disconnectSocket();
    api.setApiUser(null);
    setUser(null);
    try {
      await clearUser();
    } catch {
      /* ignore */
    }
  }, []);

  const login = useCallback(
    async (username) => {
      const loggedInUser = await api.login(username);
      await saveUser(loggedInUser);
      startSession(loggedInUser);
    },
    [startSession],
  );

  // Restore session on startup
  useEffect(() => {
    (async () => {
      const stored = await getStoredUser();
      if (stored?._id) startSession(stored);
      setInitializing(false);
    })();
  }, [startSession]);

  useEffect(() => onStatusChange(setConnectionStatus), []);

  // Stale/invalid session (e.g. user deleted): drop back to login
  useEffect(() => {
    api.setUnauthorizedHandler(logout);
    setSocketAuthErrorHandler(logout);
  }, [logout]);

  // Nudge the socket when the app returns to the foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') reconnectIfNeeded();
    });
    return () => sub.remove();
  }, []);

  const value = useMemo(
    () => ({ user, initializing, connectionStatus, login, logout }),
    [user, initializing, connectionStatus, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
