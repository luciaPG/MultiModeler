// app/shared/debug-registry.js
const root =
  (typeof globalThis !== 'undefined') ? globalThis :
  (typeof window !== 'undefined') ? window : null;

const isProd = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production';

export function registerDebug(key, value) {
  if (!root || isProd) return;
  root.__debug = { ...(root.__debug || {}) };
  root.__debug[key] = value;
}

export function removeDebug(key) {
  if (!root || isProd || !root.__debug) return;
  delete root.__debug[key];
}

export function getDebug(key) {
  if (!root || isProd) return undefined;
  return root.__debug && root.__debug[key];
}
