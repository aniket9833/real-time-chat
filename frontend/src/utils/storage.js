import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = 'chatflow:user';
const THEME_KEY = 'chatflow:theme';

async function readJson(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null; // corrupted or unavailable storage should never crash the app
  }
}

export const getStoredUser = () => readJson(USER_KEY);
export const saveUser = (user) =>
  AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
export const clearUser = () => AsyncStorage.removeItem(USER_KEY);

export async function getThemeMode() {
  try {
    return await AsyncStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}
export const saveThemeMode = (mode) => AsyncStorage.setItem(THEME_KEY, mode);
