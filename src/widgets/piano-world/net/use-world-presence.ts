"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { bffClient, type ApiSchema } from "@/shared/api";
import { WORLD_SOCKET_URL } from "@/shared/config/api";
import type { EmoteId } from "../engine/interactables";
import { PROTOCOL_VERSION } from "../engine/world-contract";
import {
  CLOSE_FULL,
  encodeClientMessage,
  PING_INTERVAL_MS,
  parseServerMessage,
  type BallState,
  type CaveReplyMessage,
  type ClientMessage,
  type CourseRecordMessage,
  type MoveMessage,
  type RemotePlayer,
} from "./protocol";

export type PresenceStatus = "connecting" | "online" | "full" | "offline" | "disabled";

export interface PresenceInfo {
  status: PresenceStatus;
  channel: number | null;
  /** everyone connected, across all channels */
  online: number;
  /** names of the other people in my channel */
  others: { id: string; name: string }[];
  /** people per region, for portal signs */
  regionCounts: Record<string, number>;
}

/** A ball's state from the channel, how long ago (ms) it was true, and whether it was my own message coming back. */
export interface BallNews {
  state: BallState;
  age: number;
  fromMe: boolean;
}

const NO_NEWS: readonly BallNews[] = [];

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
/** What the server tells me that the page acts on (beyond who's where). */
export interface PresenceHandlers {
  /** a jump-course finish the server timed */
  onRecord: (record: CourseRecordMessage) => void;
  /**
   * the star steps are open in my channel for `leftMs` more: `rung` when
   * someone just rang the bell, not when I joined a channel where it already was
   */
  onBell: (leftMs: number, rung: boolean) => void;
  /** the server gave me a reward item (the whale's pet, the cave's necklace): my look now has it on */
  onReward: (item: string) => void;
  /** the server's answer to my claim on the cave's necklace */
  onCaveReply: (reply: CaveReplyMessage) => void;
}

/**
 * @param region joins that region's channels; reconnects when it changes
 * @param signedIn members prove who they are with a one-time ticket, so their course times rank
 */
