import { useTranslations } from "next-intl";
import type { User } from "@/entities/user";
import { FriendsPanel } from "@/widgets/friends-panel";
import { AddFriendDialog } from "@/features/friendship";

interface FriendsPageProps {
  user: User;
}

export function FriendsPage({ user }: FriendsPageProps) {
  const t = useTranslations("friends");

  return (
    <main className="px-5 py-10 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <AddFriendDialog currentUserId={user.id} />
        </header>
        <FriendsPanel currentUserId={user.id} />
      </div>
    </main>
  );
}
