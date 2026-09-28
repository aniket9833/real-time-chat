import 'dotenv/config';
import http from 'http';
import app, { corsOptions } from './app.js';
import { connectDB } from './config/db.js';
import { initSocket } from './socket/socket.js';
import User from './models/User.js';

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  // No sockets survive a restart, so nobody can be online yet
  await User.updateMany(
    { isOnline: true },
    { isOnline: false, lastSeen: new Date() },
  );

  const server = http.createServer(app);
  initSocket(server, corsOptions);
  server.listen(PORT, '0.0.0.0', () =>
    console.log(`Server listening on port ${PORT}`),
  );
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
