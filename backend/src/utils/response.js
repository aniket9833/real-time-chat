export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const sendSuccess = (res, data = {}, statusCode = 200) =>
  res.status(statusCode).json({ success: true, ...data });

export const sendError = (res, message, statusCode = 500) =>
  res.status(statusCode).json({ success: false, message });

// Wraps async route handlers so rejected promises reach the error middleware
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
