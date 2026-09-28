import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const api = axios.create({ baseURL: API_URL, timeout: 10000 });

let unauthorizedHandler = null;
export const setUnauthorizedHandler = (fn) => {
  unauthorizedHandler = fn;
};

// The dummy auth scheme identifies the user with a header
export function setApiUser(userId) {
  if (userId) api.defaults.headers.common['x-user-id'] = userId;
  else delete api.defaults.headers.common['x-user-id'];
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && unauthorizedHandler)
      unauthorizedHandler();
    return Promise.reject(error);
  },
);

/** Convert any thrown error into a message that is safe to show to the user. */
export function getErrorMessage(error) {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === 'ECONNABORTED')
    return 'The request timed out. Please try again';
  if (error?.request) return 'Cannot reach the server. Check your connection';
  return error?.message || 'Something went wrong. Please try again';
}

export async function login(username) {
  const { data } = await api.post('/auth/login', { username });
  return data.user;
}

export async function getUsers() {
  const { data } = await api.get('/users');
  return data.users;
}

export async function getMessages(userId, { limit, before } = {}) {
  const { data } = await api.get(`/messages/${userId}`, {
    params: { limit, before },
  });
  return { messages: data.messages, hasMore: data.hasMore };
}

export async function sendMessage({ receiverId, text }) {
  const { data } = await api.post('/messages', { receiverId, text });
  return data.message;
}

export default api;
