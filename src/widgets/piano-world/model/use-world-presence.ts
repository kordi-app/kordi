"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WORLD_SOCKET_URL } from "@/shared/config/api";

/** Wire format shared with the server (WorldPlayer / WorldMove). */
export interface RemotePlayer {
  id: string;
  name: string;
  x: number;
  z: number;
  /** heading (radians) */
  h: number;
  /** MIDI note underfoot, null when off the keys */
  m: number | null;
}

type ServerMessage =
  | { t: "welcome"; id: string; ch: number; players: RemotePlayer[]; online: number }
  | { t: "join"; p: RemotePlayer }
  | { t: "leave"; id: string }
  | { t: "moves"; ps: RemotePlayer[] }
  | { t: "online"; n: number };

export type PresenceStatus = "connecting" | "online" | "full" | "offline";

export interface PresenceInfo {
  status: PresenceStatus;
  channel: number | null;
  /** everyone connected, across all channels */
  online: number;
  /** names of the other people in my channel */
  others: { id: string; name: string }[];
}

/** Server closes with 1013 ("try again later") when the world is at capacity. */
const CLOSE_FULL = 1013;
const SEND_INTERVAL_MS = 100;
const MAX_RETRY_MS = 30_000;

/**
 * Connects to the shared piano world. Remote positions live in a ref (updated
 * ~10×/s, read every frame by the scene) so they never re-render React; only
 * the HUD-level info (who's here, how many online) is state.
 *
 * If the world is full or the server is unreachable, the scene simply keeps
 * working single-player.
 */
export function useWorldPresence(name: string) {
  const remotes = useRef(new Map<string, RemotePlayer>());
  const [info, setInfo] = useState<PresenceInfo>({
    status: "connecting",
    channel: null,
    online: 0,
    others: [],
  });
  const socketRef = useRef<WebSocket | null>(null);
  const myId = useRef<string | null>(null);
  const lastSent = useRef({ at: 0, key: "" });

  const syncOthers = useCallback(() => {
    const others = [...remotes.current.values()].map(({ id, name }) => ({ id, name }));
    setInfo((prev) => ({ ...prev, others }));
  }, []);

  useEffect(() => {
    let disposed = false;
    let retryMs = 1_000;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      const socket = new WebSocket(`${WORLD_SOCKET_URL}?name=${encodeURIComponent(name)}`);
      socketRef.current = socket;
      setInfo((prev) => ({ ...prev, status: "connecting" }));

      socket.onmessage = (event) => {
        let message: ServerMessage;
        try {
          message = JSON.parse(event.data as string) as ServerMessage;
        } catch {
          return;
        }
        switch (message.t) {
          case "welcome":
            retryMs = 1_000;
            myId.current = message.id;
            remotes.current = new Map(
              message.players.filter((p) => p.id !== message.id).map((p) => [p.id, p]),
            );
            lastSent.current = { at: 0, key: "" }; // announce our position right away
            setInfo({ status: "online", channel: message.ch, online: message.online, others: [] });
            syncOthers();
            break;
          case "join":
            if (message.p.id !== myId.current) {
              remotes.current.set(message.p.id, message.p);
              syncOthers();
            }
            break;
          case "leave":
            remotes.current.delete(message.id);
            syncOthers();
            break;
          case "moves":
            for (const p of message.ps) {
              if (p.id !== myId.current) remotes.current.set(p.id, p);
            }
            break;
          case "online":
            setInfo((prev) => ({ ...prev, online: message.n }));
            break;
        }
      };

      socket.onclose = (event) => {
        socketRef.current = null;
        myId.current = null;
        remotes.current.clear();
        if (disposed) return;
        if (event.code === CLOSE_FULL) {
          setInfo({ status: "full", channel: null, online: 0, others: [] });
          return;
        }
        setInfo({ status: "offline", channel: null, online: 0, others: [] });
        retryTimer = setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
      };
    };

    connect();
    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      socketRef.current?.close();
    };
  }, [name, syncOthers]);

  /** Report my position; throttled to 10/s and skipped when nothing changed. */
  const sendPosition = useCallback((x: number, z: number, h: number, m: number | null) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !myId.current) return;
    const now = performance.now();
    const payload = { x: +x.toFixed(2), z: +z.toFixed(2), h: +h.toFixed(2), m };
    const key = JSON.stringify(payload);
    if (key === lastSent.current.key || now - lastSent.current.at < SEND_INTERVAL_MS) return;
    lastSent.current = { at: now, key };
    socket.send(key);
  }, []);

  return { remotes, info, sendPosition };
}
