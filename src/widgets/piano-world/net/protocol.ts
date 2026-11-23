import type { Appearance } from "@/entities/character";
import type { CourseId } from "../engine/course-contract";
import type { EmoteId } from "../engine/interactables";

/**
 * The piano world's WebSocket protocol, defined once. Every message is a JSON
 * text frame. Mirrors the server (a separate repo):
 *
 * - kordi server src/main/java/com/kordi_api/world/WorldSocketHandler.java — message envelopes ("t")
 * - .../world/WorldPlayer.java — a player as broadcast ({@link RemotePlayer})
 * - .../world/WorldMove.java   — a position report ({@link MoveMessage})
 * - .../world/WorldLook.java   — a member's look ({@link Appearance})
 * - .../course/dto/CourseResult.java — the "record" payload
 *
 * Field names must match those records exactly: the server (de)serializes them
 * with Jackson by name. Fields marked optional here are always sent by the
 * current server; they stay optional so an older server degrades gracefully.
 */

// ── server → client ──────────────────────────────────────────────────────────

/** A player as the server broadcasts it (WorldPlayer). */
export interface RemotePlayer {
  id: string;
  name: string;
  x: number;
  /** height above the floor; absent from servers that predate it */
  y?: number;
  z: number;
  /** heading (radians) */
  h: number;
  /** MIDI note underfoot, null when off the keys */
  m: number | null;
  /** emote in progress */
  e?: EmoteId | null;
  /** how they've dressed their Kordi (signed-in members only; null = the default look) */
  look?: Appearance | null;
}

/** People per region (WorldLobby.playersPerRegion), for portal signs. */
export type RegionCounts = Record<string, number>;

/** First message on every connection: who I am and who's already here. */
export interface WelcomeMessage {
  t: "welcome";
  id: string;
  /** absent on servers that predate regions */
  region?: string;
  ch: number;
  players: RemotePlayer[];
  online: number;
  regions?: RegionCounts;
}

/** Someone entered my channel. */
export interface JoinMessage {
  t: "join";
  p: RemotePlayer;
}

/** Someone left my channel. */
export interface LeaveMessage {
  t: "leave";
  id: string;
}

/** Latest positions of everyone in my channel who moved (batched every TICK_MS). */
export interface MovesMessage {
  t: "moves";
  ps: RemotePlayer[];
}

/** Someone in my channel changed how their Kordi looks. */
export interface LookMessage {
  t: "look";
  id: string;
  look: Appearance;
}

/** Head counts (every ONLINE_MS, to every socket). */
export interface OnlineMessage {
  t: "online";
  n: number;
  regions?: RegionCounts;
}

/** A jump-course finish, timed by the server from the positions we sent (CourseResult). */
export interface CourseRecordMessage {
  /** the course's region name (Course.region()) */
  course: CourseId;
  /** this run */
  ms: number;
  /** stored best (null for guests) */
  best: number | null;
  /** where this run places all-time (for guests: where it would) */
  rank: number;
  /** made it onto the ranking (signed in and a new best) */
  saved: boolean;
  /** a reward item this finish unlocked (already put on by the server) */
  reward?: string | null;
}

export interface RecordMessage extends CourseRecordMessage {
  t: "record";
}

export type ServerMessage =
  | WelcomeMessage
  | JoinMessage
  | LeaveMessage
  | MovesMessage
  | LookMessage
  | OnlineMessage
  | RecordMessage;

// ── client → server ──────────────────────────────────────────────────────────

/** My position (WorldMove). Carries no "t": anything that isn't "auth" is a move. */
export interface MoveMessage {
  x: number;
  y: number;
  z: number;
  h: number;
  m: number | null;
  e: EmoteId | null;
}

/** Prove I'm a signed-in member with a one-time ticket from POST world/ticket. */
export interface AuthMessage {
  t: "auth";
  ticket: string;
}

export type ClientMessage = MoveMessage | AuthMessage;

// ── connection ───────────────────────────────────────────────────────────────

/** Close code when the world is at capacity (CloseStatus.SERVICE_OVERLOAD, "try again later"). */
export const CLOSE_FULL = 1013;

/** Parse a server frame; null for anything that isn't JSON. */
export function parseServerMessage(data: string): ServerMessage | null {
  try {
    return JSON.parse(data) as ServerMessage;
  } catch {
    return null;
  }
}

export const encodeClientMessage = (message: ClientMessage): string => JSON.stringify(message);
