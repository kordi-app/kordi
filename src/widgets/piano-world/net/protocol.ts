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
 * - .../world/WorldBall.java   — a note ball's state ({@link BallState})
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

/** A note ball's state (WorldBall): sent when it's kicked, and by its kicker when it comes to rest. */
export interface BallState {
  /** which of the region's balls (ballSpawns order) */
  i: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
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
  /** ms the star steps stay open in this channel (0: shut; absent on older servers) */
  sky?: number;
  /** the channel's balls as last kicked or left, `age` ms ago (never-kicked ones are at their spawns) */
  balls?: (BallState & { age: number })[];
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
  /** their verified nickname (signed-in members, once authenticated; absent on older servers) */
  name?: string;
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

/** I earned a pet just now (the server put it on me; my look follows as a "look"). */
export interface PetMessage {
  t: "pet";
  item: string;
}

/** I found a reward accessory just now (the cave's gold necklace; the server put it on me, my look follows as a "look"). */
export interface ItemMessage {
  t: "item";
  item: string;
}

/** Someone in my channel rang the midnight bell (never sent back to the ringer). */
export interface BellMessage {
  t: "bell";
  /** ms the star steps now stay open */
  left: number;
}

/** Someone in my channel kicked a ball, or theirs came to rest (sent to the sender too, so everyone applies them in the server's order). */
export interface BallMessage extends BallState {
  t: "ball";
  /** who sent it (absent from servers that predate the echo) */
  by?: string;
}

export type ServerMessage =
  | WelcomeMessage
  | JoinMessage
  | LeaveMessage
  | MovesMessage
  | LookMessage
  | OnlineMessage
  | RecordMessage
  | BellMessage
  | BallMessage
  | PetMessage
  | ItemMessage;

// ── client → server ──────────────────────────────────────────────────────────

/** My position (WorldMove). Carries no "t": anything that isn't "auth", "bell", "ball", "whale", "cave" or "ping" is a move. */
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

/** I rang the tower bell at night (WorldLobby.ringBell checks I'm beside it). */
export interface RingMessage {
  t: "bell";
}

/** I kicked a ball, or the ball I kicked came to rest (WorldLobby.moveBall checks I'm beside a kicked one). */
export interface KickMessage extends BallState {
  t: "ball";
}

/** The whale sang for me on the dream sea's summit (WorldSocketHandler.adoptWhale checks it). */
export interface WhaleMessage {
  t: "whale";
}

/** I took the necklace from the cave's altar, crowned (WorldSocketHandler.takeNecklace checks it). */
export interface CaveMessage {
  t: "cave";
}

/** Keep-alive while connected (the server drops sockets that stay silent past its idle timeout). */
export interface PingMessage {
  t: "ping";
}

/** How often a connected socket pings (well inside the server's idle timeout). */
export const PING_INTERVAL_MS = 25_000;

export type ClientMessage =
  | MoveMessage
  | AuthMessage
  | RingMessage
  | KickMessage
  | WhaleMessage
  | CaveMessage
  | PingMessage;

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
