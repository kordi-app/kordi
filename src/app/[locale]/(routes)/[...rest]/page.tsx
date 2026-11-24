import { notFound } from "next/navigation";
import { localizedMetadata } from "@/shared/config/i18n/metadata";

export const generateMetadata = localizedMetadata("notFound");

/** Any unknown path under a locale: our 404, inside the app shell and in the visitor's language. */
export default function CatchAll() {
  notFound();
}
