import { localizedMetadata } from "@/shared/config/i18n/metadata";
import { HomePage } from "@/views/home";

export const generateMetadata = localizedMetadata("home", "description");

export default function Page() {
  return <HomePage />;
}
