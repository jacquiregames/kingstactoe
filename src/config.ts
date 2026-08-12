// src/config.ts
export const BACKEND_PORT = 3000;
export const HOSTNAME = window.location.hostname;
export const API_URL = `http://${HOSTNAME}:${BACKEND_PORT}`;
export const WS_URL = `ws://${HOSTNAME}:${BACKEND_PORT}/ws`;
