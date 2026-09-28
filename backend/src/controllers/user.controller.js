import User from '../models/User.js';
import { asyncHandler, sendSuccess } from '../utils/response.js';

export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user._id } })
    .select('username isOnline lastSeen')
    .sort({ username: 1 })
    .lean();
  sendSuccess(res, { users });
});
