// Tiny client for the Firebase Realtime Database using its plain web (REST) API:
// no extra packages to install, nothing to change in package.json.
import { DATABASE_URL } from './firebaseConfig.js';

export const cloudReady = () => !!DATABASE_URL;
const url = (path) => `${DATABASE_URL.replace(/\/$/, '')}/${path}.json`;

async function call(path, options = {}, ms = 8000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url(path), { ...options, signal: ctl.signal });
    if (!r.ok) throw new Error(`cloud ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

const body = (data) => ({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

export const cGet = (path) => call(path);
export const cPut = (path, data) => call(`${path}`, { method: 'PUT', ...body(data) });
// PATCH with keys like "plots/farm/3,8" changes just those spots (null removes one)
export const cPatch = (path, data) => call(`${path}`, { method: 'PATCH', ...body(data) });
export const cDelete = (path) => call(path, { method: 'DELETE' });
// fire and forget, still works while the page is closing
export const cDeleteOnExit = (path) => {
  try {
    fetch(url(path), { method: 'DELETE', keepalive: true });
  } catch (e) {
    /* nothing to do */
  }
};

// Live updates: calls onEvent('put' | 'patch', {path, data}) as things change. Reconnects by itself.
export function cListen(path, onEvent, onStatus = () => {}) {
  const es = new EventSource(url(path));
  es.onopen = () => onStatus(true);
  es.onerror = () => onStatus(false);
  ['put', 'patch'].forEach((type) =>
    es.addEventListener(type, (e) => {
      try {
        onEvent(type, JSON.parse(e.data));
      } catch (err) {
        console.warn('Bad cloud event', err);
      }
    })
  );
  return () => es.close();
}
