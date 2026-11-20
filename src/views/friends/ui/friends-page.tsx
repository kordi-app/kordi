import type { User } from "@/entities/user";
import { FriendsPanel } from "@/widgets/friends-panel";

interface FriendsPageProps {
  user: User;
}

export function FriendsPage({ user }: FriendsPageProps) {
  return (
    <main className="px-page-x py-page-y md:px-page-x-wide md:py-page-y-wide">
      <div className="mx-auto w-full max-w-xl">
        <FriendsPanel currentUserId={user.id} />
      </div>
    </main>
  );
}
