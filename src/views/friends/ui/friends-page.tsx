import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import type { User } from "@/entities/user";
import { AppHeader } from "@/widgets/app-header";
import { FriendsPanel } from "@/widgets/friends-panel";
import { AddFriendDialog } from "@/features/friendship";

interface FriendsPageProps {
  user: User;
}

export function FriendsPage({ user }: FriendsPageProps) {
  const t = useTranslations("friends");

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader showBack title={t("title")} />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-xl px-lg py-xl">
        <header className="flex flex-col gap-md">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-[36px] font-bold leading-[44px] -tracking-[0.02em] text-foreground">
              {t("title")}
            </h1>
            <AddFriendDialog currentUserId={user.id} />
          </div>
          <div className="relative max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.75}
            />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-lg border border-outline-variant bg-card py-3 pl-10 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </header>

        <FriendsPanel currentUserId={user.id} />
      </main>
    </div>
  );
}
