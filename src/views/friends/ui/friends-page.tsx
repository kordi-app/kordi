import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import type { User } from "@/entities/user";
import { FriendsPanel } from "@/widgets/friends-panel";
import { AddFriendDialog } from "@/features/friendship";
import { SectionHeader } from "@/shared/ui/section-header";

interface FriendsPageProps {
  user: User;
}

export function FriendsPage({ user }: FriendsPageProps) {
  const t = useTranslations("friends");

  return (
    <main className="px-6 py-10 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <SectionHeader as="h1" size="lg">
              {t("title")}
            </SectionHeader>
            <AddFriendDialog currentUserId={user.id} />
          </div>
          <div className="relative max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground opacity-60"
              aria-hidden
            />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-lg border border-border bg-card py-3 pl-10 pr-4 text-sm text-foreground outline-none transition-all placeholder:opacity-60 focus:ring-1 focus:ring-ring"
            />
          </div>
        </header>

        <FriendsPanel currentUserId={user.id} />
      </div>
    </main>
  );
}
