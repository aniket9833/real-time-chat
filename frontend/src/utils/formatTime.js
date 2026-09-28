export function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatLastSeen(value) {
  if (!value) return 'Offline';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Offline';
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'Last seen just now';
  if (minutes < 60) return `Last seen ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours} hr ago`;
  return `Last seen ${date.toLocaleDateString()}`;
}

// Usernames are stored lowercase; show them capitalised
export function displayName(username = '') {
  return username.charAt(0).toUpperCase() + username.slice(1);
}
