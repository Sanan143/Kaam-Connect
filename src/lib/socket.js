import { io } from 'socket.io-client';

// In production (Render), VITE_BACKEND_URL is not set — socket.io connects to same origin
// In development, it falls back to localhost:4000
const backendUrl = import.meta.env.VITE_BACKEND_URL || (
  import.meta.env.DEV ? 'http://localhost:4000' : undefined
);

export const socket = io(backendUrl, {
  autoConnect: false, // We connect when user explicitly logs in
});
