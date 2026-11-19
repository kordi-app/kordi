/** The signed-in user's own profile (includes private fields). */
export interface User {
  id: number;
  email: string;
  nickname: string;
  profileImageUrl: string | null;
  oAuthProvider: "GOOGLE";
}

/** Another user's public profile, as returned by user search. */
export type PublicUser = Pick<User, "id" | "nickname" | "profileImageUrl">;
