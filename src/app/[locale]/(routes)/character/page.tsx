import { localizedMetadata } from "@/shared/config/i18n/metadata";
import { QueryClient } from "@tanstack/react-query";
import { requireUser } from "@/entities/user/server";
import { CharacterPage } from "@/views/character";

export const generateMetadata = localizedMetadata("character");

/** Members only: guests are sent to the login page. */
export default async function Page() {
  await requireUser(new QueryClient());
  return <CharacterPage />;
}