export function useWorldPresence(name: string, region: string, signedIn: boolean, handlers: PresenceHandlers) {
  const reportRecord = useEffectEvent((record: CourseRecordMessage) => handlers.onRecord(record));
  const reportBell = useEffectEvent((leftMs: number, rung: boolean) => handlers.onBell(leftMs, rung));
  const reportReward = useEffectEvent((item: string) => handlers.onReward(item));
  const reportCaveReply = useEffectEvent((reply: CaveReplyMessage) => handlers.onCaveReply(reply));
  const remotes = useRef(new Map<string, RemotePlayer>());
  /** ball news not yet taken by the scene (see takeBallNews) */
  const ballNews = useRef<BallNews[]>([]);
  const [info, setInfo] = useState<PresenceInfo>({
    status: "connecting",
    channel: null,
    online: 0,
    others: [],
    regionCounts: {},
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
    /** keeps an idle connection (standing still, a quiet tab) from timing out on the server */
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    /**
     * This effect's own socket. Cleanup must close *this* one: socketRef is
     * shared with the next effect run, and a closing socket's events arrive
     * after the next one has already connected.
     */
    let live: WebSocket | null = null;

    const connect = () => {
      const socket = new WebSocket(
        `${WORLD_SOCKET_URL}?region=${encodeURIComponent(region)}&name=${encodeURIComponent(name)}&v=${PROTOCOL_VERSION}`,
      );
      live = socket;
      socketRef.current = socket;
      setInfo((prev) => ({ ...prev, status: "connecting" }));

      socket.onmessage = (event) => {
        // a socket on its way out (region hop, name change) must not touch the new one's state
        if (disposed) return;
        const message = parseServerMessage(event.data as string);
        if (!message) return;
        switch (message.t) {
          case "welcome":
            // A server without region support would mix every region into one
            // room — outside the hub, stay solo rather than show strangers
            if (message.region === undefined && region !== "hall") {
              disposed = true;
              socket.close();
              setInfo({ status: "disabled", channel: null, online: 0, others: [], regionCounts: {} });
              return;
            }
            retryMs = 1_000;
            myId.current = message.id;
            clearInterval(heartbeat);
            heartbeat = setInterval(() => {
              if (socket.readyState === WebSocket.OPEN) socket.send(encodeClientMessage({ t: "ping" }));
            }, PING_INTERVAL_MS);
            remotes.current = new Map(
              message.players.filter((p) => p.id !== message.id).map((p) => [p.id, p]),
            );
            lastSent.current = { at: 0, key: "" }; // announce our position right away
            setInfo({
              status: "online",
              channel: message.ch,
              online: message.online,
              others: [],
              regionCounts: message.regions ?? {},
            });
            syncOthers();
            // this channel's balls, where they are now (anything queued was for the last channel)
            ballNews.current = (message.balls ?? []).map(({ age, ...state }) => ({ state, age, fromMe: false }));
            // always, even 0: the sky I opened elsewhere isn't open in this channel
            if (message.sky !== undefined) reportBell(message.sky, false);
            if (signedIn) {
              // the auth cookie is httpOnly: trade it (via the BFF) for a ticket the socket can carry
              bffClient
                .post("world/ticket")
                .json<ApiSchema<"WorldTicketResponse">>()
                .then(({ ticket }) => {
                  if (!disposed && socket.readyState === WebSocket.OPEN) {
                    socket.send(encodeClientMessage({ t: "auth", ticket }));
                  }
                })
                .catch(() => {
                  // not signed in after all, or the API is down: play on as a guest
                });
            }
            break;
          case "look": {
            const remote = remotes.current.get(message.id);
            if (!remote) break;
            // signed-in members may come with their verified nickname
            const renamed = typeof message.name === "string" && message.name !== remote.name;
            remotes.current.set(message.id, {
              ...remote,
              look: message.look,
              ...(renamed ? { name: message.name } : {}),
            });
            if (renamed) syncOthers();
            break;
          }
          case "record":
            reportRecord(message);
            break;
          case "bell":
            reportBell(message.left, true);
            break;
          case "pet":
          case "item":
            reportReward(message.item);
            break;
          case "cave":
            reportCaveReply(message);
            break;
          case "ball": {
            const { t: _t, by, ...state } = message;
            ballNews.current.push({ state, age: 0, fromMe: by !== undefined && by === myId.current });
            break;
          }
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
            setInfo((prev) => ({
              ...prev,
              online: message.n,
              regionCounts: message.regions ?? prev.regionCounts,
            }));
            break;
        }
      };

      socket.onclose = (event) => {
        // Closed by cleanup: the next effect run owns the shared refs by now.
        // (Clearing them here used to null out the *new* socket, so it was
        // never sent positions and never closed on the next hop — a leaked
        // connection that the server kept counting as a player.)
        clearInterval(heartbeat);
        if (disposed) return;
        live = null;
        socketRef.current = null;
        myId.current = null;
        remotes.current.clear();
        ballNews.current = [];
        if (event.code === CLOSE_FULL) {
          setInfo({ status: "full", channel: null, online: 0, others: [], regionCounts: {} });
          return;
        }
        setInfo({ status: "offline", channel: null, online: 0, others: [], regionCounts: {} });
        retryTimer = setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
      };
    };

    connect();
    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      clearInterval(heartbeat);
      live?.close();
      if (socketRef.current === live) socketRef.current = null;
      myId.current = null;
      remotes.current.clear();
      ballNews.current = [];
    };
  }, [name, region, signedIn, syncOthers]);

  /** Report my position; throttled to 10/s and skipped when nothing changed. */
  const sendPosition = useCallback(
    (x: number, y: number, z: number, h: number, m: number | null, e: EmoteId | null) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !myId.current) return;
    const now = performance.now();
    if (now - lastSent.current.at < SEND_INTERVAL_MS) return; // cheap check first: this runs every frame
    const payload: MoveMessage = { x: +x.toFixed(2), y: +y.toFixed(2), z: +z.toFixed(2), h: +h.toFixed(2), m, e };
    const key = encodeClientMessage(payload);
    if (key === lastSent.current.key || now - lastSent.current.at < SEND_INTERVAL_MS) return;
    lastSent.current = { at: now, key };
    socket.send(key);
    },
    [],
  );

  /** Send on the live socket, once the server has seated me; false if there's none to send on. */
  const send = useCallback((message: ClientMessage) => {
    const socket = socketRef.current;
    if (socket?.readyState !== WebSocket.OPEN || !myId.current) return false;
    socket.send(encodeClientMessage(message));
    return true;
  }, []);

  /** Tell the channel I rang the bell at night. */
  const sendBell = useCallback(() => send({ t: "bell" }), [send]);

  /** Tell the server the whale sang for me (members get their pet from it). */
  const sendWhale = useCallback(() => send({ t: "whale" }), [send]);

  /** The ball news since the last call (the scene calls this every frame). */
  const takeBallNews = useCallback(() => {
    const news = ballNews.current;
    if (news.length === 0) return NO_NEWS;
    ballNews.current = [];
    return news;
  }, []);

  /** Tell the channel I kicked a ball, or where the ball I kicked came to rest. */
  const sendBall = useCallback(
    (ball: BallState) => {
      const r = (n: number) => +n.toFixed(2);
      return send({ t: "ball", i: ball.i, x: r(ball.x), y: r(ball.y), z: r(ball.z), vx: r(ball.vx), vy: r(ball.vy), vz: r(ball.vz) });
    },
    [send],
  );

  /** Tell the server I took the cave's necklace (members get it from that); false while offline. */
  const sendCave = useCallback(() => send({ t: "cave" }), [send]);

  return { remotes, takeBallNews, info, sendPosition, sendBell, sendBall, sendWhale, sendCave };
}
