import { bffClient, type ApiSchema } from "@/shared/api";
import type { Friendship } from "@/entities/friendship";

export function sendFriendRequest(receiverId: number): Promise<Friendship> {
  return bffClient
    .post("friendships", { json: { receiverId } satisfies ApiSchema<"FriendshipRequest"> })
    .json<Friendship>();
}

export function acceptFriendRequest(id: number): Promise<Friendship> {
  return bffClient.patch(`friendships/${id}/accept`).json<Friendship>();
}

export function rejectFriendRequest(id: number): Promise<Friendship> {
  return bffClient.patch(`friendships/${id}/reject`).json<Friendship>();
}

export function cancelFriendRequest(id: number): Promise<Friendship> {
  return bffClient.patch(`friendships/${id}/cancel`).json<Friendship>();
}

export async function deleteFriendship(id: number): Promise<void> {
  await bffClient.delete(`friendships/${id}`);
}
