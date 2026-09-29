# ChatFlow — Real-Time One-to-One Chat

A one-to-one real-time chat app built with **React Native (Expo)**, **Node.js/Express**, **Socket.IO** and **MongoDB**.

## Features

- Username login (dummy auth, no password) with session restore
- Real-time messaging over Socket.IO
- Persistent chat history (MongoDB) with pagination
- Message timestamps
- Online/offline status and "last seen", updated live
- Typing indicator (debounced)
- Sent / delivered / read status (✓ / ✓✓ / blue ✓✓), persisted in MongoDB
- Dark mode (persisted)
- Connection banner, automatic reconnection, and history catch-up after reconnect
- Optimistic sending with retry / delete for failed messages
- Loading, empty and error states throughout

## Tech Stack

| Frontend | Backend |
|---|---|
| React Native, Expo, React Navigation | Node.js, Express (ES Modules) |
| Socket.IO Client, Axios | Socket.IO, Mongoose, MongoDB |
| AsyncStorage, Context API, custom hooks | dotenv, CORS |

## Architecture

```text
React Native
     │
 ┌───┴────┐
REST     Socket.IO
 │          │
 ▼          ▼
Express   Socket Server
 │  └────┬───┘
 ▼       ▼
     MongoDB
```

REST handles login, user list and history. Socket.IO handles real-time events. MongoDB is the source of truth. Both the REST `POST /api/messages` and the socket `message:send` event use the same service function, which validates, persists, then pushes to the recipient.

## Project Structure

```text
backend/src
  config/       MongoDB connection
  controllers/  auth, user, message request handlers
  models/       User, Message (with indexes)
  routes/       Express routers
  services/     message business logic (shared by REST + sockets)
  socket/       Socket.IO server: auth, presence, events
  middleware/   current-user check, centralized error handling
  utils/        response helpers, validation
frontend/src
  components/   presentational UI (bubbles, input, avatar, banners...)
  screens/      Login, UserList, Chat
  navigation/   auth-aware stack navigator
  services/     api.js (Axios), socket.js (single Socket.IO client)
  context/      AuthContext, ThemeContext
  hooks/        useChat (all chat logic)
  theme/        light/dark palettes
  utils/        storage, time formatting
```

## Prerequisites

- Node.js 18+ and npm
- MongoDB locally, or a free MongoDB Atlas cluster
- Expo Go on an Android phone, or an Android emulator

## Installation

**Backend**
```bash
cd backend
cp .env.example .env      # then fill in MONGODB_URI
npm install
npm run dev
```
Check `http://localhost:3000/api/health`.

**Frontend**
```bash
cd frontend
cp .env.example .env      # then set your LAN IP
npm install
npx expo install --fix    # aligns package versions with your Expo SDK
npx expo start
```

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `PORT` | backend | Server port (hosts like Render set this automatically) |
| `MONGODB_URI` | backend | MongoDB connection string |
| `CLIENT_URL` | backend | Comma-separated allowed web origins. Native apps send no Origin header and are always allowed |
| `EXPO_PUBLIC_API_URL` | frontend | REST base URL, including `/api` |
| `EXPO_PUBLIC_SOCKET_URL` | frontend | Socket.IO server URL, without `/api` |

Restart Expo with `npx expo start -c` after changing `.env`.

## Android Device Setup

A physical phone cannot reach your computer via `localhost`. Use your computer's LAN IP (e.g. `192.168.1.20`) in both frontend URLs, and make sure the phone and computer are on the same Wi-Fi network and the firewall allows port 5000. The Android emulator uses `10.0.2.2` instead. For production, use the deployed HTTPS backend URL.

## API Documentation

