import express from 'express';
import cors from 'cors';

const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Native apps send no Origin header, so they are always allowed.
export const corsOptions = {
  origin: (origin, cb) =>
    !origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)
      ? cb(null, true)
      : cb(new Error('Not allowed by CORS')),
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json({ limit: '20kb' }));

app.get('/api/health', (_req, res) =>
  res.json({ success: true, message: 'Server is running' }),
);

export default app;
