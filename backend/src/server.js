import 'dotenv/config';
import http from 'http';
import app, { corsOptions } from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 3000;

async function start() {
  await connectDB();

  const server = http.createServer(app);
  server.listen(PORT, '0.0.0.0', () =>
    console.log(`Server listening on port ${PORT}`),
  );
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
