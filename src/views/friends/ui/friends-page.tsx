import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import type { User } from "@/entities/user";
import { FriendsPanel } from "@/widgets/friends-panel";
import { AddFriendDialog } from "@/features/friendship";

interface FriendsPageProps {
  user: User;
}

export function FriendsPage({ user }: FriendsPageProps) {
  const t = useTranslations("friends");

  return (
    <main className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-heading text-[28px] font-extrabold uppercase -tracking-[0.02em] text-black">
              {t("title")}
            </h1>
            <AddFriendDialog currentUserId={user.id} />
          </div>
          <div className="relative max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-black opacity-60"
              strokeWidth={1.75}
            />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-lg border border-black bg-white py-3 pl-10 pr-4 text-sm text-black outline-none transition-all placeholder:opacity-60 focus:ring-1 focus:ring-black"
            />
          </div>
        </header>

        <FriendsPanel currentUserId={user.id} />
      </div>
    </main>
  );
}
