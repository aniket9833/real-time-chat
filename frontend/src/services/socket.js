import { io } from 'socket.io-client';

const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3000';

// One socket for the whole app. Screens never create their own.
let socket = null;
let currentUserId = null;
let status = 'disconnected'; // "connecting" | "connected" | "disconnected"
let authErrorHandler = null;
const statusListeners = new Set();

function setStatus(next) {
  status = next;
  statusListeners.forEach((listener) => listener(next));
}

export const getConnectionStatus = () => status;
export const isSocketConnected = () => Boolean(socket?.connected);
export const setSocketAuthErrorHandler = (fn) => {
  authErrorHandler = fn;
};

export function onStatusChange(listener) {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

export function connectSocket(user) {
  // Same user and socket already exists: reuse it (prevents duplicate connections)
  if (socket && currentUserId === user._id) {
    if (!socket.connected) socket.connect();
    return socket;
  }
  disconnectSocket();

  currentUserId = user._id;
  setStatus('connecting');

  socket = io(SOCKET_URL, {
    auth: { userId: user._id, username: user.username },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.on('connect', () => setStatus('connected'));
  socket.on('disconnect', () => setStatus('disconnected'));
  socket.on('connect_error', (error) => {
    setStatus('disconnected');
    if (
      error?.message === 'Unauthorized' ||
      error?.message === 'Invalid user'
    ) {
      authErrorHandler?.();
    }
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }
  socket = null;
  currentUserId = null;
  setStatus('disconnected');
}

export function reconnectIfNeeded() {
  if (socket && !socket.connected) socket.connect();
}

/** Attach a listener and get back a function that removes it. */
export function subscribe(event, handler) {
  const active = socket;
  if (!active) return () => {};
  active.on(event, handler);
  return () => active.off(event, handler);
}

/** Fire-and-forget emit; silently skipped while offline (typing / read receipts). */
export function emitEvent(event, payload) {
  if (socket?.connected) socket.emit(event, payload);
}

export function sendMessageViaSocket(payload) {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) return reject(new Error('Not connected'));
    socket.timeout(8000).emit('message:send', payload, (error, response) => {
      if (error)
        return reject(new Error('The message timed out. Tap to retry'));
      if (response?.success) return resolve(response.message);
      reject(new Error(response?.message || 'Failed to send message'));
    });
  });
}
