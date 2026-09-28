import Message from '../models/Message.js';
import User from '../models/User.js';
import { createMessage } from '../services/message.service.js';
import { ApiError, asyncHandler, sendSuccess } from '../utils/response.js';
import { isValidId } from '../utils/validate.js';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export const sendMessage = asyncHandler(async (req, res) => {
  const { receiverId, text } = req.body || {};
  const message = await createMessage({
    senderId: req.user._id,
    receiverId,
    text,
  });
  sendSuccess(res, { message }, 201);
});

// GET /api/messages/:userId?limit=50&before=<ISO date>
export const getConversation = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!isValidId(userId)) throw new ApiError(400, 'Invalid user id');
  if (!(await User.exists({ _id: userId })))
    throw new ApiError(404, 'User not found');

  const limit = Math.min(
    Math.max(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );
  const me = req.user._id;

  const query = {
    $or: [
      { senderId: me, receiverId: userId },
      { senderId: userId, receiverId: me },
    ],
  };
  if (req.query.before) {
    const before = new Date(req.query.before);
    if (Number.isNaN(before.getTime()))
      throw new ApiError(400, "Invalid 'before' date");
    query.createdAt = { $lt: before };
  }

  // Fetch newest-first so the limit keeps the latest, then return chronologically
  const rows = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .lean();
  const hasMore = rows.length > limit;
  const messages = rows.slice(0, limit).reverse();
  sendSuccess(res, { messages, hasMore });
});
