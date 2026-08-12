// src/hooks/useWebSocketWithReconnect.ts
import { useEffect, useRef, useCallback } from "react";

type Handlers = {
  url: string;
  onOpen?: () => void;
  onMessage?: (msg: unknown) => void;
  onClose?: (ev: CloseEvent) => void;
  onError?: (ev: Event) => void;
  shouldRespondToPing?: boolean; // optional: enable only if server expects client 'pong'
};

export function useWebSocketWithReconnect({
  url,
  onOpen,
  onMessage,
  onClose,
  onError,
  shouldRespondToPing = false,
}: Handlers) {
  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef<number>(0);
  const closedByUserRef = useRef<boolean>(false);
  const reconnectTimerRef = useRef<number | null>(null);
  const connectingRef = useRef<boolean>(false);

  // Safe send helper
  const sendMessage = useCallback((payload: object) => {
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
      } else {
        console.warn("[WS] sendMessage: socket not open");
      }
    } catch (e) {
      console.warn("[WS] sendMessage failed", e);
    }
  }, []);

  useEffect(() => {
    closedByUserRef.current = false;

    const safeCloseExisting = () => {
      // Ensure any previous socket is closed (regardless of its readyState)
      if (wsRef.current) {
        try {
          wsRef.current.onopen = null;
          wsRef.current.onmessage = null;
          wsRef.current.onclose = null;
          wsRef.current.onerror = null;
          try { wsRef.current.close(); } catch {}
        } finally {
          wsRef.current = null;
        }
      }
      connectingRef.current = false;
    };

    const connect = () => {
      // if we've been told to stop, don't create another connection
      if (closedByUserRef.current) return;

      // If a connect is already in progress, skip starting another
      if (connectingRef.current) return;

      // Close any existing socket to avoid duplicates
      safeCloseExisting();

      connectingRef.current = true;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      // set a short timeout in case it never opens so we can attempt reconnect
      const openTimeout = window.setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          try { ws.close(); } catch {}
        }
      }, 10_000); // 10s open timeout

      ws.onopen = () => {
        window.clearTimeout(openTimeout);
        connectingRef.current = false;
        backoffRef.current = 0; // reset backoff on successful connect
        onOpen && onOpen();
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          // Optionally respond to ping if you really want; disabled by default
          if (parsed && typeof parsed === "object" && (parsed as any).type === "ping") {
            if (shouldRespondToPing) {
              try { ws.send(JSON.stringify({ type: "pong" })); } catch {}
            }
            return; // drop heartbeat from application handlers
          }
          onMessage && onMessage(parsed);
        } catch (err) {
          // non-JSON / malformed payloads are ignored
          console.warn("[WS] failed to parse message", err);
        }
      };

      ws.onclose = (ev) => {
        window.clearTimeout(openTimeout);
        connectingRef.current = false;
        onClose && onClose(ev);

        if (closedByUserRef.current) {
          // normal shutdown by caller, do not reconnect
          return;
        }

        // schedule reconnect
        scheduleReconnect();
      };

      ws.onerror = (ev) => {
        // onError may be followed by onclose; don't aggressively reconnect here
        onError && onError(ev);
      };
    };

    const scheduleReconnect = () => {
      // Exponential backoff with cap and jitter
      const attempt = Math.min(backoffRef.current + 1, 7); // cap exponent growth
      backoffRef.current = attempt;
      const base = 500 * Math.pow(2, attempt); // 0.5s, 1s, 2s, 4s, ...
      const jitter = Math.random() * 300;
      const delay = Math.min(base + jitter, 10_000); // max 10s

      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, delay);
    };

    // start the first connection
    connect();

    // teardown
    return () => {
      closedByUserRef.current = true;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      safeCloseExisting();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, onOpen, onMessage, onClose, onError, shouldRespondToPing]);

  // return a small API: sendMessage + the raw ref if caller really needs it
  return { sendMessage, socketRef: wsRef };
}
