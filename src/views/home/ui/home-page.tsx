import { getTranslations } from "next-intl/server";
import { getMe } from "@/entities/user/server";
import { PianoWorld } from "@/widgets/piano-world";

/** Signed-in visitors walk under their nickname; everyone else is a numbered guest. */
async function resolvePlayerName(guestLabel: string): Promise<string> {
  try {
    return (await getMe()).nickname;
  } catch {
    return `${guestLabel} ${1000 + Math.floor(Math.random() * 9000)}`;
  }
}

/** Home is the walkable keyboard, filling everything below the app header. */
export async function HomePage() {
  const t = await getTranslations("home.world");
  const playerName = await resolvePlayerName(t("guest"));

  return (
    <main className="h-[calc(100svh-3.5rem)] min-h-[420px] w-full">
      <PianoWorld
        playerName={playerName}
        copy={{
          features: {
            springs: t("features.springs"),
            echo: t("features.echo"),
            chords: t("features.chords"),
          },
          melodies: {
            twinkle: t("melodies.twinkle"),
            odeToJoy: t("melodies.odeToJoy"),
            maryLamb: t("melodies.maryLamb"),
          },
          melodyNext: t("melodyNext"),
          melodyHint: t("melodyHint"),
          melodyDone: t("melodyDone"),
          melodyNextSong: t("melodyNextSong"),
          regions: {
            hall: t("regions.hall"),
            neon: t("regions.neon"),
            cathedral: t("regions.cathedral"),
            lounge: t("regions.lounge"),
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
