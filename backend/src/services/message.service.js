import Message from '../models/Message.js';
import User from '../models/User.js';
import { ApiError } from '../utils/response.js';
import { isValidId, MESSAGE_MAX } from '../utils/validate.js';
import { emitToUser, isUserOnline } from '../socket/socket.js';

/**
 * Persist a message, then push it to the receiver if online.
 * Shared by the REST endpoint and the `message:send` socket event.
 */
export async function createMessage({ senderId, receiverId, text }) {
  if (!isValidId(String(receiverId)))
    throw new ApiError(400, 'Invalid recipient');
  if (String(senderId) === String(receiverId))
    throw new ApiError(400, 'You cannot message yourself');

  const cleanText = typeof text === 'string' ? text.trim() : '';
  if (!cleanText) throw new ApiError(400, 'Message cannot be empty');
  if (cleanText.length > MESSAGE_MAX)
    throw new ApiError(
      400,
      `Message must be at most ${MESSAGE_MAX} characters`,
    );

  const receiverExists = await User.exists({ _id: receiverId });
  if (!receiverExists) throw new ApiError(404, 'Recipient not found');

  // Recipient online => the message reaches them right now => "delivered"
  const delivered = isUserOnline(receiverId);
  const message = await Message.create({
    senderId,
    receiverId,
    text: cleanText,
    status: delivered ? 'delivered' : 'sent',
  });

  const payload = message.toJSON();
  if (delivered) emitToUser(receiverId, 'message:new', payload);
  return payload;
}

/** Mark undelivered messages addressed to `receiverId` as delivered and notify senders. */
export async function markDelivered(receiverId, messageIds) {
  const filter = { receiverId, status: 'sent' };
  if (messageIds) filter._id = { $in: messageIds.filter(isValidId) };

  const pending = await Message.find(filter).select('_id senderId').lean();
  if (!pending.length) return;

  await Message.updateMany(
    { _id: { $in: pending.map((m) => m._id) } },
    { status: 'delivered' },
  );

  const bySender = new Map();
  for (const m of pending) {
    const key = String(m.senderId);
    if (!bySender.has(key)) bySender.set(key, []);
    bySender.get(key).push(String(m._id));
  }
  for (const [senderId, ids] of bySender) {
    emitToUser(senderId, 'message:delivered', {
      receiverId: String(receiverId),
      messageIds: ids,
    });
  }
}

/** Mark everything `senderId` sent to `readerId` as read and notify the sender. */
export async function markConversationRead(readerId, senderId) {
  if (!isValidId(String(senderId))) return;
  const unread = await Message.find({
    senderId,
    receiverId: readerId,
    status: { $ne: 'read' },
  })
    .select('_id')
    .lean();
  if (!unread.length) return;

  const ids = unread.map((m) => m._id);
  await Message.updateMany({ _id: { $in: ids } }, { status: 'read' });
  emitToUser(senderId, 'message:read', {
    readerId: String(readerId),
    messageIds: ids.map(String),
  });
}
