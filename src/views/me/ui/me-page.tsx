import { useTranslations } from "next-intl";
import { User as UserIcon, Lock, CircleCheck } from "lucide-react";
import type { User } from "@/entities/user";
import type { ScoreRecord } from "@/entities/quiz";
import { ProfileForm } from "@/features/profile";
import { LogoutButton } from "@/features/auth";
import { MyScoresPanel } from "@/widgets/my-scores";
import { Avatar, AvatarImage, AvatarFallback } from "@/shared/ui/avatar";
import { Separator } from "@/shared/ui/separator";

interface MePageProps {
  user: User;
  scores: ScoreRecord[];
}

export function MePage({ user, scores }: MePageProps) {
  const t = useTranslations("me");
  const tCommon = useTranslations("common");

  return (
    <main className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="mb-6 font-heading text-[28px] font-extrabold uppercase -tracking-[0.02em] text-black">
          {t("title")}
        </h1>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
          {/* Left Column */}
          <div className="flex flex-col gap-6">
            {/* Avatar Card */}
            <div className="flex flex-col items-center rounded-lg border border-black bg-white px-6 py-8">
              <Avatar size="lg" className="mb-4 size-24 ring-1 ring-black">
                <AvatarImage
                  src={user.profileImageUrl ?? undefined}
                  alt={user.nickname}
                />
                <AvatarFallback className="bg-black text-3xl font-black text-white">
                  {user.nickname.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="font-heading text-lg font-bold text-black">
                {user.nickname}
              </h2>
              <span className="mt-2 rounded-full border border-black bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-black">
                {t("userId")}: #{user.id}
              </span>
            </div>

            {/* Logout */}
            <div className="rounded-lg border border-black bg-white px-6 py-4">
              <LogoutButton label={tCommon("logout")} className="w-full" />
            </div>
          </div>

          {/* Right Column - Identity Details */}
          <div className="rounded-lg border border-black bg-white px-6 py-8">
            <div className="mb-6 flex items-center gap-2">
              <UserIcon className="size-5 text-black" strokeWidth={1.75} />
              <h2 className="font-heading text-lg font-bold uppercase text-black">
                {t("identityDetails")}
              </h2>
            </div>

            <ProfileForm currentNickname={user.nickname} />

            <Separator className="my-6 bg-black" />

            {/* Primary Email */}
            <div className="mb-6">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-black">
                {t("primaryEmail")}
              </p>
              <div className="flex items-center justify-between rounded-lg border border-black bg-white px-4 py-3">
                <span className="text-sm text-black">{user.email}</span>
                <Lock className="size-4 opacity-60" strokeWidth={1.75} />
              </div>
            </div>

            {/* OAuth Provider */}
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-black">
                {t("oauthProvider")}
              </p>
              <div className="flex items-center justify-between rounded-lg border border-black bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                  <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span className="text-sm font-bold text-black">
                    {user.oAuthProvider}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-black bg-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                  <CircleCheck className="size-3" strokeWidth={2} />
                  {t("connected")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quiz Scores */}
        <div className="mt-6">
          <MyScoresPanel scores={scores} />
        </div>
      </div>
    </main>
  );
}
