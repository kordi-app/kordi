import type { Metadata } from "next";
import { QueryClient } from "@tanstack/react-query";
import { requireUser } from "@/entities/user/server";
import { CharacterPage } from "@/views/character";

export const metadata: Metadata = {
  title: "My Kordi | Kordi",
};

/** Members only: guests are sent to the login page. */
export default async function Page() {
  await requireUser(new QueryClient());
  return <CharacterPage />;
}
