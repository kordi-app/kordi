import ky from "ky";
import type { Friendship } from "../model/types";

export function getFriends(): Promise<Friendship[]> {
  return ky.get("/api/friendships").json<Friendship[]>();
}

export function getSentRequests(): Promise<Friendship[]> {
  return ky.get("/api/friendships/sent").json<Friendship[]>();
}

export function getReceivedRequests(): Promise<Friendship[]> {
  return ky.get("/api/friendships/received").json<Friendship[]>();
}
