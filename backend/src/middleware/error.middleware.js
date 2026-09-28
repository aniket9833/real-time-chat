export function notFound(req, res) {
  res
    .status(404)
    .json({
      success: false,
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.statusCode
    ? err.message
    : 'Something went wrong. Please try again';

  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed request body';
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors)[0]?.message || 'Invalid data';
  } else if (err.code === 11000) {
    status = 409;
    message = 'That username is already taken';
  }

  if (status >= 500) console.error(`[${req.method} ${req.originalUrl}]`, err);
  res.status(status).json({ success: false, message });
}
