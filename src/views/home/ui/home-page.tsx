import { getTranslations } from "next-intl/server";
import { getMe } from "@/entities/user/server";
import { PianoWorld, type PianoWorldCopy } from "@/widgets/piano-world";

/**
 * Signed-in visitors walk under their nickname; guests get a random musical
 * name for the day ("Mellow Fermata"), which they can re-roll in the world.
 */
async function resolvePlayer(adjectives: string[], nouns: string[]) {
  try {
    return { name: (await getMe()).nickname, isGuest: false };
  } catch {
    const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];
    return { name: `${pick(adjectives)} ${pick(nouns)}`, isGuest: true };
  }
}

/** Home is the walkable keyboard, filling everything below the app header. */
export async function HomePage() {
  const t = await getTranslations("home.world");
  const nameAdjectives = t.raw("nameAdjectives") as string[];
  const nameNouns = t.raw("nameNouns") as string[];
  const player = await resolvePlayer(nameAdjectives, nameNouns);

  return (
    <main className="h-[calc(100svh-3.5rem)] min-h-[420px] w-full md:h-svh">
      <PianoWorld
        playerName={player.name}
        isGuest={player.isGuest}
        copy={{
          nameLabel: t("nameLabel"),
          nameReroll: t("nameReroll"),
          nameAdjectives,
          nameNouns,
          emotes: t.raw("emotes") as PianoWorldCopy["emotes"],
          interact: t.raw("interact") as PianoWorldCopy["interact"],
          catReactions: t.raw("catReactions") as string[],
          teacherTips: t.raw("teacherTips") as string[],
          cards: t.raw("cards") as PianoWorldCopy["cards"],
          cardTitle: t("cardTitle"),
          cardPlay: t("cardPlay"),
          close: t("close"),
          wishTitle: t("wishTitle"),
          wishPlaceholder: t("wishPlaceholder"),
          wishNote: t("wishNote"),
          wishSend: t("wishSend"),
          wishSent: t("wishSent"),
          jukeboxStyle: t.raw("jukeboxStyle") as string,
          loungeStyles: t.raw("loungeStyles") as PianoWorldCopy["loungeStyles"],
          warpStones: t.raw("warpStones") as PianoWorldCopy["warpStones"],
          warpTitle: t("warpTitle"),
          warpUse: t("warpUse"),
          warpWoke: t.raw("warpWoke") as string,
          warpHere: t("warpHere"),
          warpAsleep: t("warpAsleep"),
          melodies: {
            twinkle: t("melodies.twinkle"),
            odeToJoy: t("melodies.odeToJoy"),
            maryLamb: t("melodies.maryLamb"),
          },
          melodyNext: t("melodyNext"),
          melodyHint: t("melodyHint"),
          melodyDone: t("melodyDone"),
          melodyNextSong: t("melodyNextSong"),
          courseTitle: t("courseTitle"),
          courseHint: t("courseHint"),
          nightTitle: t("nightTitle"),
          courseRankingTitle: t("courseRankingTitle"),
          courseRankingEmpty: t("courseRankingEmpty"),
          courseRankSaved: t.raw("courseRankSaved") as string,
          courseRankMember: t.raw("courseRankMember") as string,
          courseRankGuest: t.raw("courseRankGuest") as string,
          nightHint: t("nightHint"),
          courseBest: t("courseBest"),
          courseDone: t("courseDone"),
          regions: {
            hall: t("regions.hall"),
            neon: t("regions.neon"),
            cathedral: t("regions.cathedral"),
            lounge: t("regions.lounge"),
            clouds: t("regions.clouds"),
            night: t("regions.night"),
          },
          soundOff: t("soundOff"),
          soundLoading: t("soundLoading"),
          soundOn: t("soundOn"),
          // Raw templates: "{channel}"/"{count}" are filled in on the client
          channel: t.raw("channel") as string,
          online: t.raw("online") as string,
          connecting: t("connecting"),
          full: t("full"),
          offline: t("offline"),
        }}
      />
    </main>
  );
}
