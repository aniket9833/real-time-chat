import { Server } from 'socket.io';
import User from '../models/User.js';
import {
  createMessage,
  markConversationRead,
  markDelivered,
} from '../services/message.service.js';
import { isValidId } from '../utils/validate.js';

let io;
// userId -> Set of socket ids (a user may have several tabs/devices)
const onlineUsers = new Map();

export const isUserOnline = (userId) => onlineUsers.has(String(userId));
export const emitToUser = (userId, event, payload) =>
  io?.to(`user:${userId}`).emit(event, payload);

export function initSocket(httpServer, corsOptions) {
  io = new Server(httpServer, { cors: corsOptions });

  // Never trust client-provided identity: verify it against the database
  io.use(async (socket, next) => {
    try {
      const { userId, username } = socket.handshake.auth || {};
      if (!isValidId(userId)) return next(new Error('Invalid user'));
      const user = await User.findById(userId).lean();
      if (
        !user ||
        (username && user.username !== String(username).trim().toLowerCase())
      )
        return next(new Error('Unauthorized'));
      socket.data.userId = String(user._id);
      socket.data.username = user.username;
      next();
    } catch (err) {
      console.error('Socket auth error:', err.message);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', async (socket) => {
    const { userId } = socket.data;
    socket.join(`user:${userId}`);

    const sockets = onlineUsers.get(userId) || new Set();
    const wasOffline = sockets.size === 0;
    sockets.add(socket.id);
    onlineUsers.set(userId, sockets);

    try {
      if (wasOffline) {
        await User.updateOne({ _id: userId }, { isOnline: true });
        socket.broadcast.emit('user:online', { userId });
      }
      // Anything sent while this user was offline is now delivered
      await markDelivered(userId);
    } catch (err) {
      console.error('Connection setup error:', err.message);
    }

    // { receiverId, text } -> ack({ success, message | error })
    socket.on('message:send', async (payload, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        const message = await createMessage({
          senderId: userId,
          receiverId: payload?.receiverId,
          text: payload?.text,
        });
        reply({ success: true, message });
      } catch (err) {
        if (!err.statusCode) console.error('message:send failed:', err);
        reply({
          success: false,
          message: err.statusCode ? err.message : 'Failed to send message',
        });
      }
    });

    socket.on('typing:start', ({ receiverId } = {}) => {
      if (isValidId(receiverId))
        emitToUser(receiverId, 'typing:start', { senderId: userId });
    });
    socket.on('typing:stop', ({ receiverId } = {}) => {
      if (isValidId(receiverId))
        emitToUser(receiverId, 'typing:stop', { senderId: userId });
    });

    // { messageIds: [...] } — client confirms receipt (e.g. after reconnect)
    socket.on('message:delivered', async ({ messageIds } = {}) => {
      if (!Array.isArray(messageIds)) return;
      try {
        await markDelivered(userId, messageIds);
      } catch (err) {
        console.error('message:delivered failed:', err.message);
      }
    });

    // { senderId } — I opened the conversation with senderId
    socket.on('message:read', async ({ senderId } = {}) => {
      try {
        await markConversationRead(userId, senderId);
      } catch (err) {
        console.error('message:read failed:', err.message);
      }
    });

    socket.on('disconnect', async () => {
      const set = onlineUsers.get(userId);
      set?.delete(socket.id);
      if (set && set.size > 0) return; // still connected elsewhere
      onlineUsers.delete(userId);
      const lastSeen = new Date();
      try {
        await User.updateOne({ _id: userId }, { isOnline: false, lastSeen });
        socket.broadcast.emit('user:offline', { userId, lastSeen });
      } catch (err) {
        console.error('Disconnect update failed:', err.message);
      }
    });
  });

  return io;
}
