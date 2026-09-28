import User from '../models/User.js';
import { ApiError, asyncHandler, sendSuccess } from '../utils/response.js';
import {
  normalizeUsername,
  USERNAME_MAX,
  USERNAME_MIN,
  USERNAME_REGEX,
} from '../utils/validate.js';

const publicUser = (u) => ({
  _id: u._id,
  username: u.username,
  isOnline: u.isOnline,
  lastSeen: u.lastSeen,
});

export const login = asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.body?.username);

  if (!username) throw new ApiError(400, 'Please enter a username');
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX)
    throw new ApiError(
      400,
      `Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters`,
    );
  if (!USERNAME_REGEX.test(username))
    throw new ApiError(
      400,
      'Use only letters, numbers, dots, dashes and underscores',
    );

  let user = await User.findOne({ username });
  if (!user) {
    try {
      user = await User.create({ username });
    } catch (err) {
      // Two simultaneous first logins: the loser just fetches the winner's document
      if (err.code !== 11000) throw err;
      user = await User.findOne({ username });
    }
  }
  sendSuccess(res, { user: publicUser(user) });
});