All responses: `{ "success": true, ... }` or `{ "success": false, "message": "..." }`.
Every endpoint except health and login requires the header `x-user-id: <user _id>`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/auth/login` | Body `{ username }`. Creates the user if new. Returns `{ user }` |
| GET | `/api/users` | All users except the caller. Returns `{ users }` |
| POST | `/api/messages` | Body `{ receiverId, text }`. Returns `{ message }` (201) |
| GET | `/api/messages/:userId` | Conversation with `userId`, chronological. Query: `limit` (default 50, max 100), `before` (ISO date). Returns `{ messages, hasMore }` |

Usernames: 2–20 chars, letters/numbers/`.`/`-`/`_`, stored lowercase. Messages: 1–2000 chars.

## Socket Events

The client connects with `auth: { userId, username }`, which the server verifies against MongoDB.

| Event | Direction | Payload |
|---|---|---|
| `message:send` | client → server | `{ receiverId, text }`, ack `{ success, message \| message }` |
| `message:new` | server → client | saved message document |
| `typing:start` / `typing:stop` | client → server → other client | out: `{ receiverId }`, in: `{ senderId }` |
| `message:delivered` | server → sender (client → server to confirm) | `{ receiverId, messageIds }` |
| `message:read` | client → server: `{ senderId }`; server → sender: `{ readerId, messageIds }` | |
| `user:online` | server → all | `{ userId }` |
| `user:offline` | server → all | `{ userId, lastSeen }` |

## Design Decisions

- **MongoDB is the source of truth.** A message is saved before anything is emitted.
- **Socket.IO for real time, REST for history**, with no polling anywhere.
- **Delivered** means the recipient had a connected socket when the message was sent; messages sent to offline users become delivered when they next connect. **Read** is set when the recipient has the conversation open.
- **AsyncStorage** holds the dummy session and theme preference.
- **One socket for the whole app**, created in `services/socket.js` when the session starts. Screens only subscribe/unsubscribe, so there are no duplicate connections or listeners.
- **Reconnection catch-up:** on every socket `connect`, the open chat silently re-fetches history and partner status.
- **Inverted `FlatList`** keeps the latest message in view and paginates older messages when scrolling up.
- **Optimistic sending:** messages appear immediately, are swapped for the saved document on ack, and show a retry option on failure. If the socket is down, sending falls back to REST.

## Assumptions

- Authentication is intentionally dummy (username only, no password/JWT), as the assignment requests.
- Conversations are strictly one-to-one.
- No Firebase and no polling; Socket.IO is the real-time mechanism.

## Known Limitations

- Dummy auth means anyone who knows an `_id` can impersonate that user. Not suitable for production as-is.
- If a socket send times out after the server already saved the message, retrying can create a duplicate (no client-generated idempotency key).
- No push notifications; the app must be open to receive messages in real time.
- No unread badges or last-message preview on the user list.
- The user list is not paginated (fine for a small user base).
- Plain `http://` backends work in Expo Go but need cleartext-traffic configuration in standalone Android builds; use HTTPS in production.
- Automated tests are not included; see the checklist below.

## Deployment (Render example)

1. Push the repo to GitHub. Create a Render **Web Service** with root directory `backend`, build command `npm install`, start command `npm start`.
2. Set `MONGODB_URI` (Atlas) and `CLIENT_URL`. Allow Render's outbound IPs in Atlas Network Access (or `0.0.0.0/0` for a demo).
3. Set the frontend `.env` to `https://<your-service>.onrender.com/api` and `https://<your-service>.onrender.com`.
4. Free tiers sleep when idle, so the first request may be slow.

## Manual Test Checklist

Use two clients (e.g. phone + emulator) as `user1` and `user2`.

- **Auth:** log in, restart the app (session restored), log out
- **Messaging:** instant delivery, several messages in a row, empty send blocked, long message
- **Persistence:** reopen the app and conversation, history remains
- **Presence:** one client goes offline, the other shows "Last seen…", reconnect shows Online
- **Typing:** indicator appears while typing and disappears after pausing
- **Status:** ✓ when recipient is offline, ✓✓ when online, blue ✓✓ once they open the chat
- **Dark mode:** toggle, restart, preference persists
- **Network:** toggle airplane mode, banner shows "Connection lost. Reconnecting...", then "Connected" and the chat catches up
