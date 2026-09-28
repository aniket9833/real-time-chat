export const isValidId = (value) =>
  typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);

export const USERNAME_REGEX = /^[a-z0-9_.-]+$/;
export const USERNAME_MIN = 2;
export const USERNAME_MAX = 20;
export const MESSAGE_MAX = 2000;

export function normalizeUsername(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
