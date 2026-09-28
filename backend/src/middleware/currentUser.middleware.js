import User from '../models/User.js';
import { ApiError, asyncHandler } from '../utils/response.js';
import { isValidId } from '../utils/validate.js';

// Dummy auth: the client identifies itself with the x-user-id header,
// which we verify against the database.
export const requireUser = asyncHandler(async (req, _res, next) => {
  const userId = req.header('x-user-id');
  if (!isValidId(userId)) throw new ApiError(401, 'Missing or invalid user');
  const user = await User.findById(userId);
  if (!user) throw new ApiError(401, 'User not found. Please log in again');
  req.user = user;
  next();
});
