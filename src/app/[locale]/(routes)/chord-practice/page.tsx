import { cookies } from "next/headers";
import { AUTH_COOKIES } from "@/shared/config/auth";
import { localizedMetadata } from "@/shared/config/i18n/metadata";
import { ChordPracticeView } from "../client-only-views";

export const generateMetadata = localizedMetadata("chordPractice", "chordPracticeDescription");

export default async function Page() {
  // guests can practise here; only members have a review deck to count
  const cookieStore = await cookies();
  const signedIn = cookieStore.has(AUTH_COOKIES.ACCESS_TOKEN) || cookieStore.has(AUTH_COOKIES.REFRESH_TOKEN);
  return <ChordPracticeView signedIn={signedIn} />;
}
